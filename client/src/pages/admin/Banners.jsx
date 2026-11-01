import { useCallback, useEffect, useState } from 'react';
import { Image, Plus, Save, Trash2, Upload } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import api from '../../api/axios';

const emptyBanner = (order = 0) => ({ title: '', image: '', tagline: '', subtitle: '', link: '/products', cta: 'Shop Now', order });
const categoryDestinations = [
  { label: 'All Products', value: '' },
  { label: 'Embroidered Abaya', value: 'Embroidered Abaya' },
  { label: 'Daily Wear Abaya', value: 'Daily Wear Abaya' },
  { label: 'Coat', value: 'Coat' },
  { label: 'Hijab', value: 'Hijab' },
];
const priceDestinations = [
  { label: 'Any price', min: '', max: '' },
  { label: 'Under ₹1,000', min: '', max: '1000' },
  { label: '₹1,000–₹2,500', min: '1000', max: '2500' },
  { label: '₹2,500–₹5,000', min: '2500', max: '5000' },
  { label: '₹5,000 and above', min: '5000', max: '' },
];
const buildProductLink = (category, priceRange, sort, featured) => {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (priceRange.min) params.set('minPrice', priceRange.min);
  if (priceRange.max) params.set('maxPrice', priceRange.max);
  if (sort) params.set('sort', sort);
  if (featured) params.set('featured', 'true');
  const query = params.toString();
  return query ? `/products?${query}` : '/products';
};

