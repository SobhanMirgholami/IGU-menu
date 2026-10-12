import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '../lib/format'
import { pick } from '../lib/localize'
import { CheckIcon } from './icons'

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
    <div className="mt-4 pt-4 border-t-2 border-dashed border-soft-line flex flex-col gap-5">
      {item.groups.map((group) => (
        <fieldset key={group.id} className="flex flex-col gap-2.5">
          <legend className="flex items-center gap-2 mb-2.5">
            <span className="font-display font-bold text-lg">{pick(group.name, lang)}</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                group.min_select >= 1
                  ? 'bg-brand-soft text-brand'
                  : 'text-muted'
              }`}
            >
              {groupHint(group)}
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {group.options.map((option) => {
              const isOn = selected[group.id].includes(option.id)
              const delta = Number(option.price_delta)
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => choose(group, option.id)}
                  aria-pressed={isOn}
                  className={`h-11 px-4 rounded-full border-2 text-sm flex items-center gap-1.5 ${
                    isOn
                      ? 'bg-pop text-ink border-ink font-bold shadow-hard-sm'
                      : 'bg-surface text-fg border-soft-line font-semibold'
                  }`}
                >
                  {isOn && <CheckIcon size={16} strokeWidth={3} />}
                  {pick(option.name, lang)}
                  {delta !== 0 && (
                    <span className={isOn ? 'opacity-80' : 'text-muted'}>
                      {delta > 0 ? '+' : ''}
                      {formatPrice(delta)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}

      {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          className="grow h-12 rounded-2xl border-2 border-ink bg-brand text-white font-display font-bold text-lg shadow-hard-sm"
        >
          {t('options.add', { price: formatPrice(unitPrice) })}
        </button>
        <button onClick={onCancel} className="h-12 px-4 rounded-2xl border-2 border-line bg-surface text-fg font-bold">
          {t('options.cancel')}
        </button>
      </div>
    </div>
  )
}
