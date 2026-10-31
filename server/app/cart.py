from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime
from typing import List

from models.cart import Cart, CartItem
# from dependencies.auth import get_current_user  # Your auth dependency

router = APIRouter(prefix="/cart", tags=["Cart"])

# Helper to get DB
def get_db():
    # yield your database instance
    pass

@router.get("/")
async def get_cart(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    user_id = current_user["_id"]
    
    # Find or create cart for user
    cart = await db.carts.find_one({"user_id": user_id})
    
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
            {"$set": {"cart_id": result.inserted_id}}
        )
        
        cart = await db.carts.find_one({"_id": result.inserted_id})
    
    # Populate product details
    cart["_id"] = str(cart["_id"])
    populated_items = []
    
    for item in cart.get("items", []):
        product = await db.products.find_one({"_id": ObjectId(item["product_id"])})
        if product:
            populated_items.append({
                **item,
                "product": serialize_doc(product)
            })
    
    return {
        "success": True,
        "cart": {
            "_id": str(cart["_id"]),
            "items": populated_items,
            "updated_at": cart.get("updated_at")
        }
    }

@router.post("/items")
async def add_to_cart(
    cart_item: CartItem,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    user_id = current_user["_id"]
    product_id = cart_item.product_id
    
    # Verify product exists
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Find or create cart
    cart = await db.carts.find_one({"user_id": ObjectId(user_id)})
    
    if not cart:
        # Create new cart
        cart_doc = {
            "user_id": ObjectId(user_id),
            "items": [cart_item.dict()],
            "updated_at": datetime.utcnow()
        }
        result = await db.carts.insert_one(cart_doc)
        
        # Update user with cart reference
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"cart_id": result.inserted_id}}
        )
        
        return {"success": True, "message": "Item added to cart"}
    
    # Check if item already exists
    existing_item = next(
        (item for item in cart["items"] if item["product_id"] == product_id),
        None
    )
    
    if existing_item:
        # Update quantity
        await db.carts.update_one(
            {"_id": cart["_id"], "items.product_id": product_id},
            {
                "$inc": {"items.$.quantity": cart_item.quantity},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    else:
        # Add new item
        await db.carts.update_one(
            {"_id": cart["_id"]},
            {
                "$push": {"items": cart_item.dict()},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    
    return {"success": True, "message": "Item added to cart"}

@router.put("/items/{product_id}")
async def update_cart_item(
    product_id: str,
    quantity: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    user_id = current_user["_id"]
    
    cart = await db.carts.find_one({"user_id": ObjectId(user_id)})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    if quantity <= 0:
        # Remove item
        await db.carts.update_one(
            {"_id": cart["_id"]},
            {
                "$pull": {"items": {"product_id": product_id}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    else:
        # Update quantity
        await db.carts.update_one(
            {"_id": cart["_id"], "items.product_id": product_id},
            {
                "$set": {
                    "items.$.quantity": quantity,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    
    return {"success": True, "message": "Cart updated"}

@router.delete("/items/{product_id}")
async def remove_from_cart(
    product_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    user_id = current_user["_id"]
    
    cart = await db.carts.find_one({"user_id": ObjectId(user_id)})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    await db.carts.update_one(
        {"_id": cart["_id"]},
        {
            "$pull": {"items": {"product_id": product_id}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"success": True, "message": "Item removed from cart"}

@router.delete("/")
async def clear_cart(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    user_id = current_user["_id"]
    
    await db.carts.update_one(
        {"user_id": ObjectId(user_id)},
        {
            "$set": {"items": [], "updated_at": datetime.utcnow()}
        }
    )
    
    return {"success": True, "message": "Cart cleared"}