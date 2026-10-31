import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import useCartStore from "../store/cartStore";
import { useEffect } from "react";

export default function Cart() {
  const {
    items,
    fetchCart,
    removeItem,
    updateQty,
    getTotal,
    getTotalItems,
    loading,
  } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, []);

  const total = getTotal();
  const shippingFee = items.length > 0 ? 99 : 0;
  const grandTotal = total + shippingFee;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-800"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20 bg-stone-50/50 text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 text-amber-800">
          <ShoppingBag className="w-10 h-10 stroke-[1.2]" />
        </div>
        <span className="text-xs font-medium tracking-[0.25em] text-amber-800 uppercase mb-2">
          Your Shopping Bag
        </span>
        <h1 className="text-3xl md:text-4xl font-serif text-stone-900 font-light mb-4">
          Your Cart is Currently Empty
        </h1>
        <Link
          to="/products"
          className="inline-flex items-center gap-3 bg-stone-900 text-stone-100 hover:bg-amber-900 px-8 py-3.5 text-xs font-medium tracking-widest uppercase transition-all duration-300 shadow-md"
        >
          Explore Collection
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-stone-50/50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <span className="text-xs font-medium tracking-[0.25em] text-amber-800 uppercase">
            Selected Items
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-stone-900 font-light mt-1">
            Shopping Cart ({getTotalItems()})
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              // ✅ Safely access product data
              const product = item.product || {};
              const imageSrc = product.images?.[0] || "/images/placeholder.jpg";
              const price = item.selectedVariant?.price ?? product.price ?? 0;
              const quantity = item.quantity || 1;

              return (
                <div
                  key={`${item.product_id}:${item.variant_id || "none"}`}
                  className="bg-white border border-stone-200/80 p-4 sm:p-6 rounded-sm shadow-sm flex gap-5"
                >
                  {/* Image */}
                  <Link
                    to={`/product/${item.product_id}`}
                    className="w-24 h-28 bg-stone-100 rounded-sm overflow-hidden shrink-0 block"
                  >
                    <img
                      src={imageSrc}
                      alt={product.name || "Product"}
                      className="w-full h-full object-cover object-top"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <Link to={`/product/${item.product_id}`}>
                        <h3 className="font-serif text-lg text-stone-900 font-medium hover:text-amber-800 transition-colors">
                          {product.name || "Product"}
                        </h3>
                      </Link>
                      {item.selectedVariant && (
                        <p className="text-xs text-stone-500 mt-1">
                          {item.selectedVariant.color} /{" "}
                          {item.selectedVariant.size}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center border border-stone-200 bg-stone-50 rounded-sm">
                        <button
                          onClick={() =>
                            updateQty(item.product_id, item.variant_id, quantity - 1)
                          }
                          disabled={quantity <= 1}
                          className="p-2 text-stone-600 hover:text-stone-900 disabled:opacity-30"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-semibold">
                          {quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQty(item.product_id, item.variant_id, quantity + 1)
                          }
                          className="p-2 text-stone-600 hover:text-stone-900"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-semibold text-stone-900">
                          ₹{(price * quantity).toLocaleString("en-IN")}
                        </span>
                        {quantity > 1 && (
                          <span className="text-[11px] text-stone-400 block">
                            ₹{price.toLocaleString("en-IN")} each
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.product_id, item.variant_id)}
                    className="text-stone-400 hover:text-rose-700 transition-colors self-start"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="bg-white border border-stone-200/80 p-6 sm:p-8 rounded-sm shadow-sm h-fit sticky top-28">
            <h2 className="text-xl font-serif text-stone-900 font-light border-b border-stone-100 pb-4 mb-6">
              Order Summary
            </h2>

            <div className="space-y-3 text-xs tracking-wide">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-900">
                  ₹{isNaN(total) ? 0 : total.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Estimated Shipping</span>
                <span className="font-semibold text-stone-900">
                  ₹{shippingFee.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="border-t border-stone-200 pt-4 flex justify-between items-baseline">
                <span className="text-sm font-medium uppercase tracking-wider">
                  Total
                </span>
                <span className="text-xl font-semibold text-stone-900">
                  ₹{isNaN(grandTotal) ? 0 : grandTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              className="w-full bg-stone-900 text-stone-100 hover:bg-amber-900 py-3.5 px-4 text-xs font-medium tracking-widest uppercase transition-all duration-300 mt-6 flex items-center justify-center gap-2"
            >
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
