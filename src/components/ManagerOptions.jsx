import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/format'
import { pick } from '../lib/localize'
import NameFields, { inputClass, emptyNames, namesComplete, cleanNames } from './NameFields'
import { CheckIcon, PlusIcon } from './icons'

const bySort = (a, b) => a.sort_order - b.sort_order || a.id - b.id
const nextSort = (rows) => Math.max(0, ...rows.map((r) => r.sort_order)) + 1

// "Required · pick 1", "Optional · up to 2", ...
function ruleText(t, group) {
  if (group.min_select >= 1) {
    return group.max_select === 1
      ? t('manager.options.ruleOne')
      : t('manager.options.ruleRequiredUpTo', { count: group.max_select })
  }
  return group.max_select === 1
    ? t('manager.options.ruleOptionalOne')
    : t('manager.options.ruleOptionalUpTo', { count: group.max_select })
}

function priceText(t, delta) {
  const value = Number(delta)
  if (value === 0) return t('manager.options.free')
  return `${value > 0 ? '+' : '−'}${formatPrice(Math.abs(value))}`
}

const cardClass = 'bg-surface border-2 border-line rounded-[22px] shadow-hard-sm p-4 flex flex-col gap-3'
const smallButton = 'h-9 px-3 rounded-full border-2 border-line bg-surface font-bold text-sm'
const errorText = 'text-sm font-semibold text-red-600 dark:text-red-400'

// ---------- Forms ----------

function GroupForm({ group, sortOrder, onSaved, onCancel }) {
  const { t } = useTranslation()
  const [names, setNames] = useState(group ? group.name : emptyNames)
  const [required, setRequired] = useState(group ? group.min_select >= 1 : false)
  const [max, setMax] = useState(group ? String(group.max_select) : '1')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    setError(null)

    const maxSelect = Number(max)
    if (!namesComplete(names)) return setError(t('manager.errors.names'))
    if (!Number.isInteger(maxSelect) || maxSelect < 1 || maxSelect > 10) {
      return setError(t('manager.options.errors.max'))
    }

    const data = { name: cleanNames(names), min_select: required ? 1 : 0, max_select: maxSelect }

    setSaving(true)
    const { data: saved, error } = group
      ? await supabase.from('option_groups').update(data).eq('id', group.id).select()
      : await supabase.from('option_groups').insert({ ...data, sort_order: sortOrder }).select()
    setSaving(false)

    if (error) return setError(error.message)
    if (!saved?.length) return setError(t('manager.errors.permission'))
    onSaved()
  }

  return (
    <form onSubmit={save} className={cardClass}>
      <h2 className="font-display font-extrabold text-xl">
        {group ? t('manager.options.editGroup') : t('manager.options.addGroup')}
      </h2>

      <NameFields value={names} onChange={setNames} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <label className="flex items-center gap-3 h-11 px-3 rounded-xl border-2 border-line bg-page font-semibold text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="w-5 h-5 accent-brand"
          />
          {t('manager.options.required')}
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('manager.options.max')}
          <input
            type="number"
            min="1"
            max="10"
            step="1"
            dir="ltr"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <p className="text-sm text-muted">
        {ruleText(t, { min_select: required ? 1 : 0, max_select: Number(max) || 1 })}
      </p>

      {error && <p className={errorText}>{error}</p>}

      <div className="flex gap-2">
        <button
          disabled={saving}
          className="grow h-12 bg-brand text-white border-2 border-ink rounded-2xl font-bold shadow-hard-sm disabled:opacity-50"
        >
          {saving ? t('manager.saving') : t('manager.options.saveGroup')}
        </button>
        <button type="button" onClick={onCancel} className="h-12 px-4 rounded-2xl border-2 border-line bg-surface font-bold">
          {t('manager.cancel')}
        </button>
      </div>
    </form>
  )
}

