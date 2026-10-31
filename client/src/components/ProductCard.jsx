import { Eye, ShoppingBag, Star } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import useAuthStore from "../store/authStore";
import useCartStore from "../store/cartStore";

export default function ProductCard({ product }) {
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items); // ✅ Get cart items
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!product) return null;

  const mainImage = product.images?.[0] || "/images/placeholder.jpg";
  const secondaryImage = product.images?.[1] || mainImage;

  // ✅ Check if this specific product is already in the cart
  const cartItem = cartItems.find((item) => item.product_id === product._id);
  const isInCart = !!cartItem;
  const qtyInCart = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    // ✅ If already in cart, navigate to cart instead of adding again
    if (isInCart) {
      navigate("/cart");
      return;
    }

    addItem(product);
  };

  const isObjectId = (str) =>
    typeof str === "string" && /^[0-9a-fA-F]{24}$/.test(str);

  return (
    <div className="group relative bg-white border border-stone-200/80 rounded-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-amber-200/60 flex flex-col justify-between">
      <div>
        {/* Image Container with Dual Image Swap */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-100">
          <Link to={`/product/${product._id}`} className="block w-full h-full">
            <img
              src={mainImage}
              alt={product.name}
              className={`w-full h-full object-cover object-top transition-all duration-700 ease-out group-hover:scale-105 ${
                product.images?.[1] ? "group-hover:opacity-0" : ""
              }`}
            />
            {product.images?.[1] && (
              <img
                src={secondaryImage}
                alt={`${product.name} alternate view`}
                className="absolute inset-0 w-full h-full object-cover object-top opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-105"
              />
            )}
          </Link>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {product.discount > 0 && (
              <span className="bg-stone-900 text-amber-200 text-[10px] font-medium tracking-widest uppercase px-2.5 py-1 shadow-sm">
                -{product.discount}%
              </span>
            )}
            {product.isNewArrival && (
              <span className="bg-amber-100 text-amber-900 text-[10px] font-medium tracking-widest uppercase px-2.5 py-1 shadow-sm">
                New
              </span>
            )}
          </div>

          {/* Quick Action Floating Icons */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            <Link
              to={`/product/${product._id}`}
              aria-label="Quick View"
              className="p-2 rounded-full bg-white/90 text-stone-700 hover:bg-stone-900 hover:text-white backdrop-blur-md transition-colors shadow-sm"
            >
              <Eye className="w-4 h-4" />
            </Link>
          </div>

          {/* Quick Add to Cart Overlay Button */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-stone-950/60 to-transparent transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out flex justify-center">
            <button
              onClick={handleAddToCart}
              className={`w-full py-2.5 px-4 text-xs font-medium tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
                isInCart
                  ? "bg-stone-900 text-white hover:bg-amber-900" // ✅ Darker style when in cart
                  : "bg-white text-stone-900 hover:bg-amber-100 shadow-md"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{isInCart ? `In Cart (${qtyInCart})` : "Quick Add"}</span>
            </button>
          </div>
        </div>

        {/* Product Info Section */}
        <div className="p-4 space-y-2">
          {product.category && !isObjectId(product.category) && (
            <span className="text-[11px] tracking-widest uppercase text-amber-800/80 font-medium block">
              {product.category}
            </span>
          )}

          <Link to={`/product/${product._id}`} className="block group/title">
            <h3 className="font-serif text-base text-stone-900 line-clamp-1 group-hover/title:text-amber-800 transition-colors font-medium">
              {product.name}
            </h3>
          </Link>

          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="text-xs text-stone-600 font-medium">
              {product.rating ? Number(product.rating).toFixed(1) : "5.0"}
            </span>
            <span className="text-xs text-stone-400 font-light">
              ({product.numReviews || 0})
            </span>
          </div>
        </div>
      </div>

      {/* Price & Primary CTA Footer */}
      <div className="px-4 pb-4 pt-1 flex items-center justify-between border-t border-stone-100 mt-2">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-stone-900">
            ₹{product.price?.toLocaleString("en-IN")}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs text-stone-400 line-through font-light">
              ₹{product.originalPrice?.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          className={`text-xs font-semibold tracking-wider transition-colors uppercase border-b pb-0.5 ${
            isInCart
              ? "text-stone-900 border-stone-900" // ✅ Solid style when in cart
              : "text-amber-900 hover:text-stone-900 border-amber-900/40 hover:border-stone-900"
          }`}
        >
          {isInCart ? `In Cart (${qtyInCart})` : "+ Add"}
        </button>
      </div>
    </div>
  );
}
