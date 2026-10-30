import { create } from "zustand";

const useCartStore = create((set, get) => ({
  items: [],

  addItem: (product) => {
    const { items } = get();

    // Create a unique ID combining product ID and variant SKU (if exists)
    const variantId = product.selectedVariant?.sku || "default";
    const uniqueId = `${product._id}-${variantId}`;

    const existingIndex = items.findIndex((i) => i.uniqueId === uniqueId);

    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].qty += 1;
      set({ items: newItems });
    } else {
      set({
        items: [...items, { ...product, uniqueId, qty: 1 }],
      });
    }
  },

  removeItem: (uniqueId) => {
    set({ items: get().items.filter((i) => i.uniqueId !== uniqueId) });
  },

  updateQty: (uniqueId, qty) => {
    if (qty <= 0) {
      get().removeItem(uniqueId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.uniqueId === uniqueId ? { ...i, qty } : i,
      ),
    });
  },

  clearCart: () => set({ items: [] }),

  getTotal: () => {
    return get().items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0);
  },

  getCount: () => {
    return get().items.reduce((sum, i) => sum + i.qty, 0);
  },
}));

export default useCartStore;
