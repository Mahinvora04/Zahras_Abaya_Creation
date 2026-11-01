import { jsPDF } from "jspdf";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;
const formatMoney = (amount) => `INR ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (value) => value
  ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  : "Date unavailable";

function addFooter(doc) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(225, 222, 214);
    doc.line(MARGIN, 283, PAGE_WIDTH - MARGIN, 283);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 116, 106);
    doc.text("Zahra's Abaya Creation", MARGIN, 289);
    doc.text(`Page ${page} of ${pages}`, PAGE_WIDTH - MARGIN, 289, { align: "right" });
  }
}

export default function createInvoicePdf(order, customer) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const address = order.shipping_address || {};
  const orderNumber = order.order_number || String(order._id || "order");
  const generatedAt = new Date();

  doc.setFillColor(39, 39, 35);
  doc.rect(0, 0, PAGE_WIDTH, 37, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("ZAHRA'S ABAYA CREATION", MARGIN, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("ORDER INVOICE", MARGIN, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("INVOICE", PAGE_WIDTH - MARGIN, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(orderNumber, PAGE_WIDTH - MARGIN, 25, { align: "right" });

  doc.setTextColor(55, 53, 48);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Order date", MARGIN, 48);
  doc.text("Invoice generated", 112, 48);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(order.created_at), MARGIN, 54);
  doc.text(formatDate(generatedAt), 112, 54);

  const cardY = 63;
  const cardH = 44;
  const cardW = 87.5;
  const rightX = PAGE_WIDTH - MARGIN - cardW;
  doc.setDrawColor(225, 222, 214);
  doc.setFillColor(250, 249, 246);
  doc.roundedRect(MARGIN, cardY, cardW, cardH, 1.5, 1.5, "FD");
  doc.roundedRect(rightX, cardY, cardW, cardH, 1.5, 1.5, "FD");

  const writeCard = (title, x, lines) => {
    doc.setTextColor(134, 91, 37);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(title.toUpperCase(), x + 5, cardY + 7);
    doc.setTextColor(55, 53, 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    let lineY = cardY + 14;
    lines.filter(Boolean).forEach((line) => {
      const wrapped = doc.splitTextToSize(String(line), cardW - 10);
      wrapped.forEach((part) => {
        if (lineY <= cardY + cardH - 3) {
          doc.text(part, x + 5, lineY);
          lineY += 4.4;
        }
      });
    });
  };

  writeCard("Bill to", MARGIN, [customer?.name || "Customer", customer?.email, customer?.phone || order.phone]);
  writeCard("Ship to", rightX, [address.label || "Delivery address", address.address, [address.city, address.state, address.pincode].filter(Boolean).join(", "), address.country]);

  let y = 119;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(67, 64, 56);
  doc.rect(MARGIN, y - 6, PAGE_WIDTH - MARGIN * 2, 10, "F");
  doc.text("ITEM", MARGIN + 3, y);
  doc.text("SKU", 89, y);
  doc.text("QTY", 128, y, { align: "right" });
  doc.text("UNIT PRICE", 160, y, { align: "right" });
  doc.text("AMOUNT", PAGE_WIDTH - MARGIN - 3, y, { align: "right" });
  y += 8;

  const items = order.items || [];
  items.forEach((item, index) => {
    const nameLines = doc.splitTextToSize(item.product_name || "Product", 65);
    const variant = [item.color, item.size].filter(Boolean).join(" / ");
    const variantLines = variant ? doc.splitTextToSize(variant, 65) : [];
    const skuLines = doc.splitTextToSize(item.sku || "—", 31);
    const rowHeight = Math.max(13, nameLines.length * 4.5 + variantLines.length * 3.8 + 5, skuLines.length * 4.5 + 5);
    if (y + rowHeight > 273) {
      doc.addPage();
      y = 22;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(67, 64, 56);
      doc.rect(MARGIN, y - 6, PAGE_WIDTH - MARGIN * 2, 10, "F");
      doc.text("ITEM", MARGIN + 3, y);
      doc.text("SKU", 89, y);
      doc.text("QTY", 128, y, { align: "right" });
      doc.text("UNIT PRICE", 160, y, { align: "right" });
      doc.text("AMOUNT", PAGE_WIDTH - MARGIN - 3, y, { align: "right" });
      y += 8;
    }
    if (index % 2 === 1) {
      doc.setFillColor(250, 249, 246);
      doc.rect(MARGIN, y - 4, PAGE_WIDTH - MARGIN * 2, rowHeight, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(55, 53, 48);
    doc.text(nameLines, MARGIN + 3, y + 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 116, 106);
    if (variantLines.length) doc.text(variantLines, MARGIN + 3, y + 1 + nameLines.length * 4.5);
    doc.text(skuLines, 89, y + 1);
    doc.setFontSize(8.5);
    doc.setTextColor(55, 53, 48);
    doc.text(String(item.quantity ?? 1), 128, y + 1, { align: "right" });
    doc.text(formatMoney(item.price), 160, y + 1, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(formatMoney(item.line_total ?? Number(item.price || 0) * Number(item.quantity || 1)), PAGE_WIDTH - MARGIN - 3, y + 1, { align: "right" });
    doc.setDrawColor(235, 232, 225);
    doc.line(MARGIN, y + rowHeight - 3, PAGE_WIDTH - MARGIN, y + rowHeight - 3);
    y += rowHeight;
  });

  y += 7;
  if (y + 48 > 276) {
    doc.addPage();
    y = 22;
  }
  const totalsX = 125;
  const totalsRight = PAGE_WIDTH - MARGIN - 3;
  const totalLine = (label, amount, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10 : 9);
    doc.setTextColor(55, 53, 48);
    doc.text(label, totalsX, y);
    doc.text(formatMoney(amount), totalsRight, y, { align: "right" });
    y += bold ? 8 : 6;
  };
  totalLine("Subtotal", order.subtotal);
  totalLine("Shipping", order.shipping_fee);
  doc.setDrawColor(134, 91, 37);
  doc.line(totalsX, y - 2, totalsRight, y - 2);
  totalLine("Total", order.total, true);

  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 96, 88);
  const paymentMethod = order.payment_method === "upi" ? "UPI" : order.payment_method === "on_delivery" ? "Cash/UPI on delivery" : "Not specified";
  doc.text(`Payment method: ${paymentMethod}`, MARGIN, y);
  doc.text(`Payment status: ${String(order.payment_status || "pending").replaceAll("_", " ")}`, MARGIN, y + 5);

  addFooter(doc);
  const safeName = String(orderNumber).replace(/[^a-z0-9_-]+/gi, "-");
  doc.save(`invoice-${safeName}.pdf`);
}
