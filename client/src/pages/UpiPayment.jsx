import { ArrowLeft, CheckCircle2, CircleAlert, ExternalLink, QrCode } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";

import { QRCodeSVG } from "qrcode.react";
import api from "../api/axios";

const UPI_ID = "q042227037@ybl";
const WHATSAPP_NUMBER = "919999999999";
const formatPrice = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

export default function UpiPayment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [whatsappOpened, setWhatsappOpened] = useState(false);
  const upiLaunchAttempted = useRef(false);

  useEffect(() => {
    let active = true;
    api.get(`/orders/${id}`)
      .then(({ data }) => {
        if (!active) return;
        if (data.order.payment_method !== "upi") {
          setError("This order was not placed with UPI payment.");
          return;
        }
        setOrder(data.order);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.detail || "Could not load this order.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const paymentUri = useMemo(() => {
    if (!order) return "";
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: "Zahra's Abaya Creation",
      am: Number(order.total).toFixed(2),
      cu: "INR",
      tn: `Order ${order.order_number}`,
    });
    return `upi://pay?${params.toString()}`;
  }, [order]);

  useEffect(() => {
    if (!paymentUri || !order || order.status !== "pending_payment" || upiLaunchAttempted.current) return undefined;
    if (!/android|iphone|ipad|ipod/i.test(navigator.userAgent)) return undefined;

    upiLaunchAttempted.current = true;
    const launchTimer = window.setTimeout(() => {
      window.location.href = paymentUri;
    }, 600);
    return () => window.clearTimeout(launchTimer);
  }, [order, paymentUri]);

  const whatsappMessage = useMemo(() => {
    if (!order) return "";
    return `Hi, I have made the UPI payment for order ${order.order_number} (${formatPrice(order.total)}). I am sharing the payment screenshot for confirmation.`;
  }, [order]);

  const confirmPayment = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post(`/orders/${id}/confirm-payment`);
      setOrder(data.order);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not confirm this order.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-amber-800" /></div>;
  }

  if (!order) {
    return (
      <main className="min-h-[60vh] bg-stone-50/50 px-4 py-16 text-center">
        <p role="alert" className="text-sm text-rose-800">{error || "Order not found."}</p>
        <Link to="/orders" className="mt-5 inline-block text-sm text-amber-900 underline">Back to orders</Link>
      </main>
    );
  }

  const confirmed = order.status === "confirmed";

  return (
    <main className="min-h-screen bg-stone-50/50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link to={`/orders/${id}`} className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-amber-900 hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" /> Order details
        </Link>

        <section className="mt-6 border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-9">
          {confirmed ? (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" />
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-amber-800">Order confirmed</p>
              <h1 className="mt-2 font-serif text-3xl font-light text-stone-900">Thank you for your order</h1>
              <p className="mt-3 text-sm text-stone-600">Your payment confirmation was recorded. Payment status remains pending until the store verifies it.</p>
              <button type="button" onClick={() => navigate(`/orders/${id}`)} className="mt-7 bg-stone-900 px-6 py-3 text-xs uppercase tracking-widest text-white hover:bg-amber-900">View order</button>
            </>
          ) : (
            <>
              <QrCode className="mx-auto h-9 w-9 text-amber-800" />
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-amber-800">Pay with UPI</p>
              <h1 className="mt-2 font-serif text-3xl font-light text-stone-900">Scan to pay</h1>
              <p className="mt-2 text-sm text-stone-500">Order {order.order_number}</p>

              <div className="mx-auto mt-6 inline-flex rounded-sm border border-stone-200 bg-white p-4">
                <QRCodeSVG value={paymentUri} size={240} level="M" includeMargin />
              </div>

              <p className="mt-5 text-xs uppercase tracking-widest text-stone-500">Amount to pay</p>
              <p className="mt-1 text-3xl font-medium text-stone-900">{formatPrice(order.total)}</p>
              <p className="mt-3 text-sm text-stone-600">UPI ID: <span className="font-medium text-stone-900">{UPI_ID}</span></p>

              <a
                href={paymentUri}
                className="mt-4 inline-flex items-center gap-2 border border-stone-300 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-stone-800 transition hover:border-black hover:bg-black hover:text-white"
              >
                <ExternalLink className="h-4 w-4" /> Open UPI app
              </a>

              <div className="mt-6 border-t border-stone-100 pt-5">
                <p className="text-sm font-medium text-stone-900">Share your payment screenshot</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">Send the screenshot to our WhatsApp number. Attach and send it in WhatsApp, then return here to confirm your order.</p>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setWhatsappOpened(true)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 bg-[#25D366] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#1eaa52]"
                >
                  <ExternalLink className="h-4 w-4" /> Send screenshot on WhatsApp
                </a>
                <p className="mt-2 text-[11px] text-stone-400">Temporary contact: +{WHATSAPP_NUMBER}</p>
              </div>

              {error && <p role="alert" className="mt-5 flex items-center justify-center gap-2 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><CircleAlert className="h-4 w-4 shrink-0" />{error}</p>}

              <button type="button" onClick={confirmPayment} disabled={saving || !whatsappOpened} className="mt-5 w-full bg-stone-900 px-6 py-3.5 text-xs uppercase tracking-widest text-white hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-40">
                {saving ? "Confirming order…" : "Finished payment"}
              </button>
              <p className="mt-3 text-xs leading-5 text-stone-500">{whatsappOpened ? "After you have sent the screenshot, press the button above. Payment is not automatically verified and will remain pending until the store confirms receipt." : "Open WhatsApp and share your screenshot before you can confirm this order."}</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
