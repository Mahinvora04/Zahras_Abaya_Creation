import os
import re
import logging
from datetime import datetime, timedelta
from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token as google_id_token
from fastapi import FastAPI, HTTPException, Depends, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
from jose import jwt, JWTError
from dotenv import load_dotenv
from typing import List, Optional
from bson import ObjectId  # Added for ObjectId handling
from uuid import uuid4
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

# 1. Load Environment & Setup
load_dotenv()
app = FastAPI(title="Zahra's Abaya API")

@app.on_event("startup")
async def ensure_google_subject_index():
    await db.users.create_index(
        "google_sub",
        unique=True,
        partialFilterExpression={"google_sub": {"$type": "string"}},
    )

# CORS
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,  # ✅ MUST be True for cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Database Setup
client = AsyncIOMotorClient(os.getenv("MONGO_URI"))
db = client.get_database("zahras_abaya")

# Security Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("JWT_ALGORITHM")

# ==========================================
# HELPER: Serialize MongoDB docs to JSON-safe dicts
# ==========================================
def serialize_doc(doc: dict) -> dict:
    """Recursively converts ObjectId and datetime to strings."""
    if not doc:
        return None
    result = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [serialize_doc(item) if isinstance(item, dict) else str(item) if isinstance(item, ObjectId) else item for item in value]
        else:
            result[key] = value
    return result

def build_product_doc(req: "ProductReq", existing: Optional[dict] = None) -> dict:
    """Build a product with shared identity fields and variant-owned details."""
    fields = req.model_dump(exclude_unset=True)
    if fields.get("variants") is not None:
        variants = fields["variants"]
    elif existing and existing.get("variants"):
        variants = [dict(variant) for variant in existing["variants"]]
        default_id = existing.get("defaultVariantId")
        default_variant = next((v for v in variants if v.get("variant_id") == default_id), variants[0])
        for field in ("description", "price", "originalPrice", "images", "color", "colorHex", "size", "sku", "isAvailable"):
            if field in fields and fields[field] is not None:
                default_variant[field] = fields[field]
    else:
        variants = [{
            "variant_id": str(uuid4()),
            "sku": fields.get("sku"),
            "size": fields.get("size") or "One Size",
            "color": fields.get("color") or "Default",
            "colorHex": fields.get("colorHex"),
            "description": fields.get("description", ""),
            "price": fields.get("price", 0),
            "originalPrice": fields.get("originalPrice"),
            "images": fields.get("images", []),
            "isAvailable": fields.get("isAvailable", True),
        }]

    for variant in variants:
        variant.setdefault("variant_id", str(uuid4()))
        variant.setdefault("isAvailable", True)
        variant.pop("stock", None)
        variant.pop("discount", None)
    if not variants:
        raise HTTPException(status_code=400, detail="A product must have at least one variant")

    product_doc = dict(existing or {})
    product_doc.pop("_id", None)
    for field in ("description", "price", "originalPrice", "images", "stock", "discount", "variantOptions"):
        product_doc.pop(field, None)
    product_doc.update({
        "name": fields.get("name", product_doc.get("name")),
        "category": fields.get("category", product_doc.get("category")),
        "featured": fields.get("featured", product_doc.get("featured", False)),
        "variants": variants,
        "defaultVariantId": variants[0]["variant_id"],
    })
    return product_doc

def serialize_user(user: dict) -> dict:
    """Serialize a user without returning credentials or internal identity keys."""
    result = serialize_doc(user)
    if result:
        result.pop("password", None)
        result.pop("google_sub", None)
    return result

