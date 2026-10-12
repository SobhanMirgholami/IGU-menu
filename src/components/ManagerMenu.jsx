import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatPrice } from "../lib/format";

const EMPTY_FORM = { tr: "", en: "", ar: "", price: "", category_id: "" };

export default function ManagerMenu() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [itemsResult, categoriesResult] = await Promise.all([
      supabase
        .from("menu_items")
        .select(
          "id, name, price, category_id, is_available, is_archived, sort_order",
        )
        .order("category_id")
        .order("sort_order"),
      supabase.from("categories").select("id, name").order("sort_order"),
    ]);

    if (itemsResult.error) setError(itemsResult.error.message);
    else setItems(itemsResult.data);

    if (!categoriesResult.error) setCategories(categoriesResult.data);
  }

  useEffect(() => {
    load();
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      tr: item.name.tr,
      en: item.name.en,
      ar: item.name.ar,
      price: String(item.price),
      category_id: String(item.category_id),
    });
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function save(e) {
    e.preventDefault();
    setError(null);

    const price = Number(form.price);

    if (!form.tr.trim() || !form.en.trim() || !form.ar.trim()) {
      return setError("Enter the name in all three languages");
    }
    if (form.price === "" || !Number.isFinite(price) || price < 0) {
      return setError("Enter a valid price");
    }
    if (!form.category_id) {
      return setError("Choose a category");
    }

    const data = {
      name: { tr: form.tr.trim(), en: form.en.trim(), ar: form.ar.trim() },
      price,
      category_id: Number(form.category_id),
    };

    setSaving(true);

    const { data: saved, error } = editingId
      ? await supabase
          .from("menu_items")
          .update(data)
          .eq("id", editingId)
          .select()
      : await supabase.from("menu_items").insert(data).select();

    setSaving(false);

    if (error) {
      setError(error.message);
    } else if (!saved || saved.length === 0) {
      setError("Not saved. You may not have permission.");
    } else {
      resetForm();
      load();
    }
  }

  async function toggle(item, field) {
    const { data: saved, error } = await supabase
      .from("menu_items")
      .update({ [field]: !item[field] })
      .eq("id", item.id)
      .select();

    if (error) alert(error.message);
    else if (!saved || saved.length === 0)
      alert("Not saved. You may not have permission.");
    else load();
  }

  const categoryName = (id) =>
    categories.find((c) => c.id === id)?.name.tr ?? "";

  return (
    <div className="space-y-6">
      <form
        onSubmit={save}
        className="bg-surface border-2 border-line rounded-[22px] shadow-hard-sm p-4 space-y-3"
      >
        <h2 className="font-display font-bold text-lg">
          {editingId ? `Edit item #${editingId}` : "Add new item"}
        </h2>

        <input
          placeholder="Name (Turkish)"
          value={form.tr}
          onChange={(e) => updateField("tr", e.target.value)}
          className="w-full h-11 px-3 rounded-xl border-2 border-line bg-page text-fg placeholder:text-muted"
        />
        <input
          placeholder="Name (English)"
          value={form.en}
          onChange={(e) => updateField("en", e.target.value)}
          className="w-full h-11 px-3 rounded-xl border-2 border-line bg-page text-fg placeholder:text-muted"
        />
        <input
          placeholder="Name (Arabic)"
          dir="rtl"
          value={form.ar}
          onChange={(e) => updateField("ar", e.target.value)}
          className="w-full h-11 px-3 rounded-xl border-2 border-line bg-page text-fg placeholder:text-muted"
        />

        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Price (TL)"
            value={form.price}
            onChange={(e) => updateField("price", e.target.value)}
            className="flex-1 h-11 px-3 rounded-xl border-2 border-line bg-page text-fg placeholder:text-muted"
          />
          <select
            value={form.category_id}
            onChange={(e) => updateField("category_id", e.target.value)}
            className="flex-1 h-11 px-3 rounded-xl border-2 border-line bg-page text-fg placeholder:text-muted"
          >
            <option value="">Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name.tr}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

        <div className="flex gap-2">
          <button
            disabled={saving}
            className="flex-1 h-12 bg-brand text-white border-2 border-ink rounded-2xl font-bold shadow-hard-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? "Save changes" : "Add item"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 rounded-2xl border-2 border-line font-bold"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={`bg-surface border-2 border-line rounded-[20px] shadow-hard-sm p-3 ${item.is_archived ? "opacity-50" : ""}`}
          >
            <div className="flex justify-between">
              <div>
                <p className="font-medium">{item.name.tr}</p>
                <p className="text-xs text-muted">
                  {categoryName(item.category_id)} · {item.name.en} ·{" "}
                  {item.name.ar}
                </p>
              </div>
              <p className="font-semibold">{formatPrice(item.price)}</p>
            </div>

            <div className="flex flex-wrap gap-2 mt-2 text-sm">
              <button
                onClick={() => startEdit(item)}
                className="h-10 px-3 rounded-full border-2 border-line font-semibold"
              >
                Edit
              </button>
              <button
                onClick={() => toggle(item, "is_available")}
                className={`h-10 px-3 rounded-full border-2 border-line font-semibold ${
                  item.is_available
                    ? "text-green-700 dark:text-green-400 border-green-600"
                    : "text-red-600 dark:text-red-400 border-red-300"
                }`}
              >
                {item.is_available ? "Available" : "Sold out"}
              </button>
              <button
                onClick={() => toggle(item, "is_archived")}
                className="h-10 px-3 rounded-full border-2 border-line font-semibold"
              >
                {item.is_archived ? "Restore" : "Archive"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
