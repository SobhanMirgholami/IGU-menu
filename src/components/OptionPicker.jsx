import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '../lib/format'
import { pick } from '../lib/localize'

function defaultSelection(groups) {
  const selected = {}
  groups.forEach((group) => {
    selected[group.id] =
      group.min_select >= 1 && group.options.length > 0 ? [group.options[0].id] : []
  })
  return selected
}

export default function OptionPicker({ item, onAdd, onCancel }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage
  const [selected, setSelected] = useState(() => defaultSelection(item.groups))
  const [error, setError] = useState(null)

  function choose(group, optionId) {
    setError(null)
    setSelected((prev) => {
      const current = prev[group.id]

      if (group.max_select === 1) {
        if (current.includes(optionId) && group.min_select === 0) {
          return { ...prev, [group.id]: [] }
        }
        return { ...prev, [group.id]: [optionId] }
      }

      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) }
      }
      if (current.length >= group.max_select) return prev
      return { ...prev, [group.id]: [...current, optionId] }
    })
  }

  const selectedIds = Object.values(selected).flat()
  const chosen = item.groups.flatMap((g) => g.options).filter((o) => selectedIds.includes(o.id))
  const unitPrice = Number(item.price) + chosen.reduce((sum, o) => sum + Number(o.price_delta), 0)

  function submit() {
    const missing = item.groups.find((g) => selected[g.id].length < g.min_select)
    if (missing) return setError(t('options.choose', { group: pick(missing.name, lang) }))
    onAdd(chosen)
  }

  function groupHint(group) {
    if (group.min_select >= 1) return t('options.required')
    if (group.max_select > 1) return t('options.upTo', { count: group.max_select })
    return t('options.optional')
  }

  return (
    <div className="mt-3 border-t pt-3 space-y-4">
      {item.groups.map((group) => (
        <div key={group.id}>
          <p className="text-sm font-semibold">
            {pick(group.name, lang)}{' '}
            <span className="font-normal text-gray-500">{groupHint(group)}</span>
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {group.options.map((option) => {
              const isOn = selected[group.id].includes(option.id)
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => choose(group, option.id)}
                  className={`px-3 py-1 rounded-full border text-sm ${
                    isOn ? 'bg-amber-700 text-white border-amber-700' : 'bg-white'
                  }`}
                >
                  {pick(option.name, lang)}
                  {Number(option.price_delta) !== 0 && (
                    <span className="ms-1 opacity-80">
                      {Number(option.price_delta) > 0 ? '+' : ''}
                      {formatPrice(option.price_delta)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button onClick={submit} className="flex-1 bg-amber-700 text-white rounded-lg p-2">
          {t('options.add', { price: formatPrice(unitPrice) })}
        </button>
        <button onClick={onCancel} className="px-4 rounded-lg border">
          {t('options.cancel')}
        </button>
      </div>
    </div>
  )
}