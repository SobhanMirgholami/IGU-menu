import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/format'
import { pick } from '../lib/localize'
import OptionPicker from './OptionPicker'
import { CupIcon, GlassIcon, PastryIcon, PlusIcon } from './icons'

const bySort = (a, b) => a.sort_order - b.sort_order
const TILE_COLORS = ['bg-pop', 'bg-brand-soft', 'bg-coral-soft', 'bg-mint-soft']
const CATEGORY_ICONS = [CupIcon, GlassIcon, PastryIcon]

export default function Menu({ onAdd }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [error, setError] = useState(null)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    async function loadMenu() {
      const [itemsResult, categoriesResult] = await Promise.all([
        supabase
          .from('menu_items')
          .select(`
            id, category_id, name, price, is_available, allergens, diet_tags, sort_order,
            menu_item_option_groups (
              sort_order,
              option_groups (
                id, name, min_select, max_select,
                options ( id, name, price_delta, is_available, sort_order )
              )
            )
          `)
          .eq('is_archived', false)
          .order('sort_order'),
        supabase.from('categories').select('id, name, sort_order').order('sort_order'),
      ])

      if (itemsResult.error) return setError(itemsResult.error.message)

      const loadedItems = itemsResult.data.map((item) => ({
        ...item,
        groups: [...item.menu_item_option_groups].sort(bySort).map((link) => ({
          ...link.option_groups,
          options: link.option_groups.options.filter((o) => o.is_available).sort(bySort),
        })),
      }))

      const usedCategories = (categoriesResult.data ?? []).filter((c) =>
        loadedItems.some((item) => item.category_id === c.id)
      )

      setItems(loadedItems)
      setCategories(usedCategories)
      setActiveCategory(usedCategories[0]?.id ?? null)
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

  const categoryIndex = categories.findIndex((c) => c.id === activeCategory)
  const TileIcon = CATEGORY_ICONS[categoryIndex] ?? CupIcon
  const visibleItems = items.filter((item) => item.category_id === activeCategory)

  return (
    <section className="flex flex-col gap-4">
      {error && <p className="text-red-600">Error: {error}</p>}

      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
        {categories.map((category) => {
          const active = category.id === activeCategory
          return (
            <button
              key={category.id}
              onClick={() => {
                setActiveCategory(category.id)
                setOpenId(null)
              }}
              aria-pressed={active}
              className={`h-10 px-4 rounded-full border-2 font-bold text-sm whitespace-nowrap ${
                active
                  ? 'bg-ink text-white border-ink dark:bg-pop dark:text-ink dark:border-pop'
                  : 'bg-surface text-fg border-line'
              }`}
            >
              {pick(category.name, lang)}
            </button>
          )
        })}
      </div>

      <ul className="flex flex-col gap-3.5">
        {visibleItems.map((item, index) => (
          <li
            key={item.id}
            className="bg-surface border-2 border-line rounded-[22px] shadow-hard-sm p-3"
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-16 h-16 rounded-[18px] ${TILE_COLORS[index % TILE_COLORS.length]} text-ink flex items-center justify-center shrink-0`}
              >
                <TileIcon size={32} />
              </div>

              <div className="grow flex flex-col gap-1 min-w-0">
                <p className="font-display font-bold text-[19px] leading-tight">{pick(item.name, lang)}</p>
                <p className="font-bold text-[15px] text-brand dark:text-pop">
                  {item.groups.length > 0
                    ? t('menu.from', { price: formatPrice(item.price) })
                    : formatPrice(item.price)}
                </p>
                {(item.allergens.length > 0 || item.diet_tags.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.diet_tags.map((tag) => (
                      <span key={tag} className="text-xs font-semibold px-2 py-0.5 rounded-[10px] bg-mint-soft text-ink">
                        {t(`diets.${tag}`)}
                      </span>
                    ))}
                    {item.allergens.map((a) => (
                      <span key={a} className="text-xs font-semibold px-2 py-0.5 rounded-[10px] bg-chip border-[1.5px] border-soft-line">
                        {t(`allergens.${a}`)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {item.is_available ? (
                <button
                  onClick={() => handleAdd(item)}
                  aria-label={`${t('menu.add')}: ${pick(item.name, lang)}`}
                  aria-expanded={item.groups.length > 0 ? openId === item.id : undefined}
                  className="w-12 h-12 rounded-full border-2 border-line bg-brand text-white flex items-center justify-center shrink-0"
                >
                  <PlusIcon size={22} strokeWidth={2.6} className={openId === item.id ? 'rotate-45 transition-transform' : 'transition-transform'} />
                </button>
              ) : (
                <span className="text-xs font-bold px-3 py-2 rounded-full bg-chip text-muted border-2 border-soft-line shrink-0">
                  {t('menu.soldOut')}
                </span>
              )}
            </div>

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
    </section>
  )
}