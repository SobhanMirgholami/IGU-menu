import { formatPrice } from "../lib/format";

const formatDateTime = (date) =>
  new Date(date).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function Receipt({ order }) {
  if (!order) return null;

  return (
    <div
      id="receipt"
      className="hidden print:block text-black bg-white p-3 font-mono text-xs"
    >
      <p className="text-center text-base font-bold">IGU Café</p>
      <p className="text-center">{formatDateTime(order.created_at)}</p>

      <p className="text-center text-3xl font-bold my-2">#{order.id}</p>

      <div className="border-t border-dashed border-black my-2" />

      {order.order_items.map((item) => (
        <div key={item.id} className="flex justify-between">
          <span>
            {item.quantity} × {item.item_name.tr}
          </span>
          <span>{formatPrice(item.unit_price * item.quantity)}</span>
        </div>
      ))}

      <div className="border-t border-dashed border-black my-2" />

      <div className="flex justify-between font-bold text-sm">
        <span>TOPLAM</span>
        <span>{formatPrice(order.total)}</span>
      </div>

      <p className="text-center font-bold mt-1">
        {order.is_paid ? "ÖDENDİ" : "ÖDENMEDİ"}
      </p>

      {order.note && <p className="mt-2">Not: {order.note}</p>}

      <p className="text-center mt-3">Teşekkürler!</p>
    </div>
  );
}
