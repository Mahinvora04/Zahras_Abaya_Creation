import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import api from '../../api/axios';

const statuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const payments = ['pending', 'paid', 'failed', 'refunded'];
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/orders');
      setOrders(data.orders);
      setError('');
    } catch {
      setError('Could not load orders. Please refresh and try again.');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const updateOrder = async (order, patch) => {
    setBusyId(order._id);
    try {
      const { data } = await api.patch(`/admin/orders/${order._id}`, {
        status: patch.status ?? order.status,
        payment_status: patch.payment_status ?? order.payment_status,
      });
      setOrders((current) => current.map((item) => item._id === order._id ? { ...item, ...data.order, customer: item.customer } : item));
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not update this order.');
    } finally {
      setBusyId('');
    }
  };

  const filtered = orders.filter((order) =>
    (filter === 'all' || order.status === filter) &&
    `${order.order_number} ${order.customer?.name} ${order.customer?.email} ${order.shipping_address?.city}`.toLowerCase().includes(query.toLowerCase()),
  );
  const openOrder = (orderId) => navigate(`/admin/orders/${orderId}`);

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900 md:flex-row">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[10px] uppercase tracking-[.25em] text-amber-800">Fulfilment</p><h1 className="font-serif text-3xl">Orders</h1><p className="mt-2 text-sm text-stone-500">Review purchases and keep customer orders up to date.</p></div><button onClick={load} className="flex items-center gap-2 border border-stone-300 bg-white px-4 py-3 text-xs uppercase tracking-wider"><RefreshCw size={14} />Refresh</button></div>
        {error && <div role="alert" className="mb-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        <section className="border border-stone-200 bg-white">
          <div className="flex flex-wrap justify-between gap-3 border-b border-stone-100 p-4 sm:p-5"><label className="relative min-w-48 max-w-md flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order, customer, location" className="w-full border border-stone-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-amber-800" /></label><select value={filter} onChange={(event) => setFilter(event.target.value)} className="border border-stone-200 bg-white px-3 py-2 text-sm"><option value="all">All order statuses</option>{statuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500"><tr><th className="p-4">Order</th><th className="p-4">Customer</th><th className="p-4">Items</th><th className="p-4">Total</th><th className="p-4">Fulfilment</th><th className="p-4">Payment</th></tr></thead><tbody>
            {filtered.map((order) => <tr key={order._id} role="link" tabIndex={0} aria-label={`View order ${order.order_number}`} onClick={() => openOrder(order._id)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openOrder(order._id); } }} className="cursor-pointer border-t border-stone-100 align-top hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-700">
              <td className="p-4"><b>{order.order_number}</b><p className="mt-1 text-xs text-stone-500">{order.created_at ? new Date(order.created_at).toLocaleString() : '—'}</p><span className="mt-2 inline-block text-[10px] uppercase tracking-wider text-amber-900">View details →</span></td>
              <td className="p-4"><b>{order.customer?.name || 'Customer'}</b><p className="text-xs text-stone-500">{order.customer?.email}</p><p className="mt-1 text-xs text-stone-500">{order.shipping_address?.city}{order.shipping_address?.country ? `, ${order.shipping_address.country}` : ''}</p></td>
              <td className="p-4">{(order.items || []).map((item, index) => <div key={`${item.product_id}-${index}`} className="mb-1 text-xs">{item.quantity} × {item.product_name}{item.size ? ` · ${item.size}` : ''}</div>)}</td>
              <td className="p-4 font-medium">{money(order.total)}</td>
              <td className="p-4"><select disabled={busyId === order._id} value={order.status} onClick={(event) => event.stopPropagation()} onChange={(event) => updateOrder(order, { status: event.target.value })} className="border border-stone-200 bg-white px-2 py-2 text-xs capitalize disabled:opacity-50">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></td>
              <td className="p-4"><select disabled={busyId === order._id} value={order.payment_status || 'pending'} onClick={(event) => event.stopPropagation()} onChange={(event) => updateOrder(order, { payment_status: event.target.value })} className="border border-stone-200 bg-white px-2 py-2 text-xs capitalize disabled:opacity-50">{payments.map((payment) => <option key={payment} value={payment}>{payment}</option>)}</select></td>
            </tr>)}
            {!filtered.length && <tr><td colSpan={6} className="p-10 text-center text-stone-500">{orders.length ? 'No orders match this search.' : 'No orders to show yet.'}</td></tr>}
          </tbody></table></div>
        </section>
      </main>
    </div>
  );
}
