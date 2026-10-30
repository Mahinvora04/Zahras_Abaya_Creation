import os
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt, JWTError
from dotenv import load_dotenv
from typing import List, Optional
from bson import ObjectId  # Added for ObjectId handling

# 1. Load Environment & Setup
load_dotenv()
app = FastAPI(title="Zahra's Abaya API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # ✅ Specific origins
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

# 2. Minimal Request Models
class RegisterReq(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class ProductReq(BaseModel):
    name: str
    description: str
    price: float
    originalPrice: Optional[float] = None
    category: str  # Stores the Category ID string
    images: List[str]
    stock: int = 0
    featured: bool = False
    discount: float = 0.0

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
    
# 3. Helper Functions
def create_token(user_id: str):
    expires = datetime.utcnow() + timedelta(days=int(os.getenv("JWT_EXPIRES_IN_DAYS", 7)))
    return jwt.encode({"sub": user_id, "exp": expires}, SECRET_KEY, algorithm=ALGORITHM)

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
        return serialize_doc(user)
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
    
    if await db.users.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="User already exists")
    
    hashed_pw = pwd_context.hash(req.password)
    user_doc = {"name": req.name, "email": req.email, "password": hashed_pw, "role": "user"}
    result = await db.users.insert_one(user_doc)
    
    token = create_token(str(result.inserted_id))
    set_cookie(response, token)
    
    return {"success": True, "user": {"_id": str(result.inserted_id), "name": req.name, "email": req.email, "role": "user"}}

@app.post("/api/auth/login")
async def login(req: LoginReq, response: Response):
    user = await db.users.find_one({"email": req.email})
    if not user or not pwd_context.verify(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(str(user["_id"]))
    set_cookie(response, token)
    
    return {"success": True, "user": serialize_doc(user)}

@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"success": True, "user": current_user}

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="token")
    return {"success": True, "message": "Logged out"}

# --- PRODUCTS (Public) ---
@app.get("/api/products")
async def get_products(category: Optional[str] = None, search: Optional[str] = None, sort: str = "newest"):
    query = {}
    
    # ✅ Handle category filtering properly
    if category and category != "All":
        # First, find the category by name to get its ObjectId
        category_doc = await db.categories.find_one({"name": {"$regex": category, "$options": "i"}})
        if category_doc:
            query["category"] = category_doc["_id"]  # Use ObjectId
        else:
            # Category not found, return empty results
            return {"success": True, "products": []}
    
    if search and search.strip():
        query["name"] = {"$regex": search, "$options": "i"}
    
    sort_order = -1 if sort in ["newest", "price-high", "rating"] else 1
    sort_field = "price" if "price" in sort else ("rating" if sort == "rating" else "_id")
    
    cursor = db.products.find(query).sort(sort_field, sort_order)
    products = await cursor.to_list(length=100)
    
    return {"success": True, "products": [serialize_doc(p) for p in products]}

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
    product_doc = req.model_dump()
    result = await db.products.insert_one(product_doc)
    product_doc["_id"] = str(result.inserted_id)
    return {"success": True, "product": product_doc}

@app.put("/api/admin/products/{product_id}")
async def update_product(product_id: str, req: ProductReq, admin: dict = Depends(get_admin_user)):
    await db.products.update_one({"_id": product_id}, {"$set": req.model_dump()})
    updated = await db.products.find_one({"_id": product_id})
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
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
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": update_data}
    )
    updated_user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    return {"success": True, "user": serialize_doc(updated_user)}


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
    return {"success": True, "user": serialize_doc(updated_user)}


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
    return {"success": True, "user": serialize_doc(updated_user)}


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
    return {"success": True, "user": serialize_doc(final_user)}