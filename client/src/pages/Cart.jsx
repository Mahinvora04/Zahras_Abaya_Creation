import {
  ArrowRight,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import useCartStore from '../store/cartStore';

export default function Cart() {
  const { items, removeItem, updateQty, getTotal } = useCartStore();
  const navigate = useNavigate();
  const total = getTotal();
  const shippingFee = items.length > 0 ? 99 : 0;
  const grandTotal = total + shippingFee;

  // ✅ Helper to check if a string is a MongoDB ObjectId (24 hex characters)
  const isObjectId = (str) => typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str);

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
        <p className="text-sm text-stone-500 font-light max-w-md mb-8 leading-relaxed">
          Discover our handcrafted luxury Abayas, Kaftans, and Hijabs to elevate your wardrobe with timeless modesty.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-3 bg-stone-900 text-stone-100 hover:bg-amber-900 px-8 py-3.5 text-xs font-medium tracking-widest uppercase transition-all duration-300 shadow-md group"
        >
          <span>Explore Collection</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-stone-50/50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center sm:text-left">
          <span className="text-xs font-medium tracking-[0.25em] text-amber-800 uppercase">
            Selected Items
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-stone-900 font-light mt-1">
            Shopping Cart ({items.reduce((acc, item) => acc + item.qty, 0)})
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const imageSrc = item.images?.[0] || '/images/placeholder.jpg';
              // Use uniqueId if available (from variant logic), otherwise fallback to _id for React key
              const itemKey = item.uniqueId || item._id;

              return (
                <div
                  key={itemKey}
                  className="bg-white border border-stone-200/80 p-4 sm:p-6 rounded-sm shadow-sm flex flex-col sm:flex-row gap-5 items-stretch"
                >
                  {/* Image */}
                  <Link
                    to={`/product/${item._id}`}
                    className="w-full sm:w-28 h-36 bg-stone-100 rounded-sm overflow-hidden shrink-0 block relative"
                  >
                    <img
                      src={imageSrc}
                      alt={item.name}
                      className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                    />
                  </Link>

                  {/* Info & Controls */}
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        {/* ✅ Category Tag (Only display if it's a real name, not an ObjectId) */}
                        {item.category && !isObjectId(item.category) && (
                          <span className="text-[10px] tracking-widest uppercase text-amber-800 font-medium block mb-1">
                            {item.category}
                          </span>
                        )}
                        
                        {/* Display Variant info if it exists */}
                        {item.selectedVariant && (
                          <span className="text-[10px] tracking-widest uppercase text-stone-500 font-medium block mb-1">
                            {item.selectedVariant.color} / {item.selectedVariant.size}
                          </span>
                        )}

                        <Link to={`/product/${item._id}`}>
                          <h3 className="font-serif text-lg text-stone-900 font-medium hover:text-amber-800 transition-colors line-clamp-1">
                            {item.name}
                          </h3>
                        </Link>
                      </div>

                      <button
                        onClick={() => removeItem(itemKey)}
                        className="text-stone-400 hover:text-rose-700 transition-colors p-1"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Price & Quantity controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-stone-200 bg-stone-50 rounded-sm">
                        <button
                          onClick={() => updateQty(itemKey, Math.max(1, item.qty - 1))}
                          disabled={item.qty <= 1}
                          className="p-2 text-stone-600 hover:text-stone-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-semibold text-stone-900 min-w-[32px] text-center">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(itemKey, item.qty + 1)}
                          className="p-2 text-stone-600 hover:text-stone-900 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Total Item Price */}
                      <div className="text-right">
                        <span className="text-base font-semibold text-stone-900 block">
                          ₹{(item.price * item.qty).toLocaleString('en-IN')}
                        </span>
                        {item.qty > 1 && (
                          <span className="text-[11px] text-stone-400 font-light">
                            ₹{item.price.toLocaleString('en-IN')} each
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Navigation back to shop */}
            <div className="pt-4">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-900 hover:text-stone-900 uppercase border-b border-amber-900/40 pb-0.5 transition-colors"
              >
                <span>← Continue Browsing Collection</span>
              </Link>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="bg-white border border-stone-200/80 p-6 sm:p-8 rounded-sm shadow-sm space-y-6 sticky top-28">
            <h2 className="text-xl font-serif text-stone-900 font-light border-b border-stone-100 pb-4">
              Order Summary
            </h2>

            <div className="space-y-3 text-xs tracking-wide">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-900">
                  ₹{total.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Estimated Shipping</span>
                <span className="font-semibold text-stone-900">
                  ₹{shippingFee.toLocaleString('en-IN')}
                </span>
              </div>
              
              <div className="border-t border-stone-200 pt-4 flex justify-between items-baseline text-stone-900">
                <span className="text-sm font-medium uppercase tracking-wider">Total</span>
                <div className="text-right">
                  <span className="text-xl font-semibold text-stone-900">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                  <span className="block text-[10px] text-stone-400 font-light mt-0.5">
                    Inclusive of all taxes
                  </span>
                </div>
              </div>
            </div>

            {/* Checkout CTA */}
            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-stone-900 text-stone-100 hover:bg-amber-900 py-3.5 px-4 text-xs font-medium tracking-widest uppercase transition-all duration-300 shadow-md flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Trust Badges */}
            <div className="pt-4 border-t border-stone-100 space-y-3">
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
                <span>100% Secure & Encrypted Checkout</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <Truck className="w-4 h-4 text-amber-800 shrink-0" />
                <span>Handpacked with Signature Packaging</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}