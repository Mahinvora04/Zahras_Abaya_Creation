import os
import re
import unicodedata
import logging
import hmac
from pathlib import Path
from datetime import datetime, timedelta
from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token as google_id_token
from fastapi import FastAPI, HTTPException, Depends, Request, Response, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

@app.on_event("startup")
async def ensure_google_subject_index():
    await db.users.create_index(
        "google_sub",
        unique=True,
        partialFilterExpression={"google_sub": {"$type": "string"}},
    )
    await db.product_reviews.create_index("product_id")
    used_slugs = set()
    async for product in db.products.find({}, {"name": 1, "slug": 1}).sort("_id", 1):
        base_slug = slugify_product_name(product.get("name", ""))
        if not base_slug:
            continue
        slug = base_slug
        suffix = 2
        while slug in used_slugs:
            slug = f"{base_slug}-{suffix}"
            suffix += 1
        used_slugs.add(slug)
        if product.get("slug") != slug:
            await db.products.update_one({"_id": product["_id"]}, {"$set": {"slug": slug}})
    await db.products.create_index("slug", unique=True, sparse=True)

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
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
    product_name = fields.get("name", product_doc.get("name"))
    for variant in variants:
        variant["sku"] = build_variant_sku(product_name, variant.get("color"), variant.get("size"))
    product_doc.update({
        "name": product_name,
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

def slugify_product_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    normalized = normalized.encode("ascii", "ignore").decode("ascii").lower()
    normalized = normalized.replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")

def build_variant_sku(product_name: str, color: Optional[str], size: Optional[str]) -> str:
    """Create a consistent SKU from product, color, and size names."""
    parts = [slugify_product_name(str(value)).upper() for value in (product_name, color, size) if value]
    return "-".join(parts)

def resolve_upload_image_extension(filename: str, content_type: Optional[str], content: bytes) -> Optional[str]:
    """Prefer the file signature, with the browser's image MIME type as a safe fallback."""
    signatures = (
        (b"\xff\xd8\xff", ".jpg"),
        (b"\x89PNG\r\n\x1a\n", ".png"),
    )
    for signature, extension in signatures:
        if content.startswith(signature):
            return extension
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return ".webp"

    # Some browser and image-editor exports wrap or normalize image bytes in a way
    # that does not preserve a simple header check. These are admin-only uploads;
    # keep the extension restricted to the image MIME types accepted by the UI.
    mime_extensions = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    if content_type in mime_extensions:
        return mime_extensions[content_type]
    suffix = Path(filename or "").suffix.lower()
    return suffix if suffix in {".jpg", ".jpeg", ".png", ".webp"} and content_type and content_type.startswith("image/") else None

async def get_unique_product_slug(name: str, exclude_id: Optional[ObjectId] = None) -> str:
    base_slug = slugify_product_name(name)
    if not base_slug:
        raise HTTPException(status_code=400, detail="Product name must contain letters or numbers")
    candidate = base_slug
    suffix = 2
    query = {"slug": candidate}
    if exclude_id is not None:
        query["_id"] = {"$ne": exclude_id}
    while await db.products.find_one(query, {"_id": 1}):
        candidate = f"{base_slug}-{suffix}"
        suffix += 1
        query["slug"] = candidate
    return candidate

# 2. Minimal Request Models
class RegisterReq(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class AdminLoginReq(BaseModel):
    email: EmailStr
    password: str

class OrderStatusReq(BaseModel):
    status: str
    payment_status: Optional[str] = None

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

class CategoryReq(BaseModel):
    name: str = Field(min_length=1, max_length=60)

class CategoryImageReq(BaseModel):
    image: str = Field(min_length=1)

class SlideReq(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    image: str = Field(min_length=1)
    tagline: str = ""
    subtitle: str = ""
    link: str = "/products"
    cta: str = "Shop Now"
    order: int = 0

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

class CreateOrderReq(BaseModel):
    address_id: str

class OrderReviewReq(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    rating: int = Field(ge=1, le=5)
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=2000)
    
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

@app.post("/api/admin/login")
async def admin_login(req: AdminLoginReq, response: Response):
    admin_email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    if not admin_email or not admin_password:
        raise HTTPException(status_code=503, detail="Admin credentials are not configured on the server")
    if not hmac.compare_digest(str(req.email).lower(), admin_email) or not hmac.compare_digest(req.password, admin_password):
        raise HTTPException(status_code=401, detail="Invalid admin email or password")
    user = await db.users.find_one({"email": admin_email})
    if user and user.get("role") not in (None, "admin"):
        raise HTTPException(status_code=409, detail="Admin email is already assigned to a customer account")
    if not user:
        result = await db.users.insert_one({"email": admin_email, "name": "Store Admin", "role": "admin"})
        user = await db.users.find_one({"_id": result.inserted_id})
    elif user.get("role") != "admin":
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"role": "admin"}})
        user["role"] = "admin"
    set_cookie(response, create_token(str(user["_id"])))
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
    base_query = {"isActive": {"$ne": False}}
    
    # 1. Build base query (Category & Search)
    if category and category != "All":
        category_doc = await db.categories.find_one({"name": {"$regex": category, "$options": "i"}})
        if category_doc:
            category_values = [category_doc["_id"], category_doc.get("name"), category_doc.get("query")]
            base_query["category"] = {"$in": [value for value in category_values if value is not None]}
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
    cursor = db.products.find({"featured": True, "isActive": {"$ne": False}}).limit(5)
    products = await cursor.to_list(length=5)
    return {"success": True, "products": [serialize_doc(p) for p in products]}


@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    try:
        # ✅ Convert string to ObjectId before querying
        if ObjectId.is_valid(product_id):
            product = await db.products.find_one({"_id": ObjectId(product_id)})
        else:
            product = await db.products.find_one({"slug": product_id})
    except:
        # Invalid ObjectId format
        raise HTTPException(status_code=404, detail="Product not found")
    
    if not product or product.get("isActive") is False:
        raise HTTPException(status_code=404, detail="Product not found")

    product_id = str(product["_id"])
    product_review_docs = await db.product_reviews.find(
        {"product_id": product_id},
        {"product_id": 1, "variant_id": 1, "rating": 1, "title": 1, "body": 1, "reviewer_name": 1, "created_at": 1, "verified": 1, "is_sample": 1},
    ).sort("created_at", -1).to_list(length=5000)
    product_reviews = []
    for review in product_review_docs:
        product_reviews.append({
            "id": str(review["_id"]),
            "rating": review.get("rating", 5),
            "title": review.get("title", ""),
            "body": review.get("body", ""),
            "name": review.get("reviewer_name", "Customer"),
            "created_at": review.get("created_at"),
            "verified": review.get("verified", True),
            "is_sample": review.get("is_sample", False),
        })
    product["reviews"] = product_reviews
    
    return {"success": True, "product": serialize_doc(product)}

# --- ADMIN (Protected) ---
@app.post("/api/admin/products")
async def create_product(req: ProductReq, admin: dict = Depends(get_admin_user)):
    product_doc = build_product_doc(req)
    product_doc["slug"] = await get_unique_product_slug(product_doc["name"])
    product_doc["isActive"] = True
    result = await db.products.insert_one(product_doc)
    product_doc["_id"] = str(result.inserted_id)
    return {"success": True, "product": product_doc}

@app.get("/api/admin/categories")
async def get_admin_categories(admin: dict = Depends(get_admin_user)):
    categories = await db.categories.find().sort("order", 1).to_list(length=500)
    return {"success": True, "categories": [serialize_doc(category) for category in categories]}

@app.post("/api/admin/categories", status_code=status.HTTP_201_CREATED)
async def create_admin_category(req: CategoryReq, admin: dict = Depends(get_admin_user)):
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")
    existing = await db.categories.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=409, detail="A category with this name already exists")
    first_category = await db.categories.find_one({"image": {"$type": "string", "$ne": ""}}, {"image": 1})
    category_doc = {
        "name": name,
        "query": name,
        "count": "",
        "image": first_category.get("image", "") if first_category else "",
        "order": await db.categories.count_documents({}),
        "isActive": True,
    }
    result = await db.categories.insert_one(category_doc)
    category_doc["_id"] = str(result.inserted_id)
    return {"success": True, "category": category_doc}

