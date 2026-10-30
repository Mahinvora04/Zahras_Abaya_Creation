import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminSidebar from '../../components/AdminSidebar';
import useProductStore from '../../store/productStore';

const categories = ['Abaya', 'Hijab', 'Kaftan', 'Jilbab', 'Accessories'];

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { createProduct, updateProduct, currentProduct, fetchProduct } = useProductStore();

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    category: 'Abaya',
    images: [''],
    stock: '',
    discount: '',
    featured: false,
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchProduct(id).then(() => {
        const p = useProductStore.getState().currentProduct;
        if (p) {
          setForm({
            name: p.name,
            description: p.description,
            price: p.price,
            originalPrice: p.originalPrice || '',
            category: p.category,
            images: p.images,
            stock: p.stock,
            discount: p.discount || '',
            featured: p.featured,
          });
        }
      });
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = {
      ...form,
      price: Number(form.price),
      originalPrice: Number(form.originalPrice) || undefined,
      stock: Number(form.stock),
      discount: Number(form.discount) || 0,
    };

    const res = isEdit
      ? await updateProduct(id, data)
      : await createProduct(data);

    setLoading(false);
    if (res.success) {
      setMsg(isEdit ? 'Updated!' : 'Created!');
      setTimeout(() => navigate('/admin/products'), 1000);
    } else {
      setMsg(res.message);
    }
  };

  const addImageField = () => setForm({ ...form, images: [...form.images, ''] });
  const removeImageField = (i) => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) });
  const updateImage = (i, val) => {
    const imgs = [...form.images];
    imgs[i] = val;
    setForm({ ...form, images: imgs });
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">{isEdit ? 'Edit' : 'Add'} Product</h1>
        {msg && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{msg}</div>}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price *</label>
              <input
                required
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Original Price</label>
              <input
                type="number"
                value={form.originalPrice}
                onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stock *</label>
              <input
                required
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Discount %</label>
              <input
                type="number"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  className="w-4 h-4"
                />
                Featured Product
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Images (URLs) *</label>
            {form.images.map((img, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  required
                  value={img}
                  onChange={(e) => updateImage(i, e.target.value)}
                  placeholder="https://placehold.co/600x800"
                  className="flex-1 border rounded px-3 py-2"
                />
                {form.images.length > 1 && (
                  <button type="button" onClick={() => removeImageField(i)} className="text-red-500">
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addImageField} className="text-sm text-purple-600 hover:underline">
              + Add Image
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => navigate('/admin/products')} className="bg-gray-300 px-6 py-2 rounded">
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}