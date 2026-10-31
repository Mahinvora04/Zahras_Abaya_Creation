import api from "../api/axios";
import { create } from "zustand";

const useCartStore = create((set, get) => ({
  items: [],
  cartId: null,
  loading: false,
  error: null,

  fetchCart: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get("/cart");
      set({
        items: data.cart?.items || [],
        cartId: data.cart?._id || null,
        loading: false,
      });
    } catch (err) {
      console.error("Fetch cart error:", err);
      set({ error: "Failed to load cart", loading: false });
    }
  },

  addItem: async (product, qty = 1) => {
    set({ loading: true, error: null });
    try {
      await api.post("/cart/items", {
        product_id: product._id,
        quantity: Number(qty),
        selectedVariant: product.selectedVariant || null,
        variant_id: product.variant_id || product.selectedVariant?.variant_id || null,
      });
      await get().fetchCart();
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to add item";
      set({ error: msg, loading: false });
      return { success: false, message: msg };
    }
  },

  updateQty: async (productId, variantId, quantity) => {
    set({ loading: true, error: null });
    try {
      if (quantity <= 0) {
        await api.delete(`/cart/items/${productId}`, { params: { variant_id: variantId || undefined } });
      } else {
        await api.put(`/cart/items/${productId}`, {
          quantity: Number(quantity),
        }, { params: { variant_id: variantId || undefined } });
      }
      await get().fetchCart();
    } catch (err) {
      console.error("Update qty error:", err);
      set({ error: "Failed to update quantity", loading: false });
    }
  },

  removeItem: async (productId, variantId) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/cart/items/${productId}`, { params: { variant_id: variantId || undefined } });
      await get().fetchCart();
    } catch (err) {
      console.error("Remove item error:", err);
      set({ error: "Failed to remove item", loading: false });
    }
  },

  clearCart: async () => {
    set({ loading: true, error: null });
    try {
      await api.delete("/cart");
      await get().fetchCart();
    } catch (err) {
      set({ error: "Failed to clear cart", loading: false });
    }
  },

  getTotal: () => {
    return get().items.reduce((total, item) => {
      const price = item.selectedVariant?.price ?? item.price ?? 0;
      const qty = Number(item.quantity) || 0;
      return total + price * qty;
    }, 0);
  },

  getTotalItems: () => {
    return get().items.reduce(
      (count, item) => count + (Number(item.quantity) || 0),
      0,
    );
  },

  updateVariant: async (productId, currentVariantId, variant) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/cart/items/${productId}`, {
        selectedVariant: variant,
        variant_id: variant?.variant_id || null,
      }, { params: { variant_id: currentVariantId || undefined } });
      await get().fetchCart();
    } catch (err) {
      console.error("Update variant error:", err);
      set({ error: "Failed to update variant", loading: false });
    }
  },
}));

export default useCartStore;