@app.delete("/api/admin/categories/{category_id}")
async def delete_admin_category(category_id: str, admin: dict = Depends(get_admin_user)):
    try:
        object_id = ObjectId(category_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Category not found")
    category = await db.categories.find_one({"_id": object_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    category_values = [category.get("_id"), category.get("name"), category.get("query")]
    product_count = await db.products.count_documents({"category": {"$in": [value for value in category_values if value is not None]}})
    if product_count:
        raise HTTPException(status_code=409, detail=f"This category is used by {product_count} product(s). Move those products to another category before deleting it.")
    await db.categories.delete_one({"_id": object_id})
    return {"success": True, "message": "Category deleted"}

@app.put("/api/admin/categories/{category_id}/image")
async def update_admin_category_image(category_id: str, req: CategoryImageReq, admin: dict = Depends(get_admin_user)):
    try:
        object_id = ObjectId(category_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Category not found")
    result = await db.categories.update_one({"_id": object_id}, {"$set": {"image": req.image.strip()}})
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Category not found")
    category = await db.categories.find_one({"_id": object_id})
    return {"success": True, "category": serialize_doc(category)}

@app.get("/api/admin/slides")
async def get_admin_slides(admin: dict = Depends(get_admin_user)):
    slides = await db.slides.find().sort("order", 1).to_list(length=100)
    return {"success": True, "slides": [serialize_doc(slide) for slide in slides]}

@app.post("/api/admin/slides", status_code=status.HTTP_201_CREATED)
async def create_admin_slide(req: SlideReq, admin: dict = Depends(get_admin_user)):
    slide_doc = req.model_dump()
    slide_doc.update({key: value.strip() for key, value in slide_doc.items() if isinstance(value, str)})
    result = await db.slides.insert_one(slide_doc)
    slide_doc["_id"] = str(result.inserted_id)
    return {"success": True, "slide": slide_doc}

@app.put("/api/admin/slides/{slide_id}")
async def update_admin_slide(slide_id: str, req: SlideReq, admin: dict = Depends(get_admin_user)):
    try:
        object_id = ObjectId(slide_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Banner not found")
    slide_doc = req.model_dump()
    slide_doc.update({key: value.strip() for key, value in slide_doc.items() if isinstance(value, str)})
    result = await db.slides.update_one({"_id": object_id}, {"$set": slide_doc})
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Banner not found")
    slide = await db.slides.find_one({"_id": object_id})
    return {"success": True, "slide": serialize_doc(slide)}

@app.delete("/api/admin/slides/{slide_id}")
async def delete_admin_slide(slide_id: str, admin: dict = Depends(get_admin_user)):
    try:
        object_id = ObjectId(slide_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Banner not found")
    result = await db.slides.delete_one({"_id": object_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"success": True, "message": "Banner deleted"}

@app.post("/api/admin/uploads/images")
async def upload_product_images(
    product_name: str = Form(...),
    color: str = Form(...),
    files: List[UploadFile] = File(...),
    admin: dict = Depends(get_admin_user),
):
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Upload up to 10 images at a time")
    name_part = slugify_product_name(product_name)
    color_part = slugify_product_name(color)
    if not name_part or not color_part:
        raise HTTPException(status_code=400, detail="Enter the product name and color before uploading images")

    saved_urls = []
    for upload in files:
        content = await upload.read(8 * 1024 * 1024 + 1)
        if len(content) > 8 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Each image must be 8 MB or smaller")
        if not content:
            raise HTTPException(status_code=400, detail="The selected image file is empty")
        extension = resolve_upload_image_extension(upload.filename or "", upload.content_type, content)
        if not extension:
            raise HTTPException(status_code=400, detail="Use a JPG, PNG, or WebP image file")

        prefix = f"{name_part}-{color_part}-"
        number = 1
        while True:
            filename = f"{prefix}{number}{extension}"
            target = UPLOAD_DIR / filename
            try:
                with target.open("xb") as image_file:
                    image_file.write(content)
                break
            except FileExistsError:
                number += 1
        saved_urls.append(f"/uploads/{filename}")
    return {"success": True, "images": saved_urls}

@app.post("/api/admin/uploads/banners")
async def upload_banner_image(
    title: str = Form(...),
    file: UploadFile = File(...),
    admin: dict = Depends(get_admin_user),
):
    title_part = slugify_product_name(title)
    if not title_part:
        raise HTTPException(status_code=400, detail="Enter a banner title before uploading")
    extension = Path(file.filename or "").suffix.lower()
    content = await file.read(8 * 1024 * 1024 + 1)
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be 8 MB or smaller")
    if not content:
        raise HTTPException(status_code=400, detail="The selected image file is empty")
    extension = resolve_upload_image_extension(file.filename or "", file.content_type, content)
    if not extension:
        raise HTTPException(status_code=400, detail="Use a JPG, PNG, or WebP image file")
    number = 1
    while True:
        filename = f"banner-{title_part}-{number}{extension}"
        target = UPLOAD_DIR / filename
        try:
            with target.open("xb") as image_file:
                image_file.write(content)
            break
        except FileExistsError:
            number += 1
    return {"success": True, "image": f"/uploads/{filename}"}

@app.post("/api/admin/uploads/categories")
async def upload_category_image(
    category_name: str = Form(...),
    file: UploadFile = File(...),
    admin: dict = Depends(get_admin_user),
):
    category_part = slugify_product_name(category_name)
    if not category_part:
        raise HTTPException(status_code=400, detail="Category name is required")
    content = await file.read(8 * 1024 * 1024 + 1)
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be 8 MB or smaller")
    if not content:
        raise HTTPException(status_code=400, detail="The selected image file is empty")
    extension = resolve_upload_image_extension(file.filename or "", file.content_type, content)
    if not extension:
        raise HTTPException(status_code=400, detail="Use a JPG, PNG, or WebP image file")
    number = 1
    while True:
        filename = f"category-{category_part}-{number}{extension}"
        target = UPLOAD_DIR / filename
        try:
            with target.open("xb") as image_file:
                image_file.write(content)
            break
        except FileExistsError:
            number += 1
    return {"success": True, "image": f"/uploads/{filename}"}

@app.get("/api/admin/products/{product_id}")
async def get_admin_product(product_id: str, admin: dict = Depends(get_admin_user)):
    try:
        product = await db.products.find_one({"_id": ObjectId(product_id)})
    except Exception:
        product = None
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "product": serialize_doc(product)}

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
    product_doc["slug"] = await get_unique_product_slug(product_doc["name"], object_id)
    await db.products.update_one({"_id": object_id}, {"$set": product_doc})
    updated = await db.products.find_one({"_id": object_id})
    return {"success": True, "product": serialize_doc(updated)}

@app.delete("/api/admin/products/{product_id}")
async def delete_product(product_id: str, admin: dict = Depends(get_admin_user)):
    try:
        object_id = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Product not found")
    result = await db.products.update_one({"_id": object_id}, {"$set": {"isActive": False}})
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "message": "Product unpublished"}

@app.get("/api/admin/products")
async def get_admin_products(admin: dict = Depends(get_admin_user)):
    products = await db.products.find().sort("_id", -1).to_list(length=500)
    return {"success": True, "products": [serialize_doc(p) for p in products]}

@app.patch("/api/admin/products/{product_id}/listing")
async def set_product_listing(product_id: str, is_active: bool, admin: dict = Depends(get_admin_user)):
    try:
        object_id = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Product not found")
    result = await db.products.update_one({"_id": object_id}, {"$set": {"isActive": is_active}})
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "isActive": is_active}

@app.get("/api/admin/dashboard")
async def admin_dashboard(admin: dict = Depends(get_admin_user)):
    total_products = await db.products.count_documents({})
    active_products = await db.products.count_documents({"isActive": {"$ne": False}})
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": {"$nin": ["delivered", "cancelled"]}})
    revenue_data = await db.orders.aggregate([
        {"$match": {"status": {"$ne": "cancelled"}, "payment_status": {"$in": ["paid", "succeeded", "completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}},
    ]).to_list(length=1)
    recent_orders = await db.orders.find().sort("created_at", -1).limit(5).to_list(length=5)
    user_ids = list({order.get("user_id") for order in recent_orders if order.get("user_id")})
    users = await db.users.find({"_id": {"$in": user_ids}}, {"name": 1, "email": 1}).to_list(length=5) if user_ids else []
    customer_map = {str(user["_id"]): {"name": user.get("name", ""), "email": user.get("email", "")} for user in users}
    populated_recent_orders = [{**serialize_doc(order), "customer": customer_map.get(str(order.get("user_id")), {"name": "", "email": ""})} for order in recent_orders]
    return {"success": True, "stats": {"products": total_products, "active_products": active_products, "orders": total_orders, "pending_orders": pending_orders, "revenue": revenue_data[0]["total"] if revenue_data else 0}, "recent_orders": populated_recent_orders}

@app.get("/api/admin/orders")
async def admin_orders(status_filter: Optional[str] = None, admin: dict = Depends(get_admin_user)):
    query = {"status": status_filter} if status_filter else {}
    orders = await db.orders.find(query).sort("created_at", -1).limit(500).to_list(length=500)
    user_ids = list({o.get("user_id") for o in orders if o.get("user_id")})
    users = await db.users.find({"_id": {"$in": user_ids}}, {"name": 1, "email": 1}).to_list(length=500) if user_ids else []
    customer_map = {str(u["_id"]): {"name": u.get("name", "Customer"), "email": u.get("email", "")} for u in users}
    return {"success": True, "orders": [{**serialize_doc(o), "customer": customer_map.get(str(o.get("user_id")), {"name": "Customer", "email": ""})} for o in orders]}

@app.get("/api/admin/orders/{order_id}")
async def get_admin_order(order_id: str, admin: dict = Depends(get_admin_user)):
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        order = None
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    customer = await db.users.find_one({"_id": order.get("user_id")}, {"name": 1, "email": 1, "phone": 1, "created_at": 1})
    customer_data = {
        "_id": str(customer["_id"]) if customer else None,
        "name": customer.get("name", "Customer") if customer else "Customer",
        "email": customer.get("email", "") if customer else "",
        "phone": customer.get("phone") if customer else order.get("phone"),
        "created_at": customer.get("created_at") if customer else None,
    }
    return {"success": True, "order": serialize_doc(order), "customer": serialize_doc(customer_data)}

@app.get("/api/admin/customers/{customer_id}/orders")
async def get_admin_customer_orders(customer_id: str, admin: dict = Depends(get_admin_user)):
    try:
        customer_object_id = ObjectId(customer_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer = await db.users.find_one({"_id": customer_object_id}, {"name": 1, "email": 1, "phone": 1, "created_at": 1})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    orders = await db.orders.find({"user_id": customer_object_id}).sort("created_at", -1).to_list(length=None)
    return {
        "success": True,
        "customer": serialize_doc(customer),
        "orders": [serialize_doc(order) for order in orders],
    }

@app.patch("/api/admin/orders/{order_id}")
async def update_admin_order(order_id: str, req: OrderStatusReq, admin: dict = Depends(get_admin_user)):
    allowed_statuses = {"confirmed", "processing", "shipped", "delivered", "cancelled"}
    allowed_payments = {"pending", "paid", "failed", "refunded"}
    if req.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid order status")
    if req.payment_status is not None and req.payment_status not in allowed_payments:
        raise HTTPException(status_code=400, detail="Invalid payment status")
    try:
        object_id = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")
    updates = {"status": req.status, "updated_at": datetime.utcnow()}
    if req.payment_status is not None:
        updates["payment_status"] = req.payment_status
    result = await db.orders.update_one({"_id": object_id}, {"$set": updates})
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Order not found")
    order = await db.orders.find_one({"_id": object_id})
    return {"success": True, "order": serialize_doc(order)}

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

# ==========================================
# ORDERS & ORDER REVIEWS (Protected)
# ==========================================

@app.post("/api/orders", status_code=201)
async def create_order(req: CreateOrderReq, current_user: dict = Depends(get_current_user)):
    user_id = ObjectId(current_user["_id"])
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    address = next((address for address in user.get("addresses", [])
        if str(address.get("_id")) == req.address_id), None)
    if not address:
        raise HTTPException(status_code=400, detail="Choose a saved delivery address")
    if not user.get("phone"):
        raise HTTPException(status_code=400, detail="Add a phone number before placing an order")

    cart = await db.carts.find_one({"user_id": user_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Your cart is empty")

    order_items = []
    subtotal = 0
    for cart_item in cart["items"]:
        try:
            product = await db.products.find_one({"_id": ObjectId(cart_item["product_id"])})
        except Exception:
            product = None
        if not product:
            raise HTTPException(status_code=400, detail="A product in your cart is no longer available")

        variant_id = cart_item.get("variant_id") or (cart_item.get("selectedVariant") or {}).get("variant_id")
        variant = next((value for value in product.get("variants", [])
            if variant_id and value.get("variant_id") == variant_id), None)
        if variant is None and cart_item.get("selectedVariant"):
            selected = cart_item["selectedVariant"]
            variant = next((value for value in product.get("variants", [])
                if value.get("color") == selected.get("color") and
                value.get("size") == selected.get("size")), None)
        if product.get("variants") and not variant:
            raise HTTPException(status_code=400, detail=f"Choose an available variant for {product.get('name', 'a product')}")
        if variant and not variant.get("isAvailable", True):
            raise HTTPException(status_code=409, detail=f"{product.get('name', 'A product')} is no longer available")

        quantity = max(1, int(cart_item.get("quantity", 1)))
        selected_variant = variant or cart_item.get("selectedVariant") or {}
        unit_price = selected_variant.get("price", product.get("price", 0))
        line_total = unit_price * quantity
        subtotal += line_total
        order_items.append({
            "product_id": str(product["_id"]),
            "product_name": product.get("name", "Product"),
            "variant_id": selected_variant.get("variant_id"),
            "color": selected_variant.get("color"),
            "size": selected_variant.get("size"),
            "sku": selected_variant.get("sku"),
            "description": selected_variant.get("description", product.get("description")),
            "price": unit_price,
            "quantity": quantity,
            "line_total": line_total,
            "images": selected_variant.get("images", product.get("images", [])),
            "review": None,
        })

    shipping_fee = 99
    now = datetime.utcnow()
    order_doc = {
        "order_number": f"ZAH-{now.strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}",
        "user_id": user_id,
        "items": order_items,
        "shipping_address": serialize_doc(address),
        "phone": user["phone"],
        "subtotal": subtotal,
        "shipping_fee": shipping_fee,
        "total": subtotal + shipping_fee,
        "status": "confirmed",
        "payment_status": "pending",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.orders.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id
    await db.carts.update_one(
        {"_id": cart["_id"]},
        {"$set": {"items": [], "updated_at": datetime.utcnow()}},
    )
    return {"success": True, "order": serialize_doc(order_doc)}


@app.get("/api/orders")
async def get_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": ObjectId(current_user["_id"])}).sort("created_at", -1).to_list(length=100)
    return {"success": True, "orders": [serialize_doc(order) for order in orders]}


@app.get("/api/orders/{order_id}")
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    try:
        order_object_id = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")
    order = await db.orders.find_one({"_id": order_object_id, "user_id": ObjectId(current_user["_id"])})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"success": True, "order": serialize_doc(order)}


@app.put("/api/orders/{order_id}/reviews")
async def save_order_review(
    order_id: str,
    req: OrderReviewReq,
    current_user: dict = Depends(get_current_user),
):
    try:
        order_object_id = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")
    user_id = ObjectId(current_user["_id"])
    order = await db.orders.find_one({"_id": order_object_id, "user_id": user_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.get("status", "")).strip().lower() != "delivered":
        raise HTTPException(status_code=409, detail="You can review products after the order has been delivered")

    order_item = next((item for item in order.get("items", [])
        if item.get("product_id") == req.product_id and item.get("variant_id") == req.variant_id), None)
    if not order_item:
        raise HTTPException(status_code=400, detail="This product is not part of the order")

    now = datetime.utcnow()
    previous_review = order_item.get("review") or {}
    review = {
        "rating": req.rating,
        "title": req.title.strip(),
        "body": req.body.strip(),
        "reviewer_name": current_user.get("name", "Customer"),
        "verified": True,
        "created_at": previous_review.get("created_at", now),
        "updated_at": now,
    }
    order_item["review"] = review
    review_id = f"{order_object_id}:{req.product_id}:{req.variant_id or 'no-variant'}"
    await db.product_reviews.replace_one(
        {"_id": review_id},
        {
            "_id": review_id,
            "product_id": req.product_id,
            "variant_id": req.variant_id,
            "order_id": order_object_id,
            "user_id": user_id,
            **review,
        },
        upsert=True,
    )
    await db.orders.update_one(
        {"_id": order_object_id, "user_id": user_id},
        {"$set": {"items": order["items"], "updated_at": now}},
    )
    return {"success": True, "review": serialize_doc(review)}
