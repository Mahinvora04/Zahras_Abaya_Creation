import {
  Building2,
  Check,
  Edit2,
  Home,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import useAuthStore from "../store/authStore";

const INITIAL_ADDRESS_STATE = {
  label: "Home",
  address: "",
  pincode: "",
  city: "",
  state: "",
  country: "India",
  is_default: false,
};

export default function Profile() {
  const {
    user,
    loading: storeLoading,
    error: storeError,
    clearError,
    updateProfile,
    addAddress,
    updateAddress,
    deleteAddress,
  } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isEditing, setIsEditing] = useState(false);

  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(INITIAL_ADDRESS_STATE);

  // Sync profile form when user data loads from store
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 4000);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await updateProfile(profileForm);
    setIsSubmitting(false);
    if (result.success) {
      showMessage("success", "Profile updated successfully");
      setIsEditing(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    // Reset form to current user data when starting edit
    if (user) {
      setProfileForm({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to current user data when cancelling
    if (user) {
      setProfileForm({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = editingAddressId
      ? await updateAddress(editingAddressId, addressForm)
      : await addAddress(addressForm);

    setIsSubmitting(false);

    if (result.success) {
      showMessage(
        "success",
        editingAddressId
          ? "Address updated successfully"
          : "Address added successfully",
      );
      resetAddressForm();
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Are you sure you want to delete this address?"))
      return;
    setIsSubmitting(true);
    const result = await deleteAddress(addressId);
    setIsSubmitting(false);
    if (result.success) {
      showMessage("success", "Address deleted successfully");
    }
  };

  const startEditAddress = (addr) => {
    setAddressForm({
      label: addr.label || "Home",
      address: addr.address || "",
      pincode: addr.pincode || "",
      city: addr.city || "",
      state: addr.state || "",
      country: addr.country || "India",
      is_default: addr.is_default || false,
    });
    setEditingAddressId(addr._id);
    setShowAddressForm(true);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const resetAddressForm = () => {
    setAddressForm(INITIAL_ADDRESS_STATE);
    setEditingAddressId(null);
    setShowAddressForm(false);
  };

  if (storeLoading || !user) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-800" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-serif font-light text-stone-900">
            Account Settings
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage your personal information and delivery addresses
          </p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div
            className={`p-4 border rounded-sm text-xs flex items-center gap-3 transition-all ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {message.type === "success" ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <X className="w-4 h-4 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ---------------- LEFT COLUMN: Profile Info ---------------- */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-stone-200 rounded-sm p-6 shadow-sm sticky top-8">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-stone-100">
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-800 shrink-0">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-serif text-lg text-stone-900">
                    {user.name}
                  </h3>
                  <span className="text-[10px] uppercase tracking-widest text-stone-500 font-medium">
                    {user.role}
                  </span>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-medium tracking-widest uppercase text-stone-500 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, name: e.target.value })
                    }
                    disabled={!isEditing}
                    className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 focus:bg-white transition disabled:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium tracking-widest uppercase text-stone-500 mb-1.5 flex items-center gap-2">
                    <Mail className="w-3 h-3" /> Email Address
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3 py-2.5 text-sm bg-stone-100 border border-stone-200 rounded-sm text-stone-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-stone-400 mt-1.5">
                    Contact support to change your email
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-medium tracking-widest uppercase text-stone-500 mb-1.5 flex items-center gap-2">
                    <Phone className="w-3 h-3" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                    disabled={!isEditing}
                    className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 focus:bg-white transition disabled:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-500"
                  />
                </div>

                {!isEditing ? (
                  <button
                    type="button"
                    onClick={handleEditClick}
                    className="w-full border border-stone-300 text-stone-700 hover:bg-stone-50 py-3 px-4 text-[10px] font-medium tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 rounded-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-stone-900 text-stone-100 hover:bg-amber-900 py-3 px-4 text-[10px] font-medium tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 rounded-sm"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                      className="px-4 py-3 text-[10px] font-medium tracking-widest uppercase text-stone-600 border border-stone-200 hover:bg-stone-50 transition-all rounded-sm disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* ---------------- RIGHT COLUMN: Addresses ---------------- */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-light text-stone-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-800" /> Saved Addresses
              </h2>
              {!showAddressForm && (
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="inline-flex items-center gap-2 text-[10px] font-medium tracking-widest uppercase text-amber-800 hover:text-stone-900 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add New Address
                </button>
              )}
            </div>

            {/* Address Form (Add/Edit) */}
            {showAddressForm && (
              <form
                onSubmit={handleAddressSubmit}
                className="bg-white border border-stone-200 rounded-sm p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2"
              >
                <div className="flex justify-between items-center border-b border-stone-100 pb-3 mb-2">
                  <h3 className="text-sm font-medium text-stone-900">
                    {editingAddressId ? "Edit Address" : "Add New Address"}
                  </h3>
                  <button
                    type="button"
                    onClick={resetAddressForm}
                    className="text-stone-400 hover:text-stone-900 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-medium tracking-widest uppercase text-stone-500 mb-1">
                      Label
                    </label>
                    <select
                      value={addressForm.label}
                      onChange={(e) =>
                        setAddressForm({
                          ...addressForm,
                          label: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 transition"
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Parents">Parents</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-medium tracking-widest uppercase text-stone-500 mb-1">
                      Full Address
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={addressForm.address}
                      onChange={(e) =>
                        setAddressForm({
                          ...addressForm,
                          address: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 transition resize-none"
                      placeholder="House No., Street, Landmark"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium tracking-widest uppercase text-stone-500 mb-1">
                      Pincode
                    </label>
                    <input
                      required
                      type="text"
                      maxLength={6}
                      value={addressForm.pincode}
                      onChange={(e) =>
                        setAddressForm({
                          ...addressForm,
                          pincode: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 transition"
                      placeholder="e.g., 400001"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium tracking-widest uppercase text-stone-500 mb-1">
                      City
                    </label>
                    <input
                      required
                      type="text"
                      value={addressForm.city}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, city: e.target.value })
                      }
                      className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium tracking-widest uppercase text-stone-500 mb-1">
                      State
                    </label>
                    <input
                      required
                      type="text"
                      value={addressForm.state}
                      onChange={(e) =>
                        setAddressForm({
                          ...addressForm,
                          state: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium tracking-widest uppercase text-stone-500 mb-1">
                      Country
                    </label>
                    <input
                      required
                      type="text"
                      value={addressForm.country}
                      onChange={(e) =>
                        setAddressForm({
                          ...addressForm,
                          country: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 transition"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={addressForm.is_default}
                      onChange={(e) =>
                        setAddressForm({
                          ...addressForm,
                          is_default: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-amber-800 border-stone-300 rounded focus:ring-amber-800"
                    />
                    <label
                      htmlFor="is_default"
                      className="text-sm text-stone-700 cursor-pointer select-none"
                    >
                      Set as default delivery address
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-stone-100 mt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-stone-900 text-stone-100 hover:bg-amber-900 py-2.5 px-4 text-[10px] font-medium tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 rounded-sm"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {editingAddressId ? "Update Address" : "Save Address"}
                  </button>
                  <button
                    type="button"
                    onClick={resetAddressForm}
                    className="px-6 py-2.5 text-[10px] font-medium tracking-widest uppercase text-stone-600 border border-stone-200 hover:bg-stone-50 transition-all rounded-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Address List */}
            <div className="space-y-4">
              {user.addresses && user.addresses.length > 0 ? (
                user.addresses.map((addr) => (
                  <div
                    key={addr._id}
                    className="bg-white border border-stone-200 rounded-sm p-5 shadow-sm relative group hover:border-amber-200/50 transition-colors"
                  >
                    {addr.is_default && (
                      <span className="absolute top-4 right-4 text-[9px] font-bold tracking-widest uppercase text-amber-800 bg-amber-50 px-2 py-1 rounded-sm border border-amber-100">
                        Default
                      </span>
                    )}

                    <div className="flex items-start gap-3 mb-3">
                      {addr.label === "Home" ? (
                        <Home className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                      ) : (
                        <Building2 className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <h4 className="text-sm font-medium text-stone-900">
                          {addr.label}
                        </h4>
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed whitespace-pre-line">
                          {addr.address}
                        </p>
                        <p className="text-xs text-stone-500 mt-2">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        <p className="text-xs text-stone-500">{addr.country}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-stone-100">
                      <button
                        onClick={() => startEditAddress(addr)}
                        className="text-[10px] font-medium tracking-widest uppercase text-stone-600 hover:text-stone-900 flex items-center gap-1.5 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr._id)}
                        className="text-[10px] font-medium tracking-widest uppercase text-rose-600 hover:text-rose-800 flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white border border-dashed border-stone-300 rounded-sm p-8 text-center">
                  <MapPin className="w-8 h-8 text-stone-300 mx-auto mb-3" />
                  <p className="text-sm text-stone-500">
                    No addresses saved yet.
                  </p>
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="mt-3 text-[10px] font-medium tracking-widest uppercase text-amber-800 hover:text-stone-900 transition-colors"
                  >
                    Add your first address
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