function ChoiceForm({ group, choice, onSaved, onCancel }) {
  const { t } = useTranslation()
  const [names, setNames] = useState(choice ? choice.name : emptyNames)
  const [delta, setDelta] = useState(choice ? String(choice.price_delta) : '0')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    setError(null)

    const priceDelta = Number(delta)
    if (!namesComplete(names)) return setError(t('manager.errors.names'))
    if (delta === '' || !Number.isFinite(priceDelta) || priceDelta < -1000 || priceDelta > 1000) {
      return setError(t('manager.options.errors.priceDelta'))
    }

    const data = { name: cleanNames(names), price_delta: priceDelta }

    setSaving(true)
    const { data: saved, error } = choice
      ? await supabase.from('options').update(data).eq('id', choice.id).select()
      : await supabase
          .from('options')
          .insert({ ...data, group_id: group.id, sort_order: nextSort(group.options) })
          .select()
    setSaving(false)

    if (error) return setError(error.message)
    if (!saved?.length) return setError(t('manager.errors.permission'))
    onSaved()
  }

  return (
    <form onSubmit={save} className="rounded-2xl border-2 border-dashed border-line bg-page p-3 flex flex-col gap-3">
      <h3 className="font-display font-bold text-lg">
        {choice ? t('manager.options.editChoice') : t('manager.options.addChoice')}
      </h3>

      <NameFields value={names} onChange={setNames} />

      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t('manager.options.priceDelta')}
        <input
          type="number"
          step="0.01"
          min="-1000"
          max="1000"
          dir="ltr"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          className={inputClass}
        />
        <span className="text-xs font-normal text-muted">{t('manager.options.priceHint')}</span>
      </label>

      {error && <p className={errorText}>{error}</p>}

      <div className="flex gap-2">
        <button
          disabled={saving}
          className="grow h-11 bg-brand text-white border-2 border-ink rounded-2xl font-bold shadow-hard-sm disabled:opacity-50"
        >
          {saving ? t('manager.saving') : t('manager.options.saveChoice')}
        </button>
        <button type="button" onClick={onCancel} className="h-11 px-4 rounded-2xl border-2 border-line bg-surface font-bold">
          {t('manager.cancel')}
        </button>
      </div>
    </form>
  )
}

// ---------- Screen ----------

