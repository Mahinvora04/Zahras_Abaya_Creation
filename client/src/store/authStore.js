import api from '../api/axios';
import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,

  loadUser: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, loading: false, error: null });
    } catch (err) {
      set({ user: null, loading: false, error: null });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      set({ user: data.user, error: null });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Login failed';
      set({ error: msg });
      return { success: false, message: msg };
    }
  },

  register: async (name, email, password, phone) => {
    set({ error: null });
    try {
      const { data } = await api.post('/auth/register', { name, email, password, phone });
      set({ user: data.user, error: null });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Registration failed';
      set({ error: msg });
      return { success: false, message: msg };
    }
  },

  googleLogin: async (credential) => {
    set({ error: null });
    try {
      const { data } = await api.post('/auth/google', { credential });
      set({ user: data.user, error: null });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Google sign-in failed';
      set({ error: msg });
      return { success: false, message: msg };
    }
  },

  setError: (error) => set({ error }),

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore errors
    } finally {
      set({ user: null, error: null });
    }
  },

  clearError: () => set({ error: null }),

  // ==========================================
  // NEW: Profile & Address Actions
  // ==========================================
  updateProfile: async (profileData) => {
    try {
      const { data } = await api.put('/users/me', profileData);
      set({ user: data.user, error: null });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update profile';
      set({ error: msg });
      return { success: false, message: msg };
    }
  },

  addAddress: async (addressData) => {
    try {
      const { data } = await api.post('/users/me/addresses', addressData);
      set({ user: data.user, error: null });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to add address';
      set({ error: msg });
      return { success: false, message: msg };
    }
  },

  updateAddress: async (addressId, addressData) => {
    try {
      const { data } = await api.put(`/users/me/addresses/${addressId}`, addressData);
      set({ user: data.user, error: null });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update address';
      set({ error: msg });
      return { success: false, message: msg };
    }
  },

  deleteAddress: async (addressId) => {
    try {
      const { data } = await api.delete(`/users/me/addresses/${addressId}`);
      set({ user: data.user, error: null });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete address';
      set({ error: msg });
      return { success: false, message: msg };
    }
  },
}));

export default useAuthStore;
