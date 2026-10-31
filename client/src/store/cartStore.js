import api from "../api/axios";
import { create } from "zustand";

const useCartStore = create((set, get) => ({
  items: [],
  cartId: null,
  loading: false,
  error: null,

  // Fetch cart from MongoDB
  fetchCart: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get("/cart");
      set({
        items: data.cart.items || [],
        cartId: data.cart._id,
        loading: false,
      });
    } catch (err) {
      console.error("Fetch cart error:", err);
      set({ error: "Failed to load cart", loading: false });
    }
  },

  // Add item to cart (syncs with MongoDB)
  addItem: async (product) => {
    set({ loading: true, error: null });
    try {
      await api.post("/cart/items", {
        product_id: product._id,
        quantity: 1,
        selectedVariant: product.selectedVariant || null,
      });

      // Refresh cart from DB
      await get().fetchCart();

      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to add item";
      set({ error: msg, loading: false });
      return { success: false, message: msg };
    }
  },

  // Update item quantity
  updateQty: async (productId, quantity) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/cart/items/${productId}`, { quantity });
      await get().fetchCart();
    } catch (err) {
      set({ error: "Failed to update quantity", loading: false });
    }
  },

  // Remove item
  removeItem: async (productId) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/cart/items/${productId}`);
      await get().fetchCart();
    } catch (err) {
      set({ error: "Failed to remove item", loading: false });
    }
  },

  // Clear entire cart
  clearCart: async () => {
    set({ loading: true, error: null });
    try {
      await api.delete("/cart");
      await get().fetchCart();
    } catch (err) {
      set({ error: "Failed to clear cart", loading: false });
    }
  },

  // Get total price
  getTotal: () => {
    return get().items.reduce((total, item) => {
      const price = item.product?.price || item.price || 0;
      return total + price * item.quantity;
    }, 0);
  },

  // Get total items count
  getTotalItems: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },

  updateVariant: async (productId, variant) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/api/cart/items/${productId}`, {
        selectedVariant: variant,
      });
      await get().fetchCart(); // Refresh to get updated prices/data
    } catch (err) {
      console.error("Update variant error:", err);
      set({ error: "Failed to update variant", loading: false });
    }
  },
}));

export default useCartStore;
