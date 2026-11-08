import { useEffect, useState } from 'react';
import { ArrowUpRight, CircleDollarSign, Package, ShoppingBag, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import api from '../../api/axios';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/admin/dashboard')
      .then(({ data: result }) => setData(result))
      .catch(() => setError('Could not load store summary.'));
  }, []);

  const stats = data?.stats || {};
  const cards = [
    { label: 'Products listed', value: `${stats.active_products ?? '—'} / ${stats.products ?? '—'}`, icon: Package, foot: 'Active listings' },
    { label: 'Orders to fulfil', value: stats.pending_orders ?? '—', icon: Truck, foot: `${stats.orders ?? 0} total orders` },
    { label: 'Paid revenue', value: money(stats.revenue), icon: CircleDollarSign, foot: 'Excludes unpaid and cancelled orders' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900 md:flex-row">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 text-[10px] uppercase tracking-[.25em] text-amber-800">Store overview</p><h1 className="font-serif text-3xl">Good day</h1><p className="mt-2 text-sm text-stone-500">Your store at a glance.</p></div>
          <Link to="/admin/products/new" className="bg-stone-900 px-4 py-3 text-xs uppercase tracking-wider text-white hover:bg-amber-900">Add a product <ArrowUpRight className="ml-2 inline" size={15} /></Link>
        </div>
        {error && <p className="mb-5 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map(({ label, value, icon: Icon, foot }) => (
            <div key={label} className="border border-stone-200 bg-white p-5 sm:p-6">
              <div className="flex justify-between text-stone-500"><span className="text-xs uppercase tracking-wider">{label}</span><Icon size={18} /></div>
              <p className="mt-6 font-serif text-3xl">{value}</p><p className="mt-2 text-xs text-stone-400">{foot}</p>
            </div>
          ))}
        </div>
        <section className="mt-7 border border-stone-200 bg-white">
          <div className="flex items-center justify-between p-5 sm:p-6">
            <div><h2 className="font-serif text-xl">Recent orders</h2><p className="mt-1 text-xs text-stone-500">Latest customer purchases</p></div>
            <Link to="/admin/orders" className="text-xs uppercase tracking-wider text-amber-900">All orders →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500"><tr><th className="p-4">Order</th><th className="p-4">Customer</th><th className="p-4">Date</th><th className="p-4">Status</th><th className="p-4 text-right">Total</th></tr></thead>
              <tbody>
                {(data?.recent_orders || []).map((order) => (
                  <tr key={order._id} className="border-t border-stone-100">
                    <td className="p-4 font-medium"><Link to={`/admin/orders/${order._id}`} className="text-amber-900 hover:underline">{order.order_number}</Link></td><td className="p-4">{order.customer?.name || order.customer?.email?.split('@')[0] || order.shipping_address?.name || order.shipping_address?.full_name || 'Customer'}</td>
                    <td className="p-4 text-stone-500">{order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</td><td className="p-4 capitalize">{order.status}</td><td className="p-4 text-right">{money(order.total)}</td>
                  </tr>
                ))}
                {data && !data.recent_orders?.length && <tr><td colSpan={5} className="p-8 text-center text-stone-500">No orders have been placed yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Link to="/admin/products" className="flex items-center gap-4 border border-stone-200 bg-white p-5 hover:border-amber-700"><Package className="text-amber-900" /><span><b className="block font-medium">Manage products</b><small className="text-stone-500">Update details, pricing and visibility</small></span></Link>
          <Link to="/admin/orders" className="flex items-center gap-4 border border-stone-200 bg-white p-5 hover:border-amber-700"><ShoppingBag className="text-amber-900" /><span><b className="block font-medium">Process orders</b><small className="text-stone-500">Review purchases and update fulfilment</small></span></Link>
        </div>
      </main>
    </div>
  );
}
