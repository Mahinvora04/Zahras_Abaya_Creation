import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Download, MapPin, Package, UserRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import api from '../../api/axios';
import createInvoicePdf from '../../utils/createInvoicePdf';

const statuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const payments = ['pending', 'paid', 'failed', 'refunded'];
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function AdminOrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/orders/${id}`);
      setOrder(data.order);
      setCustomer(data.customer);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not load this order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const updateOrder = async (patch) => {
    if (!order) return;
    setSaving(true);
    setNotice('');
    try {
      const { data } = await api.patch(`/admin/orders/${id}`, {
        status: patch.status ?? order.status,
        payment_status: patch.payment_status ?? order.payment_status,
      });
      setOrder(data.order);
      setNotice('Order updated.');
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not update this order.');
    } finally {
      setSaving(false);
    }
  };

  const downloadInvoice = () => {
    try {
      createInvoicePdf(order, customer);
    } catch (downloadError) {
      setError('Could not generate the invoice PDF. Please try again.');
    }
  };

  const address = order?.shipping_address || {};
  return (
    <div className="flex min-h-screen bg-stone-50 text-stone-900">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
        <Link to="/admin/orders" className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-wider text-stone-600 hover:text-amber-900"><ArrowLeft size={15} />Back to orders</Link>
        {error && <div role="alert" className="mb-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {notice && <div role="status" className="mb-5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
        {loading ? <p className="py-16 text-center text-sm text-stone-500">Loading order…</p> : order && <>
          <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[10px] uppercase tracking-[.25em] text-amber-800">Order details</p><h1 className="font-serif text-3xl">{order.order_number}</h1><p className="mt-2 text-sm text-stone-500">Placed {order.created_at ? new Date(order.created_at).toLocaleString() : 'date unavailable'}</p></div><div className="flex flex-wrap items-center gap-4"><button type="button" onClick={downloadInvoice} className="inline-flex items-center gap-2 border border-stone-300 bg-white px-4 py-3 text-xs font-medium uppercase tracking-wider text-stone-800 hover:border-amber-800 hover:text-amber-900"><Download size={15} />Download invoice PDF</button><p className="font-serif text-2xl">{money(order.total)}</p></div></header>

          <section className="mb-5 grid gap-5 lg:grid-cols-2">
            <article className="border border-stone-200 bg-white p-5 sm:p-6"><div className="mb-5 flex items-center gap-2"><UserRound size={17} className="text-amber-900" /><h2 className="font-serif text-xl">Customer</h2></div><dl className="space-y-3 text-sm"><div><dt className="text-xs uppercase tracking-wider text-stone-500">Name</dt><dd className="mt-1">{customer?._id ? <Link to={`/admin/customers/${customer._id}/orders`} className="font-medium text-amber-900 hover:underline">{customer.name || 'Customer'} · View order history</Link> : customer?.name || 'Customer'}</dd></div><div><dt className="text-xs uppercase tracking-wider text-stone-500">Email</dt><dd className="mt-1">{customer?.email || 'Not provided'}</dd></div><div><dt className="text-xs uppercase tracking-wider text-stone-500">Phone</dt><dd className="mt-1">{customer?.phone || order.phone || 'Not provided'}</dd></div><div><dt className="text-xs uppercase tracking-wider text-stone-500">Customer ID</dt><dd className="mt-1 break-all text-xs text-stone-500">{customer?._id || order.user_id}</dd></div></dl></article>
            <article className="border border-stone-200 bg-white p-5 sm:p-6"><div className="mb-5 flex items-center gap-2"><MapPin size={17} className="text-amber-900" /><h2 className="font-serif text-xl">Shipping address</h2></div><div className="space-y-1 text-sm"><p className="font-medium">{address.label || 'Delivery address'}</p>{address.name && <p>{address.name}</p>}{address.address && <p>{address.address}</p>}<p>{[address.city, address.state, address.pincode].filter(Boolean).join(', ')}</p><p>{address.country}</p></div><div className="mt-5 border-t border-stone-100 pt-4"><p className="text-xs uppercase tracking-wider text-stone-500">Contact phone</p><p className="mt-1 text-sm">{order.phone || customer?.phone || 'Not provided'}</p></div></article>
          </section>

          <section className="mb-5 border border-stone-200 bg-white"><div className="flex items-center gap-2 border-b border-stone-100 p-5 sm:p-6"><Package size={17} className="text-amber-900" /><div><h2 className="font-serif text-xl">Products ordered</h2><p className="mt-1 text-xs text-stone-500">{order.items?.length || 0} line item{order.items?.length === 1 ? '' : 's'}</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500"><tr><th className="p-4">Product</th><th className="p-4">SKU</th><th className="p-4">Unit price</th><th className="p-4">Quantity</th><th className="p-4 text-right">Line total</th></tr></thead><tbody>{(order.items || []).map((item, index) => <tr key={`${item.product_id}-${index}`} className="border-t border-stone-100"><td className="p-4"><div className="flex items-center gap-3">{item.images?.[0] && <img src={item.images[0]} alt="" className="h-16 w-12 bg-stone-100 object-cover" />}<div><p className="font-medium">{item.product_name || 'Product'}</p><p className="mt-1 text-xs text-stone-500">{[item.color, item.size].filter(Boolean).join(' · ') || 'Standard variant'}</p></div></div></td><td className="p-4 text-xs text-stone-500">{item.sku || '—'}</td><td className="p-4">{money(item.price)}</td><td className="p-4">{item.quantity}</td><td className="p-4 text-right font-medium">{money(item.line_total ?? item.price * item.quantity)}</td></tr>)}</tbody></table></div><div className="ml-auto max-w-sm space-y-2 border-t border-stone-100 p-5 text-sm"><div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>{money(order.subtotal)}</span></div><div className="flex justify-between"><span className="text-stone-500">Shipping</span><span>{money(order.shipping_fee)}</span></div><div className="flex justify-between border-t border-stone-100 pt-3 font-medium"><span>Total</span><span>{money(order.total)}</span></div></div></section>

          <section className="border border-stone-200 bg-white p-5 sm:p-6"><h2 className="mb-5 font-serif text-xl">Fulfilment and payment</h2><p className="mb-5 text-sm text-stone-600">Payment method: <span className="font-medium text-stone-900">{order.payment_method === 'upi' ? 'UPI paid online' : order.payment_method === 'on_delivery' ? 'Cash/UPI on delivery' : 'Not specified'}</span></p><div className="grid gap-5 sm:grid-cols-2"><label className="text-xs uppercase tracking-wider text-stone-500">Order status<select disabled={saving} value={order.status} onChange={(event) => updateOrder({ status: event.target.value })} className="mt-2 block w-full border border-stone-300 bg-white px-3 py-3 text-sm capitalize text-stone-900 disabled:opacity-50">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label className="text-xs uppercase tracking-wider text-stone-500">Payment status<select disabled={saving} value={order.payment_status || 'pending'} onChange={(event) => updateOrder({ payment_status: event.target.value })} className="mt-2 block w-full border border-stone-300 bg-white px-3 py-3 text-sm capitalize text-stone-900 disabled:opacity-50">{payments.map((payment) => <option key={payment} value={payment}>{payment}</option>)}</select></label></div><p className="mt-4 text-xs text-stone-400">Last updated {order.updated_at ? new Date(order.updated_at).toLocaleString() : '—'}</p></section>
        </>}
      </main>
    </div>
  );
}
