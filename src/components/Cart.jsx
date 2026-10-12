import { useState } from "react";
import { supabase } from "../lib/supabase";
import { formatPrice } from "../lib/format";

export default function Cart({ cart, setCart }) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderId, setOrderId] = useState(null);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function changeQuantity(id, change) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.min(item.quantity + change, 10) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  async function placeOrder() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc("place_order", {
      p_items: cart.map((item) => ({
        menu_item_id: item.id,
        quantity: item.quantity,
      })),
      p_note: note.trim() || null,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setOrderId(data);
      setCart([]);
      setNote("");
    }
  }

  if (orderId) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm text-center">
        <p className="text-gray-600">Order placed!</p>
        <p className="text-4xl font-bold text-amber-800 my-2">#{orderId}</p>
        <p className="text-sm text-gray-500 mb-4">
          Show this number at the counter.
        </p>
        <button
          onClick={() => setOrderId(null)}
          className="text-amber-800 underline text-sm"
        >
          New order
        </button>
      </div>
    );
  }

  if (cart.length === 0) {
    return <p className="text-gray-500 text-sm">Your cart is empty.</p>;
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
      <h2 className="font-semibold text-amber-800">Your order</h2>

      {cart.map((item) => (
        <div key={item.id} className="flex items-center justify-between">
          <span>{item.name.en}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeQuantity(item.id, -1)}
              className="w-8 h-8 rounded-full bg-amber-100"
            >
              −
            </button>
            <span className="w-6 text-center">{item.quantity}</span>
            <button
              onClick={() => changeQuantity(item.id, 1)}
              className="w-8 h-8 rounded-full bg-amber-100"
            >
              +
            </button>
          </div>
        </div>
      ))}

      <textarea
        placeholder="Note (optional)"
        maxLength={200}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full border rounded-lg p-2 text-sm"
      />

      <div className="flex justify-between font-semibold">
        <span>Total</span>
        <span>{formatPrice(total)}</span>
      </div>

      <button
        onClick={placeOrder}
        disabled={loading}
        className="w-full bg-amber-700 text-white rounded-lg p-3 disabled:opacity-50"
      >
        {loading ? "Placing order..." : "Place order"}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
