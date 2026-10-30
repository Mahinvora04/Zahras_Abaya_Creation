import api from '../api/axios';
import { create } from 'zustand';

const useContentStore = create((set) => ({
  slides: [],
  categories: [],
  features: [],
  loading: false,

  fetchHomepageContent: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/content/homepage');
      set({ 
        slides: data.data.slides, 
        categories: data.data.categories, 
        features: data.data.features,
        loading: false 
      });
    } catch (err) {
      console.error('Failed to fetch homepage content', err);
      set({ loading: false });
    }
  },
}));

export default useContentStore;