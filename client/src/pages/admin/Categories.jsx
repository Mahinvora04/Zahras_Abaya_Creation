import { useCallback, useEffect, useState } from 'react';
import { ImageUp, Plus, Tags, Trash2 } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import api from '../../api/axios';
import mediaUrl from '../../utils/mediaUrl';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [uploadingId, setUploadingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/categories');
      setCategories(data.categories || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadCategories(); }, [loadCategories]);

  const addCategory = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.post('/admin/categories', { name: name.trim() });
      setCategories((items) => [...items, data.category].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      setName('');
      setNotice('Category added.');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not add category.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (category) => {
    if (!window.confirm(`Delete the “${category.name}” category?`)) return;
    setBusyId(category._id);
    setError('');
    setNotice('');
    try {
      await api.delete(`/admin/categories/${category._id}`);
      setCategories((items) => items.filter((item) => item._id !== category._id));
      setNotice('Category deleted.');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not delete category.');
    } finally {
      setBusyId('');
    }
  };

  const uploadCategoryImage = async (category, file) => {
    if (!file) return;
    setUploadingId(category._id);
    setError('');
    setNotice('');
    const body = new FormData();
    body.append('category_name', category.name);
    body.append('file', file);
    try {
      const { data: uploaded } = await api.post('/admin/uploads/categories', body, { headers: { 'Content-Type': undefined } });
      const origin = new URL(api.defaults.baseURL, window.location.origin).origin;
      const image = `${origin}${uploaded.image}`;
      const { data } = await api.put(`/admin/categories/${category._id}/image`, { image });
      setCategories((items) => items.map((item) => item._id === category._id ? data.category : item));
      setNotice(`Image updated for ${category.name}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not upload category image.');
    } finally {
      setUploadingId('');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900 md:flex-row"><AdminSidebar /><main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
      <div className="mb-7"><p className="mb-2 text-[10px] uppercase tracking-[.25em] text-amber-800">Catalogue</p><h1 className="font-serif text-3xl">Categories</h1><p className="mt-2 text-sm text-stone-500">Manage the categories shown in the storefront and product editor.</p></div>
      {error && <div role="alert" className="mb-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}{notice && <div role="status" className="mb-5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
      <form onSubmit={addCategory} className="mb-6 flex max-w-2xl flex-wrap gap-2 border border-stone-200 bg-white p-4 sm:p-5"><input required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="New category name" className="min-w-48 flex-1 border border-stone-300 px-3 py-3 text-sm" /><button disabled={saving} className="bg-stone-900 px-4 py-3 text-xs uppercase tracking-wider text-white disabled:opacity-50"><Plus size={15} className="mr-2 inline" />{saving ? 'Adding…' : 'Add category'}</button></form>
      <section className="max-w-4xl border border-stone-200 bg-white"><div className="border-b border-stone-100 p-5"><h2 className="font-serif text-xl">Existing categories</h2><p className="mt-1 text-xs text-stone-500">{categories.length} categories</p></div>{loading ? <p className="p-8 text-center text-sm text-stone-500">Loading categories…</p> : !categories.length ? <p className="p-8 text-center text-sm text-stone-500">No categories found. Add one above.</p> : <ul className="divide-y divide-stone-100">{categories.map((category) => <li key={category._id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:px-5"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden bg-stone-100">{category.image ? <img src={mediaUrl(category.image)} alt={`${category.name} category`} className="h-full w-full object-cover" /> : <Tags size={18} className="text-stone-400" />}</div><div className="min-w-0"><p className="truncate font-medium">{category.name}</p><p className="mt-1 text-xs text-stone-500">Store filter: {category.query || category.name}</p></div></div><div className="flex items-center gap-2"><label className={`cursor-pointer border border-stone-200 px-3 py-2 text-xs text-stone-700 hover:border-amber-800 ${uploadingId === category._id ? 'pointer-events-none opacity-50' : ''}`}><ImageUp size={14} className="mr-1 inline" />{uploadingId === category._id ? 'Uploading…' : category.image ? 'Change image' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploadingId)} onChange={(event) => { uploadCategoryImage(category, event.target.files?.[0]); event.target.value = ''; }} className="sr-only" /></label><button disabled={busyId === category._id || uploadingId === category._id} onClick={() => deleteCategory(category)} className="shrink-0 border border-stone-200 px-3 py-2 text-xs text-rose-700 hover:border-rose-300 disabled:opacity-50"><Trash2 size={14} className="mr-1 inline" />Delete</button></div></li>)}</ul>}</section>
    </main></div>
  );
}
