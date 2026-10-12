import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/format'
import { pick } from '../lib/localize'
import OptionPicker from './OptionPicker'

const bySort = (a, b) => a.sort_order - b.sort_order

export default function Menu({ onAdd }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    async function loadMenu() {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          id, name, price, is_available, allergens, diet_tags,
          menu_item_option_groups (
            sort_order,
            option_groups (
              id, name, min_select, max_select,
              options ( id, name, price_delta, is_available, sort_order )
            )
          )
        `)
        .eq('is_archived', false)
        .order('sort_order')

      if (error) return setError(error.message)

      setItems(
        data.map((item) => ({
          ...item,
          groups: [...item.menu_item_option_groups].sort(bySort).map((link) => ({
            ...link.option_groups,
            options: link.option_groups.options.filter((o) => o.is_available).sort(bySort),
          })),
        }))
      )
    }
    loadMenu()
  }, [])

  function handleAdd(item) {
    if (item.groups.length > 0) {
      setOpenId(openId === item.id ? null : item.id)
    } else {
      onAdd(item, [])
    }
  }

  return (
    <div>
      {error && <p className="text-red-600">Error: {error}</p>}

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p>{pick(item.name, lang)}</p>
                <p className="text-sm font-semibold text-amber-800">
                  {item.groups.length > 0
                    ? t('menu.from', { price: formatPrice(item.price) })
                    : formatPrice(item.price)}
                </p>
              </div>
              <button
                onClick={() => handleAdd(item)}
                disabled={!item.is_available}
                className="bg-amber-700 text-white rounded-lg px-4 py-2 disabled:opacity-40"
              >
                {!item.is_available
                  ? t('menu.soldOut')
                  : openId === item.id
                  ? t('menu.close')
                  : t('menu.add')}
              </button>
            </div>

            {(item.allergens.length > 0 || item.diet_tags.length > 0) && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.diet_tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-800">
                    {t(`diets.${tag}`)}
                  </span>
                ))}
                {item.allergens.map((a) => (
                  <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {t(`allergens.${a}`)}
                  </span>
                ))}
              </div>
            )}

            {openId === item.id && (
              <OptionPicker
                item={item}
                onAdd={(options) => {
                  onAdd(item, options)
                  setOpenId(null)
                }}
                onCancel={() => setOpenId(null)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}