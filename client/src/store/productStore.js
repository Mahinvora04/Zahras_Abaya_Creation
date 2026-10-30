import api from "../api/axios";
import { create } from "zustand";

const useProductStore = create((set, get) => ({
  products: [],
  featured: [],
  currentProduct: null,
  loading: false,
  error: null,

  fetchProducts: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(filters).toString();
      const { data } = await api.get(`/products?${params}`);
      set({ products: data.products, loading: false });
    } catch (err) {
      set({ error: "Failed to load products", loading: false });
    }
  },

  fetchFeatured: async () => {
    try {
      const { data } = await api.get("/products/featured");
      set({ featured: data.products });
    } catch (err) {
      console.error("Failed to load featured");
    }
  },

  fetchProduct: async (id) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/products/${id}`);
      set({ currentProduct: data.product, loading: false });
    } catch (err) {
      set({ error: "Product not found", loading: false });
    }
  },

  // Admin actions
  createProduct: async (productData) => {
    try {
      const { data } = await api.post("/admin/products", productData);
      return { success: true, product: data.product };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Failed",
      };
    }
  },

  updateProduct: async (id, productData) => {
    try {
      const { data } = await api.put(`/admin/products/${id}`, productData);
      return { success: true, product: data.product };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Failed",
      };
    }
  },

  deleteProduct: async (id) => {
    try {
      await api.delete(`/admin/products/${id}`);
      return { success: true };
    } catch (err) {
      return { success: false, message: "Failed to delete" };
    }
  },

  clearCurrent: () => set({ currentProduct: null }),
}));

export default useProductStore;