# 2. Minimal Request Models
class RegisterReq(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class GoogleLoginReq(BaseModel):
    credential: str

class ProductReq(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    price: Optional[float] = None
    originalPrice: Optional[float] = None
    images: Optional[List[str]] = None
    featured: bool = False
    color: Optional[str] = None
    colorHex: Optional[str] = None
    size: Optional[str] = None
    sku: Optional[str] = None
    isAvailable: Optional[bool] = None
    variants: Optional[List[dict]] = None

class ProfileUpdateReq(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class AddressReq(BaseModel):
    label: str = "Home" # e.g., Home, Office, Parents
    address: str
    pincode: str
    city: str
    state: str
    country: str = "India"
    is_default: bool = False

class AddressUpdateReq(BaseModel):
    label: Optional[str] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    is_default: Optional[bool] = None
    
class CartItem(BaseModel):
    product_id: str
    quantity: int = 1
    selectedVariant: Optional[dict] = None
    variant_id: Optional[str] = None

class Cart(BaseModel):
    user_id: str
    items: List[CartItem] = []
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
class UpdateCartItemReq(BaseModel):
    quantity: Optional[int] = None
    selectedVariant: Optional[dict] = None
    variant_id: Optional[str] = None
    
# 3. Helper Functions
def create_token(user_id: str):
    expires = datetime.utcnow() + timedelta(days=int(os.getenv("JWT_EXPIRES_IN_DAYS", 7)))
    return jwt.encode({"sub": user_id, "exp": expires}, SECRET_KEY, algorithm=ALGORITHM)

def normalize_indian_phone(value: str):
    """Normalize an optional Indian mobile number for profile/contact use."""
    value = value.strip()
    compact = "".join(char for char in value if char not in " ()-.")
    if compact.startswith("00"):
        compact = "+" + compact[2:]

    if compact.startswith("+"):
        if not compact.startswith("+91"):
            raise HTTPException(status_code=400, detail="Use an Indian mobile number")
        digits = compact[3:]
    elif len(compact) == 12 and compact.startswith("91"):
        digits = compact[2:]
    else:
        digits = compact

    if (
        len(digits) != 10
        or not digits.isascii()
        or not digits.isdigit()
        or digits[0] not in "6789"
    ):
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian mobile number")
    return "+91" + digits

def set_cookie(response: Response, token: str):
    # Force secure=False for localhost development
    is_prod = os.getenv("ENVIRONMENT") == "production"
    
    response.set_cookie(
        key="token", 
        value=token, 
        httponly=True,
        secure=is_prod,          # ✅ False on localhost, True on production
        samesite="lax",          # ✅ 'lax' is required for localhost cookies
        max_age=7 * 24 * 60 * 60,
        path="/"                 # ✅ Ensures cookie is sent to all routes
    )

async def get_current_user(request: Request):
    token = request.cookies.get("token")
    
    print(f" DEBUG: Received token in cookie: {'YES' if token else 'NO'}")
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authorized")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # ❌ OLD BUG: Querying with a string
        # user = await db.users.find_one({"_id": payload.get("sub")})
        
        # ✅ NEW FIX: Convert string back to ObjectId
        from bson import ObjectId
        user_id = payload.get("sub")
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return serialize_user(user)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        # Catch invalid ObjectId format
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ==========================================
# 4. API ENDPOINTS
# ==========================================

# --- AUTH ---
@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
async def register(req: RegisterReq, response: Response):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be 6+ chars")

    email = str(req.email).lower()
    email_query = {"$regex": f"^{re.escape(email)}$", "$options": "i"}
    if await db.users.find_one({"email": email_query}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    phone = normalize_indian_phone(req.phone) if req.phone and req.phone.strip() else None
    
    hashed_pw = pwd_context.hash(req.password)
    user_doc = {
        "name": req.name,
        "email": email,
        "phone": phone,
        "phone_verified": False,
        "password": hashed_pw,
        "role": "user",
    }
    result = await db.users.insert_one(user_doc)
    
    token = create_token(str(result.inserted_id))
    set_cookie(response, token)
    
    return {"success": True, "user": {"_id": str(result.inserted_id), "name": req.name, "email": email, "phone": phone, "phone_verified": False, "role": "user"}}

@app.post("/api/auth/login")
async def login(req: LoginReq, response: Response):
    email = str(req.email).lower()
    email_query = {"$regex": f"^{re.escape(email)}$", "$options": "i"}
    user = await db.users.find_one({"email": email_query})
    if not user or not user.get("password") or not pwd_context.verify(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(str(user["_id"]))
    set_cookie(response, token)
    
    return {"success": True, "user": serialize_user(user)}

@app.post("/api/auth/google")
async def google_login(req: GoogleLoginReq, response: Response):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")

    try:
        claims = await run_in_threadpool(
            google_id_token.verify_oauth2_token,
            req.credential,
            GoogleRequest(),
            audience=client_id,
            clock_skew_in_seconds=30,
        )
    except ValueError as exc:
        logger.warning("Google ID token verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid Google sign-in credential")
    except GoogleAuthError:
        raise HTTPException(status_code=503, detail="Could not verify Google sign-in")

    google_sub = claims.get("sub")
    email = claims.get("email", "").strip().lower()
    if not google_sub or not email or claims.get("email_verified") is not True:
        raise HTTPException(status_code=401, detail="Google did not provide a verified email address")

    user = await db.users.find_one({"google_sub": google_sub})
    if not user:
        email_query = {"$regex": f"^{re.escape(email)}$", "$options": "i"}
        user = await db.users.find_one({"email": email_query})

        if user:
            linked_sub = user.get("google_sub")
            if linked_sub and linked_sub != google_sub:
                raise HTTPException(status_code=409, detail="This account is linked to a different Google account")
            if not linked_sub:
                link_result = await db.users.update_one(
                    {"_id": user["_id"], "google_sub": {"$in": [None, google_sub]}},
                    {"$set": {"google_sub": google_sub}},
                )
                if link_result.matched_count == 0:
                    raise HTTPException(status_code=409, detail="This account is linked to a different Google account")
                user["google_sub"] = google_sub
        else:
            user_doc = {
                "name": claims.get("name") or email.split("@", 1)[0],
                "email": email,
                "phone": None,
                "phone_verified": False,
                "google_sub": google_sub,
                "role": "user",
            }
            result = await db.users.insert_one(user_doc)
            user_doc["_id"] = result.inserted_id
            user = user_doc

    token = create_token(str(user["_id"]))
    set_cookie(response, token)
    return {"success": True, "user": serialize_user(user)}

@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"success": True, "user": current_user}

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="token")
    return {"success": True, "message": "Logged out"}

# --- PRODUCTS (Public) ---
@app.get("/api/products")
async def get_products(
    category: Optional[str] = None, 
    search: Optional[str] = None, 
    sort: str = "newest",
    sizes: Optional[str] = None,
    colors: Optional[str] = None,
    minPrice: Optional[float] = None,
    maxPrice: Optional[float] = None,
    page: int = 1,       # ✅ Added
    limit: int = 20      # ✅ Added (20 per page)
):
    base_query = {}
    
    # 1. Build base query (Category & Search)
    if category and category != "All":
        category_doc = await db.categories.find_one({"name": {"$regex": category, "$options": "i"}})
        if category_doc:
            base_query["category"] = category_doc["_id"]
        else:
            return {
                "success": True, "products": [], "totalCount": 0, "totalPages": 1, "currentPage": 1,
                "availableFilters": {"minPrice": 0, "maxPrice": 10000, "sizes": [], "colors": []}
            }
    
    if search and search.strip():
        base_query["name"] = {"$regex": search, "$options": "i"}
    
    # 2. Get Available Filters (based on base query)
    price_agg = await db.products.aggregate([
        {"$match": base_query},
        {"$unwind": "$variants"},
        {"$group": {"_id": None, "minPrice": {"$min": "$variants.price"}, "maxPrice": {"$max": "$variants.price"}}}
    ]).to_list(length=1)
    
    min_p = price_agg[0]["minPrice"] if price_agg and price_agg[0].get("minPrice") is not None else 0
    max_p = price_agg[0]["maxPrice"] if price_agg and price_agg[0].get("maxPrice") is not None else 10000

    variant_agg = await db.products.aggregate([
        {"$match": base_query},
        {"$unwind": {"path": "$variants", "preserveNullAndEmptyArrays": True}},
        {"$group": {"_id": None, "sizes": {"$addToSet": "$variants.size"}, "colors": {"$addToSet": "$variants.color"}}}
    ]).to_list(length=1)
    
    available_filters = {
        "minPrice": min_p,
        "maxPrice": max_p,
        "sizes": sorted([str(s) for s in variant_agg[0].get("sizes", []) if s]) if variant_agg else [],
        "colors": sorted([str(c) for c in variant_agg[0].get("colors", []) if c]) if variant_agg else []
    }

    # 3. Apply specific filters
    final_query = base_query.copy()
    variant_conditions = {}
    if minPrice is not None:
        variant_conditions.setdefault("price", {})["$gte"] = minPrice
    if maxPrice is not None:
        variant_conditions.setdefault("price", {})["$lte"] = maxPrice
    if sizes and sizes.strip():
        variant_conditions["size"] = {"$in": [s.strip() for s in sizes.split(",")]}
    if colors and colors.strip():
        variant_conditions["color"] = {"$in": [c.strip() for c in colors.split(",")]}
    if variant_conditions:
        final_query["variants"] = {"$elemMatch": variant_conditions}
    
    # 4. Sorting
    sort_order = -1 if sort in ["newest", "price-high", "rating"] else 1
    sort_field = "variants.price" if "price" in sort else ("rating" if sort == "rating" else "_id")
    
    # 5. Pagination Logic
    total_count = await db.products.count_documents(final_query)
    total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1
    skip = (page - 1) * limit
    
    cursor = db.products.find(final_query).sort(sort_field, sort_order).skip(skip).limit(limit)
    products = await cursor.to_list(length=limit)
    
    return {
        "success": True, 
        "products": [serialize_doc(p) for p in products],
        "totalCount": total_count,
        "totalPages": total_pages,
        "currentPage": page,
        "availableFilters": available_filters
    }
       
@app.get("/api/products/featured")
async def get_featured():
    cursor = db.products.find({"featured": True}).limit(5)
    products = await cursor.to_list(length=5)
    return {"success": True, "products": [serialize_doc(p) for p in products]}


@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    try:
        # ✅ Convert string to ObjectId before querying
        product = await db.products.find_one({"_id": ObjectId(product_id)})
    except:
        # Invalid ObjectId format
        raise HTTPException(status_code=404, detail="Product not found")
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"success": True, "product": serialize_doc(product)}

# --- ADMIN (Protected) ---
@app.post("/api/admin/products")
async def create_product(req: ProductReq, admin: dict = Depends(get_admin_user)):
    product_doc = build_product_doc(req)
    result = await db.products.insert_one(product_doc)
    product_doc["_id"] = str(result.inserted_id)
    return {"success": True, "product": product_doc}

@app.put("/api/admin/products/{product_id}")
async def update_product(product_id: str, req: ProductReq, admin: dict = Depends(get_admin_user)):
    try:
        object_id = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = await db.products.find_one({"_id": object_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    product_doc = build_product_doc(req, existing)
    await db.products.update_one({"_id": object_id}, {"$set": product_doc})
    updated = await db.products.find_one({"_id": object_id})
    return {"success": True, "product": serialize_doc(updated)}

@app.delete("/api/admin/products/{product_id}")
async def delete_product(product_id: str, admin: dict = Depends(get_admin_user)):
    await db.products.delete_one({"_id": product_id})
    return {"success": True, "message": "Product deleted"}

# --- CONTENT (Homepage) ---
@app.get("/api/content/homepage")
async def get_homepage():
    slides = await db.slides.find().sort("order", 1).to_list(length=10)
    categories = await db.categories.find({"isActive": True}).sort("order", 1).to_list(length=10)
    features = await db.features.find().sort("order", 1).to_list(length=10)
    
    first_feature = features[0] if features else None
    last_feature = features[-1] if features else None

    return {
        "success": True,
        "data": {
            "slides": [serialize_doc(s) for s in slides],
            "categories": [serialize_doc(c) for c in categories],
            "features": [serialize_doc(f) for f in features],
            "first_feature": serialize_doc(first_feature),
            "last_feature": serialize_doc(last_feature)
        }
    }
    
# ==========================================
# USER PROFILE & ADDRESSES
# ==========================================

@app.put("/api/users/me")
async def update_profile(req: ProfileUpdateReq, current_user: dict = Depends(get_current_user)):
    update_data = req.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided for update")

    if update_data.get("phone"):
        update_data["phone"] = normalize_indian_phone(update_data["phone"])
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": update_data}
    )
    updated_user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    return {"success": True, "user": serialize_user(updated_user)}


@app.post("/api/users/me/addresses")
async def add_address(req: AddressReq, current_user: dict = Depends(get_current_user)):
    user_id = ObjectId(current_user["_id"])
    new_address = req.model_dump()
    new_address["_id"] = ObjectId() # Give the subdocument its own ID
    
    user = await db.users.find_one({"_id": user_id})
    
    # If it's their very first address, force it to be default
    if not user.get("addresses"):
        new_address["is_default"] = True
    elif new_address["is_default"]:
        # If they explicitly set this new one as default, unset the old default
        await db.users.update_one(
            {"_id": user_id, "addresses.is_default": True},
            {"$set": {"addresses.$.is_default": False}}
        )
        
    await db.users.update_one(
        {"_id": user_id},
        {"$push": {"addresses": new_address}}
    )
    updated_user = await db.users.find_one({"_id": user_id})
    return {"success": True, "user": serialize_user(updated_user)}


@app.put("/api/users/me/addresses/{address_id}")
async def update_address(address_id: str, req: AddressUpdateReq, current_user: dict = Depends(get_current_user)):
    user_id = ObjectId(current_user["_id"])
    update_data = req.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided")
        
    # If setting as default, unset others first
    if update_data.get("is_default") is True:
        await db.users.update_one(
            {"_id": user_id, "addresses.is_default": True},
            {"$set": {"addresses.$.is_default": False}}
        )
        
    # Build the $set query for the specific subdocument using the positional operator ($)
    set_query = {f"addresses.$.{key}": value for key, value in update_data.items()}
    
    result = await db.users.update_one(
        {"_id": user_id, "addresses._id": ObjectId(address_id)},
        {"$set": set_query}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
        
    updated_user = await db.users.find_one({"_id": user_id})
    return {"success": True, "user": serialize_user(updated_user)}


@app.delete("/api/users/me/addresses/{address_id}")
async def delete_address(address_id: str, current_user: dict = Depends(get_current_user)):
    user_id = ObjectId(current_user["_id"])
    
    # Find user to check if the deleted address was the default one
    user = await db.users.find_one({"_id": user_id})
    addr_to_delete = next((a for a in user.get("addresses", []) if str(a["_id"]) == address_id), None)
    
    if not addr_to_delete:
        raise HTTPException(status_code=404, detail="Address not found")
        
    # Remove the address from the array
    await db.users.update_one(
        {"_id": user_id},
        {"$pull": {"addresses": {"_id": ObjectId(address_id)}}}
    )
    
    # If we deleted the default address, make the first remaining address the new default
    if addr_to_delete.get("is_default"):
        updated_user = await db.users.find_one({"_id": user_id})
        if updated_user.get("addresses"):
            await db.users.update_one(
                {"_id": user_id},
                {"$set": {"addresses.0.is_default": True}}
            )
            
    final_user = await db.users.find_one({"_id": user_id})
    return {"success": True, "user": serialize_user(final_user)}

# ==========================================
# CART (Protected)
# ==========================================

@app.get("/api/cart")
async def get_cart(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    
    # Find or create cart for user
    cart = await db.carts.find_one({"user_id": ObjectId(user_id)})
    
    if not cart:
        # Create new cart and update user reference
        cart_doc = {
            "user_id": ObjectId(user_id),
            "items": [],
            "updated_at": datetime.utcnow()
        }
        result = await db.carts.insert_one(cart_doc)
        
        # Update user with cart reference
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"cart_id": str(result.inserted_id)}}
        )
        
        cart = await db.carts.find_one({"_id": result.inserted_id})
    
    # Populate product details for each item
    populated_items = []
    for item in cart.get("items", []):
        product = await db.products.find_one({"_id": ObjectId(item["product_id"])})
        if product:
            populated_items.append({
                **item,
                "product": serialize_doc(product)
            })
    
    # Handle datetime serialization safely
    updated_at = cart.get("updated_at")
    if isinstance(updated_at, datetime):
        updated_at = updated_at.isoformat()
    
    return {
        "success": True,
        "cart": {
            "_id": str(cart["_id"]),
            "items": populated_items,
            "updated_at": updated_at
        }
    }

@app.post("/api/cart/items")
async def add_to_cart(
    cart_item: CartItem,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    product_id = cart_item.product_id
    
    # Verify product exists
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    variant_id = cart_item.variant_id or (cart_item.selectedVariant or {}).get("variant_id")
    if product.get("variants"):
        selected = next((v for v in product["variants"] if variant_id and v.get("variant_id") == variant_id), None)
        if selected is None and cart_item.selectedVariant:
            selected = next((v for v in product["variants"] if
                v.get("color") == cart_item.selectedVariant.get("color") and
                v.get("size") == cart_item.selectedVariant.get("size")), None)
        if selected is None:
            raise HTTPException(status_code=400, detail="A valid product variant is required")
        if not selected.get("isAvailable", True):
            raise HTTPException(status_code=409, detail="This variant is unavailable")
        variant_id = selected["variant_id"]
        cart_item.selectedVariant = {**(cart_item.selectedVariant or {}), **selected}
    elif variant_id:
        raise HTTPException(status_code=400, detail="This product has no variants")
    cart_item.variant_id = variant_id
    
    # Find or create cart
    cart = await db.carts.find_one({"user_id": ObjectId(user_id)})
    
    if not cart:
        cart_doc = {
            "user_id": ObjectId(user_id),
            "items": [cart_item.model_dump()],
            "updated_at": datetime.utcnow()
        }
        result = await db.carts.insert_one(cart_doc)
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"cart_id": str(result.inserted_id)}}
        )
        return {"success": True, "message": "Item added to cart"}
    
    # ✅ FIX: Build a precise match condition for the specific variant
    match_condition = {"product_id": product_id}
    if cart_item.selectedVariant:
        # Use dictionary .get() to safely access keys instead of dot notation
        match_condition["selectedVariant.color"] = cart_item.selectedVariant.get("color")
        match_condition["selectedVariant.size"] = cart_item.selectedVariant.get("size")
    else:
        match_condition["selectedVariant"] = None
        
    # Check if this EXACT variant combination already exists in the cart
    existing_item = next((item for item in cart.get("items", [])
        if item.get("product_id") == product_id and item.get("variant_id") == variant_id), None)
    
    # We do a manual check in Python to be 100% safe with nested dicts
    if existing_item:
        # Increment quantity of the matching variant
        await db.carts.update_one(
            {"_id": cart["_id"], "items": {"$elemMatch": {"product_id": product_id, "variant_id": variant_id}}},
            {
                "$inc": {"items.$.quantity": cart_item.quantity},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    else:
        # ✅ Add as a brand new, separate line item
        await db.carts.update_one(
            {"_id": cart["_id"]},
            {
                "$push": {"items": cart_item.model_dump()},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    
    return {"success": True, "message": "Item added to cart"}

@app.put("/api/cart/items/{product_id}")
async def update_cart_item(
    product_id: str,
    req: UpdateCartItemReq,
    variant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    cart = await db.carts.find_one({"user_id": ObjectId(user_id)})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    # If quantity is 0 or less, remove the item
    if req.quantity is not None and req.quantity <= 0:
        await db.carts.update_one(
            {"_id": cart["_id"]},
            {"$pull": {"items": {"product_id": product_id, "variant_id": variant_id}}, "$set": {"updated_at": datetime.utcnow()}}
        )
        return {"success": True, "message": "Item removed"}
    
    # Build dynamic update document
    update_doc = {}
    if req.quantity is not None:
        update_doc["items.$.quantity"] = req.quantity
    if req.selectedVariant is not None:
        update_doc["items.$.selectedVariant"] = req.selectedVariant
        update_doc["items.$.variant_id"] = req.variant_id or req.selectedVariant.get("variant_id")
        
    if update_doc:
        update_doc["updated_at"] = datetime.utcnow()
        await db.carts.update_one(
            {"_id": cart["_id"], "items": {"$elemMatch": {"product_id": product_id, "variant_id": variant_id}}},
            {"$set": update_doc}
        )
        
    return {"success": True, "message": "Cart updated"}

@app.delete("/api/cart/items/{product_id}")
async def remove_from_cart(
    product_id: str,
    variant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    
    cart = await db.carts.find_one({"user_id": ObjectId(user_id)})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    await db.carts.update_one(
        {"_id": cart["_id"]},
        {
            "$pull": {"items": {"product_id": product_id, "variant_id": variant_id}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"success": True, "message": "Item removed from cart"}

@app.delete("/api/cart")
async def clear_cart(
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    
    await db.carts.update_one(
        {"user_id": ObjectId(user_id)},
        {
            "$set": {"items": [], "updated_at": datetime.utcnow()}
        }
    )
    
    return {"success": True, "message": "Cart cleared"}
