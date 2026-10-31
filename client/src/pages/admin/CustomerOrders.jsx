import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import api from '../../api/axios';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function AdminCustomerOrders() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/customers/${id}/orders`);
      setCustomer(data.customer);
      setOrders(data.orders);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not load customer order history.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);
  const lifetimeValue = orders.filter((order) => order.status !== 'cancelled').reduce((total, order) => total + Number(order.total || 0), 0);

  return (
    <div className="flex min-h-screen bg-stone-50 text-stone-900">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
        <Link to="/admin/orders" className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-wider text-stone-600 hover:text-amber-900"><ArrowLeft size={15} />Back to orders</Link>
        {error && <div role="alert" className="mb-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {loading ? <p className="py-16 text-center text-sm text-stone-500">Loading customer history…</p> : customer && <>
          <header className="mb-7"><p className="mb-2 text-[10px] uppercase tracking-[.25em] text-amber-800">Customer history</p><h1 className="font-serif text-3xl">{customer.name || 'Customer'}</h1><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500">{customer.email && <span className="inline-flex items-center gap-2"><Mail size={14} />{customer.email}</span>}{customer.phone && <span className="inline-flex items-center gap-2"><Phone size={14} />{customer.phone}</span>}</div></header>
          <div className="mb-6 grid gap-4 sm:grid-cols-2"><div className="border border-stone-200 bg-white p-5"><p className="text-xs uppercase tracking-wider text-stone-500">Total orders</p><p className="mt-3 font-serif text-3xl">{orders.length}</p></div><div className="border border-stone-200 bg-white p-5"><p className="text-xs uppercase tracking-wider text-stone-500">Order value · excluding cancelled</p><p className="mt-3 font-serif text-3xl">{money(lifetimeValue)}</p></div></div>
          <section className="border border-stone-200 bg-white"><div className="border-b border-stone-100 p-5 sm:p-6"><h2 className="font-serif text-xl">All orders</h2><p className="mt-1 text-xs text-stone-500">Complete purchase history, newest first.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500"><tr><th className="p-4">Order</th><th className="p-4">Date</th><th className="p-4">Items</th><th className="p-4">Payment</th><th className="p-4">Status</th><th className="p-4 text-right">Total</th></tr></thead><tbody>{orders.map((order) => <tr key={order._id} className="border-t border-stone-100 hover:bg-stone-50"><td className="p-4"><Link to={`/admin/orders/${order._id}`} className="font-medium text-amber-900 hover:underline">{order.order_number}</Link></td><td className="p-4 text-stone-500">{order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</td><td className="p-4">{(order.items || []).map((item, index) => <p key={`${item.product_id}-${index}`} className="text-xs">{item.quantity} × {item.product_name}{item.size ? ` · ${item.size}` : ''}</p>)}</td><td className="p-4 capitalize">{order.payment_status || 'pending'}</td><td className="p-4 capitalize">{order.status}</td><td className="p-4 text-right font-medium">{money(order.total)}</td></tr>)}{!orders.length && <tr><td colSpan={6} className="p-10 text-center text-stone-500">This customer has no orders yet.</td></tr>}</tbody></table></div></section>
        </>}
      </main>
    </div>
  );
}
