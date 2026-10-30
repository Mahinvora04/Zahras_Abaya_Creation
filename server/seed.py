import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.models.user import User
from app.models.product import Product
from app.models.content import Slide, Category, Feature
from passlib.context import CryptContext
d
load_dotenv()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_database():
    print("🔄 Connecting to MongoDB...")
    client = AsyncIOMotorClient(os.getenv("MONGO_URI"))
    db = client.get_database("zahras_abaya")
    
    await init_beanie(database=db, document_models=[User, Product, Slide, Category, Feature])
    print("✅ Connected & Initialized")

    # 1. Clear old data
    await User.delete_all()
    await Product.delete_all()
    await Slide.delete_all()
    await Category.delete_all()
    await Feature.delete_all()

    # 2. Seed Categories FIRST (so we can get their IDs)
    print("📂 Seeding Categories...")
    categories_data = [
        {"name": "Abayas", "count": "120+ Items", "image": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600", "query": "Abaya", "order": 1, "isActive": True},
        {"name": "Hijabs", "count": "80+ Items", "image": "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?q=80&w=600", "query": "Hijab", "order": 2, "isActive": True},
        {"name": "Kaftans", "count": "45+ Items", "image": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600", "query": "Kaftan", "order": 3, "isActive": True},
        {"name": "Jilbabs", "count": "30+ Items", "image": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600", "query": "Jilbab", "order": 4, "isActive": True}
    ]
    categories = [Category(**data) for data in categories_data]
    await Category.insert_many(categories)
    
    # Create a dictionary to easily map category names to their new Object IDs
    category_id_map = {cat.name.lower(): cat.id for cat in categories}
    print(f"   Created {len(categories)} categories.")

    # 3. Seed Products (Using Category IDs)
    print(" Seeding Products...")
    products_data = [
        {
            "name": "Dubai Crush Double Shrug Abaya",
            "description": "Elegant black abaya.",
            "price": 1249.0, "originalPrice": 1800.0,
            "category": category_id_map["abayas"], # ✅ Passing the Object ID here
            "images": ["https://placehold.co/600x800/1a1a1a/ffffff?text=Abaya"],
            "stock": 25, "rating": 4.5, "numReviews": 83, "featured": True, "discount": 31.0
        },
        {
            "name": "Premium Chiffon Hijab - Pink",
            "description": "Soft chiffon hijab.",
            "price": 299.0, "originalPrice": 499.0,
            "category": category_id_map["hijabs"], # ✅ Passing the Object ID here
            "images": ["https://placehold.co/600x800/D4A5A5/ffffff?text=Hijab"],
            "stock": 50, "rating": 4.5, "numReviews": 120, "featured": False, "discount": 40.0
        }
    ]
    products = [Product(**data) for data in products_data]
    await Product.insert_many(products)

    # 4. Seed Features
    print("✨ Seeding Features...")
    features_data = [
        {"icon": "Truck", "title": "Express Shipping", "desc": "Free over $150", "order": 1, "isActive": True},
        {"icon": "Sparkles", "title": "Premium Quality", "desc": "High-grade fabrics", "order": 2, "isActive": True},
        {"icon": "ShieldCheck", "title": "Secure Payment", "desc": "100% secure checkout", "order": 3, "isActive": True},
        {"icon": "RotateCcw", "title": "Easy Returns", "desc": "30-day policy", "order": 4, "isActive": True}
    ]
    features = [Feature(**data) for data in features_data]
    await Feature.insert_many(features)

    print("\n DATABASE SEEDED SUCCESSFULLY! 🎉\n")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())