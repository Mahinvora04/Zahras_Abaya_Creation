import { ArrowRight, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/axios";

const formatPrice = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;
const formatStatus = (status) => {
  const normalized = String(status || "placed").trim().toLowerCase();
  const knownStatuses = { confirmed: "Confirmed", received: "Received", delivered: "Delivered" };
  return knownStatuses[normalized] || normalized.replaceAll("_", " ");
};
const formatDate = (value) => value
  ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "Date unavailable";

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/orders")
      .then(({ data }) => { if (active) setOrders(data.orders || []); })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.detail || "Could not load your orders.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-amber-800" /></div>;
  }

  return (
    <main className="min-h-screen bg-stone-50/50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link to="/profile" className="text-xs uppercase tracking-widest text-amber-900 hover:text-stone-900">My account</Link>
        <h1 className="mt-3 font-serif text-3xl font-light text-stone-900 sm:text-4xl">Order history</h1>
        <p className="mt-2 text-sm text-stone-500">Review past orders and manage your product reviews.</p>

        {error && <p role="alert" className="mt-6 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}

        {!error && orders.length === 0 && (
          <div className="mt-10 border border-stone-200 bg-white px-6 py-16 text-center">
            <Package className="mx-auto h-10 w-10 text-amber-800" />
            <h2 className="mt-4 font-serif text-2xl text-stone-900">No orders yet</h2>
            <p className="mt-2 text-sm text-stone-500">Your completed and pending orders will appear here.</p>
            <Link to="/products" className="mt-6 inline-flex items-center gap-2 bg-stone-900 px-6 py-3 text-xs uppercase tracking-widest text-white hover:bg-amber-900">
              Browse collection <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <Link
              key={order._id}
              to={`/orders/${order._id}`}
              className="block border border-stone-200 bg-white p-5 transition hover:border-amber-800/50 hover:shadow-sm sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-medium text-stone-900">{order.order_number}</h2>
                    <span className="bg-amber-50 px-2.5 py-1 text-[10px] uppercase tracking-wider text-amber-900">
                      {formatStatus(order.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-stone-500">Placed {formatDate(order.created_at)}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {(order.items || []).length} {order.items?.length === 1 ? "item" : "items"}
                    {order.items?.length ? ` · ${order.items.slice(0, 2).map((item) => item.product_name).join(", ")}` : ""}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="font-semibold text-stone-900">{formatPrice(order.total)}</span>
                  <ArrowRight className="h-4 w-4 text-amber-800" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
