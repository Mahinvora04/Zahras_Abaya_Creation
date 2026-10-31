"""Add stable IDs to embedded product variants and reference them in cart lines.

Run from the repository root with:
    server/venv/Scripts/python.exe server/migrate_variant_ids.py --apply
"""

import argparse
import os
from uuid import uuid4

from dotenv import load_dotenv
from pymongo import MongoClient


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

    product_updates = []
    variant_lookup = {}
    for product in db.products.find({}):
        variants = product.get("variants") or []
        updated = False
        for variant in variants:
            if not variant.get("variant_id"):
                variant["variant_id"] = str(uuid4())
                updated = True
            variant_lookup[(str(product["_id"]), variant.get("variant_id"))] = variant
        if updated:
            product_updates.append((product["_id"], variants))

    cart_updates = []
    unmatched = []
    for cart in db.carts.find({}):
        items = cart.get("items") or []
        updated = False
        for item in items:
            product_id = item.get("product_id")
            variants = [v for (pid, _), v in variant_lookup.items() if pid == product_id]
            selected = item.get("selectedVariant")
            if not selected:
                continue

            match = next((v for v in variants if
                (selected.get("variant_id") and v.get("variant_id") == selected.get("variant_id")) or
                (selected.get("sku") and v.get("sku") == selected.get("sku")) or
                (v.get("color") == selected.get("color") and v.get("size") == selected.get("size"))), None)
            if not match:
                unmatched.append((str(cart["_id"]), product_id, selected.get("color"), selected.get("size")))
                continue
            if item.get("variant_id") != match["variant_id"]:
                item["variant_id"] = match["variant_id"]
                item["selectedVariant"] = {**selected, "variant_id": match["variant_id"]}
                updated = True
        if updated:
            cart_updates.append((cart["_id"], items))

    if unmatched:
        raise SystemExit(f"Migration stopped: {len(unmatched)} selected cart variant(s) could not be matched. No writes made.")

    print(f"Product variant arrays to update: {len(product_updates)}")
    print(f"Cart documents to update: {len(cart_updates)}")
    print(f"Variant IDs assigned or retained: {len(variant_lookup)}")
    if not args.apply:
        print("Dry run only. Pass --apply to write these additive changes.")
        return

    for product_id, variants in product_updates:
        db.products.update_one({"_id": product_id}, {"$set": {"variants": variants}})
    for cart_id, items in cart_updates:
        db.carts.update_one({"_id": cart_id}, {"$set": {"items": items}})

    print("Migration applied successfully.")
    client.close()


if __name__ == "__main__":
    main()
