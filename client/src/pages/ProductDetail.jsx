import {
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import useAuthStore from "../store/authStore";
import useCartStore from "../store/cartStore";
import useProductStore from "../store/productStore";

// Main component handles fetching and loading states
export default function ProductDetail() {
  const { id } = useParams();
  const { currentProduct, fetchProduct, loading } = useProductStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProduct(id);
    return () => useProductStore.getState().clearCurrent();
  }, [id, fetchProduct]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-800"></div>
      </div>
    );
  }

  if (!currentProduct) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-serif text-stone-900 mb-4">
          Product Not Found
        </h2>
        <button
          onClick={() => navigate("/products")}
          className="text-amber-800 hover:underline"
        >
          ← Back to Shop
        </button>
      </div>
    );
  }

  // ✅ Render a child component with a `key`.
  // This forces React to completely unmount and remount the component
  // when the product changes, naturally resetting all `useState` hooks
  // without needing any `useEffect` for initialization.
  return (
    <ProductDetailInner key={currentProduct._id} product={currentProduct} />
  );
}

// Child component handles the UI and local state
function ProductDetailInner({ product }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  // ✅ Safely find the first available variant for initial state
  const firstVariant =
    product.variants?.find((v) => v.isAvailable) || product.variants?.[0];

  // ✅ Initialize state directly from props. No useEffect needed!
  const [selectedColor, setSelectedColor] = useState(
    firstVariant?.color || null,
  );
  const [selectedSize, setSelectedSize] = useState(firstVariant?.size || null);
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState(
    firstVariant?.images?.[0] || product.images?.[0] || "",
  );
  const [isAdding, setIsAdding] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const isObjectId = (str) =>
    typeof str === "string" && /^[0-9a-fA-F]{24}$/.test(str);

  const hasVariants = product.variants && product.variants.length > 0;

  const selectedVariant = hasVariants
    ? product.variants.find(
        (v) => v.color === selectedColor && v.size === selectedSize,
      )
    : null;

  const displayPrice = selectedVariant?.price ?? product.price;
  const displayOriginalPrice = selectedVariant?.price
    ? (selectedVariant.originalPrice ?? product.originalPrice)
    : product.originalPrice;
  const displayStock = selectedVariant?.stock ?? product.stock;
  const isOutOfStock = displayStock <= 0;

  const availableColors = hasVariants
    ? [
        ...new Map(
          product.variants
            .filter((v) => v.isAvailable)
            .map((v) => [v.color, v]),
        ).values(),
      ]
    : [];

  const availableSizes = hasVariants
    ? product.variants
        .filter((v) => v.color === selectedColor && v.isAvailable)
        .map((v) => v.size)
    : product.variantOptions?.sizes || [];

  const handleColorSelect = (colorObj) => {
    setSelectedColor(colorObj.color);

    const sizesForThisColor = product.variants
      .filter((v) => v.color === colorObj.color && v.isAvailable)
      .map((v) => v.size);

    if (sizesForThisColor.length > 0) {
      setSelectedSize(sizesForThisColor[0]);
    }

    if (colorObj.images && colorObj.images.length > 0) {
      setMainImage(colorObj.images[0]);
    } else {
      setMainImage(product.images?.[0] || "");
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    if (isOutOfStock) return;

    if (hasVariants && !selectedSize) {
      alert("Please select a size before adding to cart.");
      return;
    }

    setIsAdding(true);
    setAddedToCart(false);

    const cartItem = {
      _id: product._id,
      name: product.name,
      price: displayPrice,
      images: product.images,
      selectedVariant: selectedVariant
        ? {
            variant_id: selectedVariant.variant_id,
            color: selectedVariant.color,
            size: selectedVariant.size,
            sku: selectedVariant.sku,
            price: selectedVariant.price,
          }
        : null,
    };

    const res = await useCartStore.getState().addItem(cartItem, quantity);

    setIsAdding(false);
    if (res.success) {
      setAddedToCart(true);
      window.setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-xs text-stone-500 mb-8 uppercase tracking-wider">
          <span
            className="hover:text-amber-800 cursor-pointer"
            onClick={() => navigate("/")}
          >
            Home
          </span>
          <span className="mx-2">/</span>
          <span
            className="hover:text-amber-800 cursor-pointer"
            onClick={() => navigate("/products")}
          >
            Shop
          </span>
          <span className="mx-2">/</span>
          <span className="text-stone-900 font-medium">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <div className="space-y-4">
            <div className="aspect-[3/4] w-full bg-stone-100 rounded-sm overflow-hidden relative group">
              <img
                src={mainImage}
                alt={product.name}
                className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
              />
              {product.discount > 0 && (
                <span className="absolute top-4 left-4 bg-stone-900 text-amber-200 text-xs font-medium tracking-widest uppercase px-3 py-1.5">
                  -{product.discount}% OFF
                </span>
              )}
            </div>

            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMainImage(img)}
                    className={`aspect-square bg-stone-100 rounded-sm overflow-hidden border-2 transition-all ${
                      mainImage === img
                        ? "border-amber-800"
                        : "border-transparent hover:border-stone-300"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            {!isObjectId(product.category) && (
              <span className="text-xs tracking-[0.2em] text-amber-800 uppercase font-medium mb-2">
                {product.category}
              </span>
            )}

            <h1 className="text-3xl md:text-4xl font-serif font-light text-stone-900 mb-4">
              {product.name}
            </h1>

            <div className="flex items-center gap-2 mb-6">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating || 5)
                        ? "fill-current"
                        : "text-stone-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-stone-600 font-medium">
                {product.rating || "5.0"}
              </span>
              <span className="text-sm text-stone-400">
                ({product.numReviews || 0} Reviews)
              </span>
            </div>

            <div className="flex items-baseline gap-3 mb-8 pb-8 border-b border-stone-200">
              <span className="text-3xl font-semibold text-stone-900">
                ₹{displayPrice?.toLocaleString("en-IN")}
              </span>
              {displayOriginalPrice && displayOriginalPrice > displayPrice && (
                <span className="text-lg text-stone-400 line-through font-light">
                  ₹{displayOriginalPrice.toLocaleString("en-IN")}
                </span>
              )}
            </div>

            {hasVariants && (
              <div className="space-y-6 mb-8">
                {availableColors.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-stone-900 mb-3 block">
                      Color:{" "}
                      <span className="text-stone-500 font-normal">
                        {selectedColor}
                      </span>
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {availableColors.map((colorObj) => (
                        <button
                          key={colorObj.color}
                          onClick={() => handleColorSelect(colorObj)}
                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedColor === colorObj.color
                              ? "border-amber-800 ring-2 ring-amber-800/20"
                              : "border-stone-200 hover:border-stone-400"
                          }`}
                          style={{
                            backgroundColor: colorObj.colorHex || "#ccc",
                          }}
                          title={colorObj.color}
                        >
                          {selectedColor === colorObj.color && (
                            <span className="w-2 h-2 bg-white rounded-full shadow-sm" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {availableSizes.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-stone-900 mb-3 block">
                      Size:{" "}
                      <span className="text-stone-500 font-normal">
                        {selectedSize || "Select a size"}
                      </span>
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {(product.variantOptions?.sizes || availableSizes).map(
                        (size) => {
                          const isAvailable = availableSizes.includes(size);
                          return (
                            <button
                              key={size}
                              onClick={() =>
                                isAvailable && setSelectedSize(size)
                              }
                              disabled={!isAvailable}
                              className={`min-w-[3rem] h-10 px-3 rounded-sm border text-sm font-medium transition-all ${
                                selectedSize === size
                                  ? "bg-stone-900 text-white border-stone-900"
                                  : isAvailable
                                    ? "bg-white text-stone-900 border-stone-300 hover:border-stone-900"
                                    : "bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed line-through"
                              }`}
                            >
                              {size}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <div className="flex items-center border border-stone-300 rounded-sm w-max">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-medium text-stone-900">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity(Math.min(displayStock, quantity + 1))
                  }
                  className="p-3 text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={
                  isOutOfStock ||
                  (hasVariants && !selectedSize) ||
                  isAdding
                }
                className={`flex-1 py-3.5 px-6 rounded-sm text-sm font-semibold tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${
                  isOutOfStock ||
                  (hasVariants && !selectedSize)
                    ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                    : isAdding
                      ? "bg-emerald-700 text-white"
                      : "bg-stone-900 text-white hover:bg-amber-800 shadow-lg hover:shadow-xl"
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                {isAdding
                  ? "Adding to Bag..."
                  : addedToCart
                    ? "Added to Bag"
                    : "Add to Bag"}
              </button>
            </div>

            <div className="prose prose-stone max-w-none mb-10">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-900 mb-3">
                Description
              </h3>
              <p className="text-stone-600 leading-relaxed font-light">
                {product.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-stone-200">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wide">
                    Free Shipping
                  </h4>
                  <p className="text-xs text-stone-500 mt-1">
                    On orders over ₹1500
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wide">
                    Secure Payment
                  </h4>
                  <p className="text-xs text-stone-500 mt-1">
                    100% secure checkout
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RotateCcw className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wide">
                    Easy Returns
                  </h4>
                  <p className="text-xs text-stone-500 mt-1">
                    30-day return policy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