export default function ManagerOptions() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage
  const [groups, setGroups] = useState([])
  const [items, setItems] = useState([])
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [groupForm, setGroupForm] = useState(null) // null | 'new' | group id
  const [choiceForm, setChoiceForm] = useState(null) // null | { groupId, choiceId }

  async function load() {
    const [groupsResult, itemsResult, linksResult] = await Promise.all([
      supabase
        .from('option_groups')
        .select('id, name, min_select, max_select, sort_order, options (id, name, price_delta, is_available, sort_order)'),
      supabase
        .from('menu_items')
        .select('id, name, category_id, sort_order')
        .eq('is_archived', false)
        .order('category_id')
        .order('sort_order'),
      supabase.from('menu_item_option_groups').select('menu_item_id, group_id'),
    ])

    const failed = groupsResult.error || itemsResult.error || linksResult.error
    if (failed) {
      setError(failed.message)
    } else {
      setGroups(groupsResult.data.map((g) => ({ ...g, options: [...g.options].sort(bySort) })).sort(bySort))
      setItems(itemsResult.data)
      setLinks(linksResult.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function closeForms() {
    setGroupForm(null)
    setChoiceForm(null)
    load()
  }

  const isLinked = (group, item) => links.some((l) => l.group_id === group.id && l.menu_item_id === item.id)

  // Turns a group on or off for one menu item
  async function toggleLink(group, item) {
    setError(null)

    if (isLinked(group, item)) {
      const { data, error } = await supabase
        .from('menu_item_option_groups')
        .delete()
        .eq('group_id', group.id)
        .eq('menu_item_id', item.id)
        .select()
      if (error) return setError(error.message)
      if (!data?.length) return setError(t('manager.errors.permission'))
    } else {
      const { error } = await supabase
        .from('menu_item_option_groups')
        .insert({ group_id: group.id, menu_item_id: item.id, sort_order: group.sort_order })
      if (error) return setError(error.message)
    }
    load()
  }

  async function toggleChoice(choice) {
    setError(null)
    const { data, error } = await supabase
      .from('options')
      .update({ is_available: !choice.is_available })
      .eq('id', choice.id)
      .select()
    if (error) return setError(error.message)
    if (!data?.length) return setError(t('manager.errors.permission'))
    load()
  }

  if (loading) return <p className="text-muted">{t('manager.options.loading')}</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted max-w-xl">{t('manager.options.intro')}</p>
        {groupForm !== 'new' && (
          <button
            onClick={() => setGroupForm('new')}
            className="h-11 px-4 rounded-full border-2 border-ink bg-pop text-ink font-bold shadow-hard-sm flex items-center gap-2"
          >
            <PlusIcon size={18} strokeWidth={2.6} />
            {t('manager.options.addGroup')}
          </button>
        )}
      </div>

      {error && <p className={errorText}>{error}</p>}

      {groupForm === 'new' && (
        <GroupForm sortOrder={nextSort(groups)} onSaved={closeForms} onCancel={() => setGroupForm(null)} />
      )}

      {groups.length === 0 && groupForm !== 'new' && <p className="text-muted">{t('manager.options.noGroups')}</p>}

      {groups.map((group) => {
        if (groupForm === group.id) {
          return <GroupForm key={group.id} group={group} onSaved={closeForms} onCancel={() => setGroupForm(null)} />
        }

        const usedCount = items.filter((item) => isLinked(group, item)).length
        const noneShown = !group.options.some((o) => o.is_available)

        return (
          <section key={group.id} className={cardClass}>
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div className="min-w-0">
                <h2 className="font-display font-extrabold text-xl">{pick(group.name, lang)}</h2>
                <p className="text-xs text-muted">
                  {group.name.tr} · {group.name.en} · <span lang="ar">{group.name.ar}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-chip text-brand dark:text-pop">
                  {ruleText(t, group)}
                </span>
                <button onClick={() => setGroupForm(group.id)} className={smallButton}>
                  {t('manager.edit')}
                </button>
              </div>
            </div>

            {group.min_select >= 1 && noneShown && usedCount > 0 && (
              <p className={errorText}>{t('manager.options.warnNoChoice')}</p>
            )}

            {/* Choices */}
            <ul className="flex flex-col divide-y-2 divide-dashed divide-soft-line">
              {group.options.length === 0 && <li className="py-2 text-sm text-muted">{t('manager.options.noChoices')}</li>}
              {group.options.map((choice) =>
                choiceForm?.choiceId === choice.id ? (
                  <li key={choice.id} className="py-2">
                    <ChoiceForm group={group} choice={choice} onSaved={closeForms} onCancel={() => setChoiceForm(null)} />
                  </li>
                ) : (
                  <li
                    key={choice.id}
                    className={`py-2 flex flex-wrap items-center gap-3 ${choice.is_available ? '' : 'opacity-60'}`}
                  >
                    <span className="grow min-w-0 font-semibold">{pick(choice.name, lang)}</span>
                    <span className="text-sm font-bold text-muted" dir="ltr">
                      {priceText(t, choice.price_delta)}
                    </span>
                    <button
                      onClick={() => toggleChoice(choice)}
                      aria-pressed={!choice.is_available}
                      className={`h-9 px-3 rounded-full border-2 border-ink font-bold text-sm text-ink ${
                        choice.is_available ? 'bg-mint' : 'bg-coral'
                      }`}
                    >
                      {choice.is_available ? t('manager.options.shown') : t('manager.options.hidden')}
                    </button>
                    <button onClick={() => setChoiceForm({ groupId: group.id, choiceId: choice.id })} className={smallButton}>
                      {t('manager.edit')}
                    </button>
                  </li>
                )
              )}
            </ul>

            {choiceForm?.groupId === group.id && choiceForm.choiceId === null ? (
              <ChoiceForm group={group} onSaved={closeForms} onCancel={() => setChoiceForm(null)} />
            ) : (
              <button
                onClick={() => setChoiceForm({ groupId: group.id, choiceId: null })}
                className="self-start h-10 px-4 rounded-full border-2 border-dashed border-line font-bold text-sm flex items-center gap-2"
              >
                <PlusIcon size={16} strokeWidth={2.6} />
                {t('manager.options.addChoice')}
              </button>
            )}

            {/* Which menu items use this group */}
            <div className="flex flex-col gap-2 pt-2 border-t-2 border-soft-line">
              <p className="text-sm font-bold">
                {t('manager.options.usedOn')} <span className="text-muted font-semibold">({usedCount})</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => {
                  const linked = isLinked(group, item)
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleLink(group, item)}
                      aria-pressed={linked}
                      className={`h-9 px-3 rounded-full border-2 text-sm font-bold flex items-center gap-1.5 ${
                        linked ? 'bg-brand text-white border-ink dark:bg-pop dark:text-ink' : 'bg-surface text-fg border-line'
                      }`}
                    >
                      {linked && <CheckIcon size={14} strokeWidth={3} />}
                      {pick(item.name, lang)}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