export default function AdminBanners() {
  const [slides, setSlides] = useState([]);
  const [newBanner, setNewBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [uploadingId, setUploadingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadBanners = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/slides');
      setSlides(data.slides || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not load storefront banners.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadBanners(); }, [loadBanners]);

  const updateBanner = (id, patch) => {
    if (id === 'new') setNewBanner((banner) => ({ ...banner, ...patch }));
    else setSlides((items) => items.map((banner) => banner._id === id ? { ...banner, ...patch } : banner));
  };

  const uploadBannerImage = async (id, file) => {
    if (!file) return;
    const banner = id === 'new' ? newBanner : slides.find((item) => item._id === id);
    if (!banner?.title?.trim()) {
      setError('Enter a banner title before uploading its image.');
      return;
    }
    setUploadingId(id);
    setError('');
    const body = new FormData();
    body.append('title', banner.title);
    body.append('file', file);
    try {
      const { data } = await api.post('/admin/uploads/banners', body, { headers: { 'Content-Type': undefined } });
      updateBanner(id, { image: data.image });
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not upload banner image.');
    } finally {
      setUploadingId('');
    }
  };

  const saveBanner = async (banner, id = banner._id || 'new') => {
    if (!banner.title?.trim() || !banner.image?.trim()) {
      setError('Each banner needs a title and image.');
      return;
    }
    if (!banner.link?.startsWith('/')) {
      setError('Use a storefront path for the banner button, such as /products.');
      return;
    }
    setSavingId(id);
    setError('');
    setNotice('');
    const payload = { ...banner, title: banner.title.trim(), image: banner.image.trim(), order: Number(banner.order) || 0 };
    try {
      if (id === 'new') {
        const { data } = await api.post('/admin/slides', payload);
        setSlides((items) => [...items, data.slide].sort((a, b) => a.order - b.order));
        setNewBanner(null);
      } else {
        const { data } = await api.put(`/admin/slides/${id}`, payload);
        setSlides((items) => items.map((item) => item._id === id ? data.slide : item).sort((a, b) => a.order - b.order));
      }
      setNotice('Banner saved.');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not save banner.');
    } finally {
      setSavingId('');
    }
  };

  const deleteBanner = async (banner) => {
    if (!window.confirm(`Delete the “${banner.title}” banner?`)) return;
    setSavingId(banner._id);
    setError('');
    setNotice('');
    try {
      await api.delete(`/admin/slides/${banner._id}`);
      setSlides((items) => items.filter((item) => item._id !== banner._id));
      setNotice('Banner deleted.');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not delete banner.');
    } finally {
      setSavingId('');
    }
  };

  const changeBannerOrder = async (banner, order) => {
    setSavingId(banner._id);
    setError('');
    setNotice('');
    try {
      const { data } = await api.put(`/admin/slides/${banner._id}/order`, { order: Number(order) });
      const orderById = new Map((data.slides || []).map((item) => [item._id, item.order]));
      setSlides((items) => items.map((item) => ({ ...item, order: orderById.get(item._id) ?? item.order })).sort((a, b) => a.order - b.order));
      setNotice('Banner display order updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not update banner order.');
    } finally {
      setSavingId('');
    }
  };

  const renderBannerEditor = (banner, id, onCancel) => {
    const params = new URLSearchParams((banner.link || '').split('?')[1] || '');
    const selectedCategory = params.get('category') || '';
    const selectedPriceRange = priceDestinations.find((range) =>
      range.min === (params.get('minPrice') || '') && range.max === (params.get('maxPrice') || ''),
    ) || priceDestinations[0];
    const selectedSort = params.get('sort') || '';
    const selectedFeatured = params.get('featured') === 'true';
    const updateDestination = (category, priceRange, sort = selectedSort, featured = selectedFeatured) => updateBanner(id, { link: buildProductLink(category, priceRange, sort, featured) });
    const selectedProductFilter = selectedFeatured ? 'featured' : selectedSort === 'newest' ? 'newest' : selectedCategory;
    const changeProductFilter = (value) => {
      const category = categoryDestinations.some((destination) => destination.value === value) ? value : '';
      updateBanner(id, { link: buildProductLink(category, selectedPriceRange, value === 'newest' ? 'newest' : '', value === 'featured') });
    };

    return (
    <article className="border border-stone-200 bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2"><Image size={17} className="text-amber-900" /><h2 className="font-serif text-xl">{id === 'new' ? 'New storefront banner' : `Banner ${Number(banner.order) + 1}`}</h2></div>{onCancel && <button type="button" onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-900">Cancel</button>}</div>
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <div><div className="aspect-[4/3] overflow-hidden bg-stone-100">{banner.image ? <img src={banner.image} alt={banner.title || 'Banner preview'} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-stone-400">Banner preview</div>}</div><label className={`mt-3 inline-flex cursor-pointer items-center gap-2 border border-stone-300 px-3 py-2 text-xs uppercase tracking-wider hover:border-amber-800 ${uploadingId === id ? 'pointer-events-none opacity-50' : ''}`}><Upload size={14} />{uploadingId === id ? 'Uploading…' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploadingId)} onChange={(event) => { uploadBannerImage(id, event.target.files?.[0]); event.target.value = ''; }} className="sr-only" /></label><p className="mt-2 text-[10px] text-stone-400">JPG, PNG or WebP · max 8 MB</p></div>
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <label className="text-xs uppercase tracking-wider text-stone-500">Banner title *<input value={banner.title || ''} onChange={(event) => updateBanner(id, { title: event.target.value })} className="mt-2 w-full border border-stone-300 px-3 py-2.5 text-sm normal-case tracking-normal text-stone-900" /></label>
          <label className="text-xs uppercase tracking-wider text-stone-500">Tagline<input value={banner.tagline || ''} onChange={(event) => updateBanner(id, { tagline: event.target.value })} className="mt-2 w-full border border-stone-300 px-3 py-2.5 text-sm normal-case tracking-normal text-stone-900" /></label>
          <label className="text-xs uppercase tracking-wider text-stone-500 sm:col-span-2">Subtitle<textarea rows={3} value={banner.subtitle || ''} onChange={(event) => updateBanner(id, { subtitle: event.target.value })} className="mt-2 w-full border border-stone-300 px-3 py-2.5 text-sm normal-case tracking-normal text-stone-900" /></label>
          <label className="text-xs uppercase tracking-wider text-stone-500">Button label<input value={banner.cta || ''} onChange={(event) => updateBanner(id, { cta: event.target.value })} className="mt-2 w-full border border-stone-300 px-3 py-2.5 text-sm normal-case tracking-normal text-stone-900" /></label>
          <label className="text-xs uppercase tracking-wider text-stone-500">Product filter<select value={selectedProductFilter} onChange={(event) => changeProductFilter(event.target.value)} className="mt-2 w-full border border-stone-300 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-stone-900">{categoryDestinations.map((destination) => <option key={destination.label} value={destination.value}>{destination.label}</option>)}<option value="newest">Newest Arrivals</option><option value="featured">Featured Products</option></select></label>
          <label className="text-xs uppercase tracking-wider text-stone-500">Price range<select value={priceDestinations.indexOf(selectedPriceRange)} onChange={(event) => updateDestination(selectedCategory, priceDestinations[Number(event.target.value)])} className="mt-2 w-full border border-stone-300 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-stone-900">{priceDestinations.map((range, index) => <option key={range.label} value={index}>{range.label}</option>)}</select></label>
          {id !== 'new' && <label className="text-xs uppercase tracking-wider text-stone-500">Display order<select disabled={Boolean(savingId)} value={Math.max(1, slides.findIndex((item) => item._id === id) + 1)} onChange={(event) => changeBannerOrder(banner, event.target.value)} className="mt-2 w-full border border-stone-300 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-stone-900 disabled:opacity-50">{slides.map((_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>}
          <div className="sm:col-span-2"><button type="button" disabled={savingId === id || uploadingId === id} onClick={() => saveBanner(banner, id)} className="bg-stone-900 px-4 py-3 text-xs uppercase tracking-wider text-white hover:bg-amber-900 disabled:opacity-50"><Save size={14} className="mr-2 inline" />{savingId === id ? 'Saving…' : 'Save banner'}</button>{id !== 'new' && <button type="button" disabled={savingId === id} onClick={() => deleteBanner(banner)} className="ml-3 border border-rose-200 px-4 py-3 text-xs uppercase tracking-wider text-rose-700 disabled:opacity-50"><Trash2 size={14} className="mr-2 inline" />Delete</button>}</div>
        </div>
      </div>
    </article>
    );
  };

  return (
    <div className="flex min-h-screen bg-stone-50 text-stone-900"><AdminSidebar /><main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[10px] uppercase tracking-[.25em] text-amber-800">Storefront</p><h1 className="font-serif text-3xl">Banners</h1><p className="mt-2 text-sm text-stone-500">Edit the homepage hero carousel images, text, links, and order.</p></div><button type="button" onClick={() => setNewBanner((current) => current ? null : emptyBanner(slides.length))} className="bg-stone-900 px-4 py-3 text-xs uppercase tracking-wider text-white hover:bg-amber-900"><Plus size={15} className="mr-2 inline" />Add banner</button></div>
      {error && <div role="alert" className="mb-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}{notice && <div role="status" className="mb-5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
      <div className="space-y-5">{newBanner && renderBannerEditor(newBanner, 'new', () => setNewBanner(null))}{loading ? <p className="border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">Loading banners…</p> : slides.length ? slides.map((banner) => <div key={banner._id}>{renderBannerEditor(banner, banner._id)}</div>) : !newBanner && <p className="border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">No banners yet. Add one to populate the homepage carousel.</p>}</div>
    </main></div>
  );
}
