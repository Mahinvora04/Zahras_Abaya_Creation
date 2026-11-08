import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import AdminSidebar from '../../components/AdminSidebar';
import useProductStore from '../../store/productStore';
import mediaUrl from '../../utils/mediaUrl';

const commonSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
const blankColor = () => ({ key: crypto.randomUUID(), color: '', colorHex: '#6b625d', sizes: [], price: '', originalPrice: '', description: '', images: [], isAvailable: true });
const skuPart = (value) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase();
const variantSku = (name, color, size) => [name, color, size].map(skuPart).filter(Boolean).join('-');

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { createProduct, updateProduct, fetchProduct } = useProductStore();
  const [form, setForm] = useState({ name: '', category: '', featured: false });
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryMessage, setCategoryMessage] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [colors, setColors] = useState([blankColor()]);
  const [extraSizes, setExtraSizes] = useState([]);
  const [newSize, setNewSize] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingKey, setUploadingKey] = useState('');
  const [deletingImage, setDeletingImage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadFormData = async () => {
      setCategoriesLoading(true);
      setCategoriesError('');
      try {
        if (isEdit) useProductStore.getState().clearCurrent();
        const [categoryResponse] = await Promise.all([
          api.get('/admin/categories'),
          isEdit ? fetchProduct(id, true) : Promise.resolve(),
        ]);
        if (cancelled) return;
        const loadedCategories = (categoryResponse.data.categories || []).filter((category) => category.name);
        setCategories(loadedCategories);
        if (isEdit) {
          const product = useProductStore.getState().currentProduct;
          if (!product) return;
          const selectedCategory = loadedCategories.find((category) =>
            category.name === product.category || category.query === product.category || category._id === product.category,
          );
          setForm({ name: product.name || '', category: selectedCategory?.name || '', featured: Boolean(product.featured) });
          const groups = new Map();
          (product.variants || []).forEach((variant) => {
            const name = variant.color || 'Default';
            if (!groups.has(name)) groups.set(name, { ...blankColor(), color: name, colorHex: variant.colorHex || '#6b625d', sizes: [], price: variant.price ?? '', originalPrice: variant.originalPrice ?? '', description: variant.description || '', images: variant.images || [], isAvailable: variant.isAvailable !== false, existingVariants: {} });
            const group = groups.get(name);
            if (variant.size && !group.sizes.includes(variant.size)) group.sizes.push(variant.size);
            group.existingVariants[variant.size || 'One Size'] = variant.variant_id;
          });
          const loadedColors = [...groups.values()];
          if (loadedColors.length) {
            setColors(loadedColors);
            const loadedSizes = loadedColors.flatMap((group) => group.sizes).filter((size) => !commonSizes.includes(size));
            setExtraSizes([...new Set(loadedSizes)]);
          }
        }
      } catch {
        if (!cancelled) setCategoriesError('Could not load categories from the database.');
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    };
    loadFormData();
    return () => { cancelled = true; };
  }, [fetchProduct, id, isEdit]);

  const sizeOptions = useMemo(() => [...commonSizes, ...extraSizes], [extraSizes]);
  const updateColor = (key, patch) => setColors((items) => items.map((item) => item.key === key ? { ...item, ...patch } : item));
  const toggleSize = (key, size) => setColors((items) => items.map((item) => item.key === key ? { ...item, sizes: item.sizes.includes(size) ? item.sizes.filter((value) => value !== size) : [...item.sizes, size] } : item));
  const addSize = () => {
    const size = newSize.trim();
    if (!size || sizeOptions.some((value) => value.toLowerCase() === size.toLowerCase())) return;
    setExtraSizes((items) => [...items, size]);
    setNewSize('');
  };

  const createCategory = async (event) => {
    event.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setCategorySaving(true);
    setCategoryMessage('');
    try {
      const { data } = await api.post('/admin/categories', { name });
      const createdName = data.category.name;
      setCategories((items) => [...items, data.category]);
      setForm((current) => ({ ...current, category: createdName }));
      setNewCategoryName('');
      setShowCategoryForm(false);
    } catch (error) {
      setCategoryMessage(error.response?.data?.detail || 'Could not create category.');
    } finally {
      setCategorySaving(false);
    }
  };

  const uploadImages = async (group, files) => {
    if (!files.length) return;
    if (!form.name.trim() || !group.color.trim()) {
      setMsg('Enter the product name and color before uploading images.');
      return;
    }
    setUploadingKey(group.key);
    setMsg('');
    const body = new FormData();
    body.append('product_name', form.name);
    body.append('color', group.color);
    files.forEach((file) => body.append('files', file));
    try {
      const { data } = await api.post('/admin/uploads/images', body, { headers: { 'Content-Type': undefined } });
      updateColor(group.key, { images: [...group.images, ...data.images] });
      setMsg(`${data.images.length} image${data.images.length === 1 ? '' : 's'} uploaded. Save the product to apply them to this variant.`);
    } catch (error) {
      setMsg(error.response?.data?.detail || 'Image upload failed. Please try another image.');
    } finally {
      setUploadingKey('');
    }
  };

  const removeImage = async (group, image, imageIndex) => {
    const imageKey = `${group.key}:${imageIndex}`;
    setDeletingImage(imageKey);
    setMsg('');
    try {
      await api.delete('/admin/uploads/images', { data: { image_url: image } });
      updateColor(group.key, { images: group.images.filter((_, index) => index !== imageIndex) });
    } catch (error) {
      setMsg(error.response?.data?.detail || 'Could not delete this image. Please try again.');
    } finally {
      setDeletingImage('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const invalidGroup = colors.find((group) => !group.color.trim() || !group.sizes.length || group.price === '');
    if (invalidGroup) { setMsg('Each color needs a name, price, and at least one selected size.'); return; }
    setLoading(true);
    const variants = colors.flatMap((group) => group.sizes.map((size) => ({
      variant_id: group.existingVariants?.[size],
      color: group.color.trim(),
      colorHex: group.colorHex,
      size,
      price: Number(group.price),
      originalPrice: Number(group.originalPrice) || undefined,
      description: group.description.trim(),
      images: group.images.map((image) => image.trim()).filter(Boolean),
      isAvailable: group.isAvailable,
    })));
    const payload = { ...form, variants };
    const result = isEdit ? await updateProduct(id, payload) : await createProduct(payload);
    setLoading(false);
    if (result.success) {
      setMsg(isEdit ? 'Product updated.' : 'Product created.');
      setTimeout(() => navigate('/admin/products'), 800);
    } else setMsg(result.message || 'Could not save the product.');
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900 md:flex-row">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
        <div className="mb-7"><p className="mb-2 text-[10px] uppercase tracking-[.25em] text-amber-800">Catalogue</p><h1 className="font-serif text-3xl">{isEdit ? 'Edit product' : 'Add product'}</h1><p className="mt-2 text-sm text-stone-500">Create color options and choose the sizes offered for each.</p></div>
        {msg && <div role="status" className="mb-5 border border-stone-200 bg-white p-3 text-sm">{msg}</div>}
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
          <section className="border border-stone-200 bg-white p-5 sm:p-6">
            <h2 className="mb-5 font-serif text-xl">Product details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs uppercase tracking-wider text-stone-600">Product name *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full border border-stone-300 px-3 py-3 text-sm normal-case tracking-normal" /></label>
              <label className="text-xs uppercase tracking-wider text-stone-600">Category *<select required disabled={categoriesLoading} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-2 w-full border border-stone-300 bg-white px-3 py-3 text-sm normal-case tracking-normal disabled:bg-stone-100"><option value="">{categoriesLoading ? 'Loading categories…' : 'Select a category'}</option>{categories.map((category) => <option key={category._id} value={category.name}>{category.name}</option>)}</select><button type="button" onClick={() => { setShowCategoryForm((open) => !open); setCategoryMessage(''); }} className="mt-2 text-xs text-amber-900 hover:underline">+ Add new category</button></label>
            </div>
            {categoriesError && <p role="alert" className="mt-2 text-sm text-rose-700">{categoriesError}</p>}
            {showCategoryForm && <div className="mt-4 flex max-w-lg flex-wrap gap-2"><input required maxLength={60} value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createCategory(e); } }} placeholder="New category name" className="min-w-0 flex-1 border border-stone-300 px-3 py-2 text-sm" /><button type="button" disabled={categorySaving} onClick={createCategory} className="bg-stone-900 px-4 py-2 text-xs uppercase tracking-wider text-white disabled:opacity-50">{categorySaving ? 'Adding…' : 'Add category'}</button><button type="button" onClick={() => setShowCategoryForm(false)} className="border border-stone-300 px-4 py-2 text-xs uppercase">Cancel</button></div>}
            {categoryMessage && <p role="alert" className="mt-2 text-sm text-rose-700">{categoryMessage}</p>}
            <label className="mt-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />Show as a featured product</label>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-serif text-xl">Colors and sizes</h2><p className="mt-1 text-xs text-stone-500">Each selected size becomes its own purchasable variant.</p></div><button type="button" onClick={() => setColors((items) => [...items, blankColor()])} className="border border-stone-300 bg-white px-3 py-2 text-xs uppercase tracking-wider hover:border-amber-800"><Plus size={14} className="mr-1 inline" />Add color</button></div>
            {colors.map((group, index) => (
              <article key={group.key} className="border border-stone-200 bg-white p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between"><h3 className="font-medium">Color option {index + 1}</h3>{colors.length > 1 && <button type="button" onClick={() => setColors((items) => items.filter((item) => item.key !== group.key))} className="text-xs text-rose-700 hover:underline"><Trash2 size={14} className="mr-1 inline" />Remove color</button>}</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs uppercase tracking-wider text-stone-600">Color name *<input required value={group.color} onChange={(e) => updateColor(group.key, { color: e.target.value })} placeholder="e.g. Midnight Olive" className="mt-2 w-full border border-stone-300 px-3 py-3 text-sm normal-case tracking-normal" /></label>
                  <label className="text-xs uppercase tracking-wider text-stone-600">Color swatch<input type="color" value={group.colorHex || '#6b625d'} onChange={(e) => updateColor(group.key, { colorHex: e.target.value })} className="mt-2 block h-11 w-full cursor-pointer border border-stone-300 bg-white p-1" /></label>
                </div>
                <div className="mt-5"><p className="mb-2 text-xs uppercase tracking-wider text-stone-600">Available sizes *</p><div className="flex flex-wrap gap-2">{sizeOptions.map((size) => <label key={size} className={`cursor-pointer border px-3 py-2 text-sm ${group.sizes.includes(size) ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-600'}`}><input type="checkbox" checked={group.sizes.includes(size)} onChange={() => toggleSize(group.key, size)} className="sr-only" />{size}</label>)}</div><div className="mt-3 flex max-w-sm gap-2"><input value={newSize} onChange={(e) => setNewSize(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSize(); } }} placeholder="Add a custom size" className="min-w-0 flex-1 border border-stone-300 px-3 py-2 text-sm" /><button type="button" onClick={addSize} className="border border-stone-300 px-3 text-xs uppercase">Add size</button></div></div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs uppercase tracking-wider text-stone-600">Price *<input required min="0" step="0.01" type="number" value={group.price} onChange={(e) => updateColor(group.key, { price: e.target.value })} className="mt-2 w-full border border-stone-300 px-3 py-3 text-sm normal-case tracking-normal" /></label>
                  <label className="text-xs uppercase tracking-wider text-stone-600">Original price<input min="0" step="0.01" type="number" value={group.originalPrice} onChange={(e) => updateColor(group.key, { originalPrice: e.target.value })} className="mt-2 w-full border border-stone-300 px-3 py-3 text-sm normal-case tracking-normal" /></label>
                </div>
                <div className="mt-4 border border-stone-100 bg-stone-50 p-3"><p className="mb-2 text-[10px] uppercase tracking-wider text-stone-500">Automatically generated SKUs</p><div className="flex flex-wrap gap-2">{group.sizes.length ? group.sizes.map((size) => <code key={size} className="bg-white px-2 py-1 text-[11px] text-stone-700">{variantSku(form.name, group.color, size)}</code>) : <span className="text-xs text-stone-400">Select sizes to preview SKUs</span>}</div></div>
                <label className="mt-4 block text-xs uppercase tracking-wider text-stone-600">Description<textarea rows={3} value={group.description} onChange={(e) => updateColor(group.key, { description: e.target.value })} className="mt-2 w-full border border-stone-300 px-3 py-3 text-sm normal-case tracking-normal" /></label>
                <div className="mt-5"><p className="mb-2 text-xs uppercase tracking-wider text-stone-600">Images for {group.color || 'this color'}</p><div className="flex flex-wrap items-center gap-3"><label className={`cursor-pointer border border-stone-300 px-3 py-2 text-xs uppercase tracking-wider hover:border-amber-800 ${uploadingKey === group.key ? 'pointer-events-none opacity-50' : ''}`}>{uploadingKey === group.key ? 'Uploading…' : 'Upload images'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={Boolean(uploadingKey)} onChange={(e) => { uploadImages(group, [...e.target.files]); e.target.value = ''; }} className="sr-only" /></label><span className="text-[11px] text-stone-400">JPG, PNG or WebP · max 8 MB each</span></div>{group.images.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{group.images.map((image, imageIndex) => <div key={`${image}-${imageIndex}`} className="relative"><img src={mediaUrl(image)} alt={`${group.color} product ${imageIndex + 1}`} className="h-20 w-16 border border-stone-200 bg-stone-100 object-cover" /><button type="button" aria-label="Remove image" disabled={Boolean(deletingImage)} onClick={() => removeImage(group, image, imageIndex)} className="absolute -right-2 -top-2 rounded-full bg-stone-900 p-1 text-white disabled:opacity-50">{deletingImage === `${group.key}:${imageIndex}` ? <span className="block h-3 w-3 animate-pulse" /> : <X size={12} />}</button></div>)}</div>}</div>
                <label className="mt-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={group.isAvailable} onChange={(e) => updateColor(group.key, { isAvailable: e.target.checked })} />Available to order in selected sizes</label>
                <p className="mt-4 text-xs text-stone-500">This color will create {group.sizes.length} variant{group.sizes.length === 1 ? '' : 's'}: {group.sizes.length ? group.sizes.join(', ') : 'select at least one size'}.</p>
              </article>
            ))}
          </section>
          <div className="flex gap-3"><button type="submit" disabled={loading || Boolean(uploadingKey)} className="bg-stone-900 px-6 py-3 text-xs uppercase tracking-wider text-white hover:bg-amber-900 disabled:opacity-50">{loading ? 'Saving…' : isEdit ? 'Save product' : 'Create product'}</button><button type="button" onClick={() => navigate('/admin/products')} className="border border-stone-300 bg-white px-6 py-3 text-xs uppercase tracking-wider">Cancel</button></div>
        </form>
      </main>
    </div>
  );
}
