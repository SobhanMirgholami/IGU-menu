import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { TERMS_VERSION, takeAgreement } from '../lib/legal'
import { unsubscribePush } from '../lib/pwa'

// Students can only use the site after accepting the current Terms of Use.
// - Ticked on the login screen: saved here automatically, nothing extra to do.
// - Already signed in from before, or the terms changed: this screen asks once.
export default function TermsGate({ children }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState('checking') // checking | needed | accepted
  const [agree, setAgree] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function save() {
    const { error } = await supabase.rpc('accept_terms', { p_version: TERMS_VERSION })
    // PGRST202 = database/14_terms.sql not run yet: nothing to save to
    if (error && error.code !== 'PGRST202') throw error
  }

  useEffect(() => {
    let active = true

    async function check() {
      if (takeAgreement()) {
        try {
          await save()
          if (active) setStatus('accepted')
          return
        } catch {
          // fall through and ask again
        }
      }

      const { data, error } = await supabase
        .from('terms_acceptances')
        .select('terms_version')
        .eq('terms_version', TERMS_VERSION)
        .maybeSingle()

      if (!active) return
      // If the table doesn't exist yet (14_terms.sql not run), still ask once per visit
      setStatus(data && !error ? 'accepted' : 'needed')
    }

    check()
    return () => {
      active = false
    }
  }, [])

  async function accept() {
    if (!agree) return setError(t('legal.mustAccept'))
    setSaving(true)
    setError(null)
    try {
      await save()
      setStatus('accepted')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (status === 'accepted') return children
  if (status === 'checking') return <p className="p-6 text-muted">...</p>

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <div className="bg-surface border-2 border-line rounded-3xl shadow-hard p-6 flex flex-col gap-4">
        <span aria-hidden="true" className="text-4xl">
          📜
        </span>
        <h2 className="font-display font-extrabold text-2xl">{t('legal.gateTitle')}</h2>
        <p className="text-muted">{t('legal.gateText')}</p>

        <div className="flex flex-wrap gap-2">
          <a href="#terms" className="h-10 px-4 rounded-full border-2 border-line bg-surface font-bold text-sm flex items-center">
            📄 {t('legal.terms')}
          </a>
          <a href="#privacy" className="h-10 px-4 rounded-full border-2 border-line bg-surface font-bold text-sm flex items-center">
            🔒 {t('legal.privacy')}
          </a>
        </div>

        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => {
              setAgree(e.target.checked)
              setError(null)
            }}
            className="mt-0.5 w-5 h-5 shrink-0 accent-brand"
          />
          <span>
            <Trans
              i18nKey="legal.accept"
              components={{
                terms: <a href="#terms" className="font-bold underline underline-offset-2" />,
                privacy: <a href="#privacy" className="font-bold underline underline-offset-2" />,
              }}
            />
          </span>
        </label>

        {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}

        <button
          onClick={accept}
          disabled={saving || !agree}
          className="w-full h-14 rounded-2xl border-2 border-ink bg-pop text-ink font-display font-extrabold text-lg shadow-hard-sm disabled:opacity-50"
        >
          {saving ? t('legal.saving') : t('legal.continue')}
        </button>
        <button
          onClick={async () => {
            await unsubscribePush()
            supabase.auth.signOut()
          }}
          className="h-11 text-sm font-semibold text-muted underline"
        >
          {t('legal.decline')}
        </button>
      </div>
    </main>
  )
}
