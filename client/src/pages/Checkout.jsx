import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  Truck,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Link } from "react-router-dom";
import useAuthStore from "../store/authStore";
import useCartStore from "../store/cartStore";

const SHIPPING_FEE = 99;

const EMPTY_ADDRESS = {
  label: "Home",
  address: "",
  pincode: "",
  city: "",
  state: "",
  country: "India",
  is_default: false,
};

export default function Checkout() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const addAddress = useAuthStore((state) => state.addAddress);

  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);

  const addresses = useMemo(() => user?.addresses || [], [user?.addresses]);

  const defaultAddress = addresses.find((address) => address.is_default);
  const [selectedAddressId, setSelectedAddressId] = useState(
    defaultAddress?._id || addresses[0]?._id || "",
  );
  const [phone, setPhone] = useState(user?.phone || "");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const subtotal = getTotal();
  const shipping = items.length > 0 ? SHIPPING_FEE : 0;
  const total = subtotal + shipping;

  const selectedAddress = useMemo(
    () => addresses.find((address) => address._id === selectedAddressId),
    [addresses, selectedAddressId],
  );

  const formatPrice = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const handleAddAddress = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    const result = await addAddress(newAddress);
    setSaving(false);

    if (!result.success) {
      setError(result.message || "Could not save this address.");
      return;
    }

    const updatedUser = useAuthStore.getState().user;
    const savedAddresses = updatedUser?.addresses || [];
    const newestAddress = [...savedAddresses].reverse()[0];

    if (newestAddress?._id) setSelectedAddressId(newestAddress._id);
    setNewAddress(EMPTY_ADDRESS);
    setShowAddressForm(false);
    setMessage("Address saved to your account.");
  };

  const handleContinue = async () => {
    setError("");
    setMessage("");

    if (!selectedAddress) {
      setError("Please select a delivery address before continuing.");
      return;
    }

    if (!phone.trim()) {
      setError("Please add a phone number to your profile before continuing.");
      return;
    }

    if (phone.trim() !== (user?.phone || "")) {
      setSaving(true);
      const result = await updateProfile({ phone: phone.trim() });
      setSaving(false);

      if (!result.success) {
        setError(result.message || "Could not update your phone number.");
        return;
      }
    }

    setMessage(
      "Your checkout details are ready. Payment gateway integration is the next step.",
    );
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-stone-50/50 px-4">
        <div className="text-center">
          <p className="text-stone-700 mb-4">
            Please log in to continue checkout.
          </p>
          <Link
            to="/login"
            className="inline-flex bg-stone-900 text-white px-6 py-3 text-xs uppercase tracking-widest"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-stone-50/50 px-4 text-center">
        <Package className="w-10 h-10 text-amber-800 mb-4" />
        <h1 className="font-serif text-2xl text-stone-900 mb-3">
          Your cart is empty
        </h1>
        <Link
          to="/products"
          className="text-xs uppercase tracking-widest text-amber-900 underline"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-stone-500 hover:text-amber-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to cart
          </Link>
          <p className="text-xs font-medium tracking-[0.25em] text-amber-800 uppercase">
            Final Review
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif font-light text-stone-900 mt-2">
            Checkout
          </h1>
          <p className="text-sm text-stone-500 mt-2">
            Confirm your contact and delivery details before payment.
          </p>
        </div>

        {(error || message) && (
          <div
            className={`mb-6 rounded-sm border p-4 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
          >
            {error || message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            {/* Contact details */}
            <section className="bg-white border border-stone-200 rounded-sm p-6 sm:p-8">
              <div className="flex items-center gap-3 border-b border-stone-100 pb-4 mb-5">
                <User className="w-5 h-5 text-amber-800" />
                <h2 className="font-serif text-xl text-stone-900">
                  Contact information
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-stone-500 mb-2">
                    Full name
                  </label>
                  <input
                    value={user.name || ""}
                    readOnly
                    className="w-full px-3 py-3 text-sm bg-stone-100 border border-stone-200 rounded-sm text-stone-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-stone-500 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={user.email || ""}
                    readOnly
                    className="w-full px-3 py-3 text-sm bg-stone-100 border border-stone-200 rounded-sm text-stone-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase tracking-widest text-stone-500 mb-2">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full px-3 py-3 text-sm bg-white border border-stone-200 rounded-sm focus:outline-none focus:border-amber-800"
                  />
                  <p className="text-xs text-stone-400 mt-2">
                    This number is taken from your profile. Changes are saved to
                    your profile when you continue.
                  </p>
                </div>
              </div>
            </section>

            {/* Delivery address */}
            <section className="bg-white border border-stone-200 rounded-sm p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-amber-800" />
                  <h2 className="font-serif text-xl text-stone-900">
                    Delivery address
                  </h2>
                </div>
                {!showAddressForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(true)}
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-amber-900 hover:text-stone-900"
                  >
                    <Plus className="w-4 h-4" /> Add new
                  </button>
                )}
              </div>

              {addresses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((address) => {
                    const selected = selectedAddressId === address._id;
                    return (
                      <button
                        type="button"
                        key={address._id}
                        onClick={() => setSelectedAddressId(address._id)}
                        className={`text-left border rounded-sm p-4 transition ${selected ? "border-amber-800 bg-amber-50/40 ring-1 ring-amber-800" : "border-stone-200 hover:border-stone-400"}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-sm font-medium text-stone-900">
                            {address.label || "Address"}
                          </span>
                          <span className="flex items-center gap-2">
                            {address.is_default && (
                              <span className="text-[9px] uppercase tracking-widest text-amber-800">
                                Default
                              </span>
                            )}
                            {selected && (
                              <CheckCircle2 className="w-4 h-4 text-amber-800" />
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-stone-700 whitespace-pre-line">
                          {address.address}
                        </p>
                        <p className="text-xs text-stone-500 mt-2">
                          {address.city}, {address.state} {address.pincode}
                        </p>
                        <p className="text-xs text-stone-500">
                          {address.country}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-stone-500">
                  You have no saved addresses. Add a delivery address to
                  continue.
                </p>
              )}

              {showAddressForm && (
                <form
                  onSubmit={handleAddAddress}
                  className="mt-6 border-t border-stone-100 pt-5 space-y-4"
                >
                  <h3 className="font-serif text-lg text-stone-900">
                    Add a delivery address
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-stone-500 mb-2">
                        Address label
                      </label>
                      <select
                        value={newAddress.label}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            label: e.target.value,
                          })
                        }
                        className="w-full px-3 py-3 text-sm bg-white border border-stone-200 rounded-sm"
                      >
                        <option>Home</option>
                        <option>Office</option>
                        <option>Parents</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-stone-500 mb-2">
                        Pincode
                      </label>
                      <input
                        required
                        value={newAddress.pincode}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            pincode: e.target.value,
                          })
                        }
                        className="w-full px-3 py-3 text-sm border border-stone-200 rounded-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase tracking-widest text-stone-500 mb-2">
                        Full address
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={newAddress.address}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            address: e.target.value,
                          })
                        }
                        placeholder="House number, street, landmark"
                        className="w-full px-3 py-3 text-sm border border-stone-200 rounded-sm resize-none"
                      />
                    </div>
                    {["city", "state", "country"].map((field) => (
                      <div key={field}>
                        <label className="block text-[10px] uppercase tracking-widest text-stone-500 mb-2">
                          {field}
                        </label>
                        <input
                          required
                          value={newAddress[field]}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              [field]: e.target.value,
                            })
                          }
                          className="w-full px-3 py-3 text-sm border border-stone-200 rounded-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-stone-900 text-white px-5 py-3 text-[10px] uppercase tracking-widest disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save address"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddressForm(false);
                        setNewAddress(EMPTY_ADDRESS);
                      }}
                      className="border border-stone-300 text-stone-600 px-5 py-3 text-[10px] uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* Items being purchased */}
            <section className="bg-white border border-stone-200 rounded-sm p-6 sm:p-8">
              <div className="flex items-center gap-3 border-b border-stone-100 pb-4 mb-5">
                <Package className="w-5 h-5 text-amber-800" />
                <h2 className="font-serif text-xl text-stone-900">
                  Your items
                </h2>
              </div>
              <div className="space-y-6">
                {items.map((item) => {
                  const product = item.product || {};
                  const qty = item.quantity || 1;

                  // ✅ Use variant price if it exists, otherwise fallback to product price
                  const price =
                    item.selectedVariant?.price !== undefined
                      ? item.selectedVariant.price
                      : product.price || 0;

                  return (
                    <div
                      key={`${item.product_id}:${item.variant_id || "none"}`}
                      className="flex flex-col sm:flex-row gap-4 items-start sm:items-center border-b border-stone-100 pb-6 last:border-0 last:pb-0"
                    >
                      <img
                        src={product.images?.[0] || "/images/placeholder.jpg"}
                        alt={product.name}
                        className="w-20 h-24 object-cover object-top bg-stone-100 rounded-sm"
                      />
                      <div className="flex-1 min-w-0 space-y-3">
                        <h3 className="font-serif text-base text-stone-900">
                          {product.name}
                        </h3>

                        {/* Read-only item details */}
                        <div className="space-y-1 text-xs text-stone-500">
                          {item.selectedVariant && (
                            <p>
                              {item.selectedVariant.color} / {" "}
                              {item.selectedVariant.size}
                            </p>
                          )}
                          <p>Quantity: {qty}</p>
                        </div>
                      </div>

                      <div className="text-right sm:mt-0 mt-2">
                        <p className="text-sm font-medium text-stone-900">
                          {formatPrice(price * qty)}
                        </p>
                        {qty > 1 && (
                          <p className="text-[10px] text-stone-400">
                            {formatPrice(price)} each
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Order totals */}
          <aside className="bg-white border border-stone-200 rounded-sm p-6 sm:p-8 shadow-sm space-y-6 lg:sticky lg:top-28">
            <h2 className="font-serif text-xl text-stone-900 border-b border-stone-100 pb-4">
              Order summary
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Shipping</span>
                <span>{formatPrice(shipping)}</span>
              </div>
              <div className="border-t border-stone-200 pt-4 flex justify-between items-center">
                <span className="text-sm font-medium uppercase tracking-wider text-stone-900">
                  Total
                </span>
                <span className="text-xl font-semibold text-stone-900">
                  {formatPrice(total)}
                </span>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-5 space-y-3">
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <ShieldCheck className="w-4 h-4 text-amber-800" />
                Secure checkout
              </div>
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <Truck className="w-4 h-4 text-amber-800" />
                Signature packaging
              </div>
            </div>

            <button
              type="button"
              onClick={handleContinue}
              disabled={saving || !selectedAddress}
              className="w-full bg-stone-900 text-stone-100 hover:bg-amber-900 py-3.5 px-4 text-xs font-medium tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? "Saving details..." : "Confirm details"}
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] leading-relaxed text-stone-400 text-center">
              Your payment will begin after a payment provider is connected and
              your order details are securely prepared.
            </p>
            <Link
              to="/cart"
              className="block text-center text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-900"
            >
              Return to cart
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
