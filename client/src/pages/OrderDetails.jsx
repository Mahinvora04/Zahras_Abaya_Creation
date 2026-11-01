import { ArrowLeft, CheckCircle2, MapPin, Package, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../api/axios";

const formatPrice = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;
const formatStatus = (status) => {
  const normalized = String(status || "placed").trim().toLowerCase();
  const knownStatuses = { confirmed: "Confirmed", received: "Received", delivered: "Delivered" };
  return knownStatuses[normalized] || normalized.replaceAll("_", " ");
};
const formatDate = (value) => value
  ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
  : "Date unavailable";
const getItemKey = (item) => `${item.product_id}:${item.variant_id || "no-variant"}`;

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [savedKey, setSavedKey] = useState("");

  useEffect(() => {
    let active = true;
    api.get(`/orders/${id}`)
      .then(({ data }) => { if (active) setOrder(data.order); })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.detail || "Could not load this order.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const updateDraft = (key, field, value, item) => {
    setDrafts((current) => {
      const existing = current[key] || {
        rating: item.review?.rating || 5,
        title: item.review?.title || "",
        body: item.review?.body || "",
      };
      return { ...current, [key]: { ...existing, [field]: value } };
    });
  };

  const saveReview = async (item) => {
    const key = getItemKey(item);
    const review = drafts[key] || {
      rating: item.review?.rating || 5,
      title: item.review?.title || "",
      body: item.review?.body || "",
    };
    if (!review.title.trim() || !review.body.trim()) return;

    setSavingKey(key);
    setError("");
    setSavedKey("");
    try {
      const { data } = await api.put(`/orders/${id}/reviews`, {
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        rating: review.rating,
        title: review.title.trim(),
        body: review.body.trim(),
      });
      setOrder((current) => ({
        ...current,
        items: current.items.map((currentItem) =>
          getItemKey(currentItem) === key
            ? { ...currentItem, review: data.review }
            : currentItem,
        ),
      }));
      setSavedKey(key);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not save your review.");
    } finally {
      setSavingKey("");
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-amber-800" /></div>;
  }

  if (!order) {
    return (
      <main className="min-h-[60vh] bg-stone-50/50 px-4 py-16 text-center">
        <p role="alert" className="text-stone-700">{error || "Order not found."}</p>
        <Link to="/orders" className="mt-5 inline-block text-sm text-amber-900 underline">Back to order history</Link>
      </main>
    );
  }

  const address = order.shipping_address || {};
  const canReview = String(order.status || "").trim().toLowerCase() === "delivered";

  return (
    <main className="min-h-screen bg-stone-50/50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link to="/orders" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-amber-900 hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" /> Order history
        </Link>

        <div className="mt-6 flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-medium tracking-[0.25em] text-amber-800 uppercase">Order details</span>
            <h1 className="mt-2 font-serif text-3xl font-light text-stone-900">{order.order_number}</h1>
            <p className="mt-2 text-sm text-stone-500">Placed {formatDate(order.created_at)}</p>
            <p className="mt-2 text-xs text-stone-500">Payment method: {order.payment_method === "upi" ? "UPI" : order.payment_method === "on_delivery" ? "Cash/UPI on delivery" : "Not specified"}</p>
            {order.payment_method === "upi" && order.status === "pending_payment" && <Link to={`/orders/${id}/pay-upi`} className="mt-3 inline-block text-xs font-medium uppercase tracking-wider text-amber-900 underline">Continue UPI payment</Link>}
          </div>
          <div className="space-y-1 sm:text-right">
            <span className="inline-block bg-amber-50 px-3 py-1.5 text-xs uppercase tracking-wider text-amber-900">
              {formatStatus(order.status)}
            </span>
            <p className="text-xs text-stone-500">Payment: {String(order.payment_status || "pending").replaceAll("_", " ")}</p>
          </div>
        </div>

        {error && <p role="alert" className="mt-5 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
          <section className="space-y-5" aria-label="Ordered products">
            {(order.items || []).map((item) => {
              const key = getItemKey(item);
              const draft = drafts[key] || {
                rating: item.review?.rating || 5,
                title: item.review?.title || "",
                body: item.review?.body || "",
              };
              return (
                <article key={key} className="border border-stone-200 bg-white p-5 sm:p-6">
                  <div className="flex gap-4">
                    <img
                      src={item.images?.[0] || "/images/placeholder.jpg"}
                      alt={item.product_name}
                      className="h-28 w-24 shrink-0 bg-stone-100 object-cover object-top"
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-serif text-lg text-stone-900">{item.product_name}</h2>
                      {(item.color || item.size) && (
                        <p className="mt-1 text-xs text-stone-500">{[item.color, item.size].filter(Boolean).join(" / ")}</p>
                      )}
                      {item.sku && <p className="mt-1 text-[11px] text-stone-400">SKU: {item.sku}</p>}
                      <p className="mt-3 text-sm text-stone-600">{formatPrice(item.price)} × {item.quantity}</p>
                      <p className="mt-1 font-medium text-stone-900">{formatPrice(item.line_total ?? item.price * item.quantity)}</p>
                    </div>
                  </div>

                  {canReview ? <div className="mt-6 border-t border-stone-100 pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-medium text-stone-900">{item.review ? "Your review" : "Review this product"}</h3>
                      {savedKey === key && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Review saved</span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-1" role="group" aria-label="Choose a rating from 1 to 5 stars">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => updateDraft(key, "rating", rating, item)}
                          aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
                          className="rounded p-1 hover:bg-amber-50"
                        >
                          <Star className={`h-6 w-6 ${rating <= draft.rating ? "fill-amber-500 text-amber-500" : "text-stone-300"}`} />
                        </button>
                      ))}
                    </div>
                    <label className="mt-4 block text-xs font-medium text-stone-600">
                      Review title
                      <input
                        value={draft.title}
                        onChange={(event) => updateDraft(key, "title", event.target.value, item)}
                        maxLength={120}
                        className="mt-1.5 w-full border border-stone-200 px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-800"
                        placeholder="What did you think?"
                      />
                    </label>
                    <label className="mt-3 block text-xs font-medium text-stone-600">
                      Your review
                      <textarea
                        value={draft.body}
                        onChange={(event) => updateDraft(key, "body", event.target.value, item)}
                        maxLength={2000}
                        rows={3}
                        className="mt-1.5 w-full resize-y border border-stone-200 px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-800"
                        placeholder="Share details about the fit, fabric, and quality."
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => saveReview(item)}
                      disabled={savingKey === key || !draft.title.trim() || !draft.body.trim()}
                      className="mt-4 bg-stone-900 px-5 py-2.5 text-xs uppercase tracking-widest text-white transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingKey === key ? "Saving review..." : item.review ? "Update review" : "Save review"}
                    </button>
                  </div> : (
                    <div className="mt-6 border-t border-stone-100 pt-5 text-sm text-stone-500">
                      Reviews are available after this order is delivered.
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          <aside className="h-fit space-y-6 border border-stone-200 bg-white p-5 sm:p-6">
            <div>
              <h2 className="font-serif text-lg text-stone-900">Delivery address</h2>
              <div className="mt-3 flex gap-2 text-sm text-stone-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
                <div>
                  <p>{address.label || "Address"}</p>
                  <p>{address.address}</p>
                  <p>{[address.city, address.state, address.pincode].filter(Boolean).join(", ")}</p>
                  <p>{address.country}</p>
                  <p className="mt-2">{order.phone}</p>
                </div>
              </div>
            </div>
            <div className="border-t border-stone-100 pt-5">
              <h2 className="font-serif text-lg text-stone-900">Payment summary</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between text-stone-600"><dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
                <div className="flex justify-between text-stone-600"><dt>Shipping</dt><dd>{formatPrice(order.shipping_fee)}</dd></div>
                <div className="flex justify-between border-t border-stone-100 pt-3 font-semibold text-stone-900"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
              </dl>
            </div>
            <p className="text-xs leading-5 text-stone-500">Payment status: {String(order.payment_status || "pending").replaceAll("_", " ")}. The store will verify receipt and update the payment status.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
