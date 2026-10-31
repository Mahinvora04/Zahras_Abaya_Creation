"""Move product-specific details into variants in MongoDB.

Dry run by default. Apply with:
    server/venv/Scripts/python.exe server/migrate_product_variant_structure.py --apply
"""

import argparse
import os
from copy import deepcopy
from uuid import uuid4

from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient


VARIANT_FIELDS = (
    "description",
    "price",
    "originalPrice",
    "images",
    "color",
    "colorHex",
    "size",
    "sku",
    "isAvailable",
)
REMOVE_FROM_PRODUCT = (
    "description",
    "price",
    "originalPrice",
    "images",
    "stock",
    "discount",
    "variantOptions",
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write changes to MongoDB")
    args = parser.parse_args()

    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    uri = os.getenv("MONGO_URI")
    if not uri:
        raise SystemExit("MONGO_URI is not configured")

    client = MongoClient(uri, serverSelectionTimeoutMS=15000)
    db = client.get_database("zahras_abaya")

    products = list(db.products.find({}))
    product_updates = []
    variants_by_product = {}

    for product in products:
        variants = deepcopy(product.get("variants") or [])
        if not variants:
            variants = [{
                "variant_id": str(uuid4()),
                "sku": product.get("sku"),
                "isAvailable": bool(product.get("isAvailable", True)),
            }]

        for variant in variants:
            variant.setdefault("variant_id", str(uuid4()))
            for field in VARIANT_FIELDS:
                if field not in variant and field in product:
                    variant[field] = deepcopy(product[field])
            variant.pop("stock", None)
            variant.pop("discount", None)
            if "isAvailable" not in variant:
                variant["isAvailable"] = True

        default_variant_id = variants[0]["variant_id"]
        variants_by_product[str(product["_id"])] = variants
        set_fields = {
            "variants": variants,
            "defaultVariantId": default_variant_id,
        }
        unset_fields = {field: "" for field in REMOVE_FROM_PRODUCT if field in product}
        if any(product.get(key) != value for key, value in set_fields.items()) or unset_fields:
            product_updates.append((product["_id"], set_fields, unset_fields))

    cart_updates = []
    unmatched = []
    for cart in db.carts.find({}):
        items = deepcopy(cart.get("items") or [])
        changed = False
        for item in items:
            try:
                product_id = str(item.get("product_id"))
                product_object_id = ObjectId(product_id)
            except Exception:
                unmatched.append((str(cart["_id"]), item.get("product_id")))
                continue

            product = next((p for p in products if p["_id"] == product_object_id), None)
            variants = variants_by_product.get(product_id, [])
            selected = item.get("selectedVariant") or {}
            variant = next((v for v in variants if
                (item.get("variant_id") and v.get("variant_id") == item.get("variant_id")) or
                (selected.get("variant_id") and v.get("variant_id") == selected.get("variant_id")) or
                (selected.get("sku") and v.get("sku") == selected.get("sku")) or
                (selected.get("color") == v.get("color") and selected.get("size") == v.get("size") and selected)), None)
            if variant is None and not selected and variants:
                variant = variants[0]
            if variant is None:
                unmatched.append((str(cart["_id"]), product_id))
                continue

            selected_variant = deepcopy(variant)
            if item.get("variant_id") != variant["variant_id"] or item.get("selectedVariant") != selected_variant:
                item["variant_id"] = variant["variant_id"]
                item["selectedVariant"] = selected_variant
                changed = True

        if changed:
            cart_updates.append((cart["_id"], items))

    if unmatched:
        raise SystemExit(f"Migration stopped: {len(unmatched)} cart line(s) could not be mapped. No writes made.")

    print(f"Products to update: {len(product_updates)} of {len(products)}")
    print(f"Variants checked: {sum(len(p.get('variants') or []) or 1 for p in products)}")
    print(f"Cart documents to update: {len(cart_updates)}")
    if not args.apply:
        print("Dry run only. Pass --apply to write these changes.")
        client.close()
        return

    for product_id, set_fields, unset_fields in product_updates:
        update = {"$set": set_fields}
        if unset_fields:
            update["$unset"] = unset_fields
        db.products.update_one({"_id": product_id}, update)
    for cart_id, items in cart_updates:
        db.carts.update_one({"_id": cart_id}, {"$set": {"items": items}})

    print("Product and cart schema migration applied.")
    client.close()


if __name__ == "__main__":
    main()
