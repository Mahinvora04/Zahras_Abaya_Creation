import api from "../api/axios";
import { create } from "zustand";

const useProductStore = create((set, get) => ({
  products: [],
  availableFilters: { minPrice: 0, maxPrice: 10000, sizes: [], colors: [] },
  pagination: { currentPage: 1, totalPages: 1, totalCount: 0 }, // ✅ Added
  featured: [],
  currentProduct: null,
  loading: false,
  error: null,

  fetchProducts: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(
          ([_, value]) => value !== undefined && value !== null && value !== "",
        ),
      );

      const { data } = await api.get("/products", { params: cleanFilters });
      set({
        products: data.products,
        availableFilters: data.availableFilters || {
          minPrice: 0,
          maxPrice: 10000,
          sizes: [],
          colors: [],
        },
        pagination: {
          currentPage: data.currentPage || 1,
          totalPages: data.totalPages || 1,
          totalCount: data.totalCount || 0,
        },
        loading: false,
      });
    } catch (err) {
      console.error("Fetch products error:", err);
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

  fetchProduct: async (id, admin = false) => {
    set({ loading: true });
    try {
      const { data } = await api.get(admin ? `/admin/products/${id}` : `/products/${id}`);
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
