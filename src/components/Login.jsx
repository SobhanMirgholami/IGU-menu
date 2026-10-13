import { useEffect, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { LEGAL_PAGES, acceptedOnThisDevice, hasRead, onReadChange, rememberAgreement } from '../lib/legal'

const inputClass =
  'w-full h-14 px-4 rounded-2xl border-2 border-line bg-page text-fg placeholder:text-muted font-semibold focus:outline-none focus:border-brand dark:focus:border-pop'

const primaryButton =
  'w-full h-14 rounded-2xl border-2 border-ink bg-pop text-ink font-display font-extrabold text-lg shadow-hard-sm disabled:opacity-50'

export default function Login() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [agree, setAgree] = useState(false)
  // New on this phone? Then the terms must be read to the end and accepted before the code is sent
  const [isNew] = useState(() => !acceptedOnThisDevice())
  const [read, setRead] = useState(() => Object.fromEntries(LEGAL_PAGES.map((p) => [p, hasRead(p)])))
  const readAll = LEGAL_PAGES.every((p) => read[p])

  useEffect(
    () => onReadChange(() => setRead(Object.fromEntries(LEGAL_PAGES.map((p) => [p, hasRead(p)])))),
    []
  )
  const [step, setStep] = useState('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [domains, setDomains] = useState([])

  const cleanEmail = email.trim().toLowerCase()

  useEffect(() => {
    supabase
      .from('allowed_email_domains')
      .select('domain')
      .then(({ data }) => setDomains((data ?? []).map((d) => d.domain)))
  }, [])

  async function sendCode(e) {
    e.preventDefault()
    setError(null)
    if (isNew) {
      if (!readAll) return setError(t('legal.readFirst'))
      if (!agree) return setError(t('legal.mustAccept'))
      rememberAgreement() // saved to the database right after sign-in
    }
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({ email: cleanEmail })

    setLoading(false)
    if (error) setError(error.message)
    else setStep('code')
  }

  async function verifyCode(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: code.trim(),
      type: 'email',
    })

    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <div className="bg-surface border-2 border-line rounded-3xl shadow-hard p-6 flex flex-col gap-4">
      <h2 className="font-display font-extrabold text-2xl">{t('login.title')}</h2>

      {step === 'email' ? (
        <form onSubmit={sendCode} className="flex flex-col gap-3">
          <label htmlFor="email" className="sr-only">{t('login.emailPlaceholder')}</label>
          <input
            id="email"
            type="email"
            dir="ltr"
            required
            autoComplete="email"
            placeholder={t('login.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          {domains.length > 0 && (
            <p className="text-sm text-muted">
              {t('login.studentHint', {
                domains: domains.map((d) => `@${d}`).join(t('login.or')),
              })}
            </p>
          )}
          {isNew && (
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-soft-line p-3">
              <p className="text-sm font-semibold">{t('legal.readFirst')}</p>
              <div className="grid grid-cols-2 gap-2">
                {LEGAL_PAGES.map((p) => (
                  <a
                    key={p}
                    href={`#${p}`}
                    className={`min-h-11 px-3 py-2 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-1.5 text-center ${
                      read[p] ? 'bg-mint text-ink border-ink' : 'bg-surface text-fg border-line'
                    }`}
                  >
                    <span aria-hidden="true">{read[p] ? '✓' : p === 'terms' ? '📄' : '🔒'}</span>
                    {t(`legal.${p}`)}
                  </a>
                ))}
              </div>
              <label className={`flex items-start gap-3 text-sm ${readAll ? 'cursor-pointer' : 'opacity-50'}`}>
                <input
                  type="checkbox"
                  checked={agree}
                  disabled={!readAll}
                  onChange={(e) => {
                    setAgree(e.target.checked)
                    setError(null)
                  }}
                  className="mt-0.5 w-5 h-5 shrink-0 accent-brand"
                />
                <span>{t('legal.acceptPlain')}</span>
              </label>
            </div>
          )}
          <button disabled={loading || (isNew && !(readAll && agree))} className={primaryButton}>
            {loading ? t('login.sending') : t('login.sendCode')}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <p className="text-sm text-muted">{t('login.codeSent', { email: cleanEmail })}</p>

          <div className="flex items-start gap-2 bg-brand-soft text-ink dark:bg-chip dark:text-fg border-2 border-soft-line rounded-2xl p-3">
            <span className="text-lg leading-none" aria-hidden="true">📬</span>
            <p className="text-sm">
              <Trans i18nKey="login.spamHint" components={{ bold: <span className="font-bold" /> }} />
            </p>
          </div>

          <label htmlFor="code" className="sr-only">{t('login.codePlaceholder')}</label>
          <input
            id="code"
            inputMode="numeric"
            dir="ltr"
            autoComplete="one-time-code"
            required
            placeholder={t('login.codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`${inputClass} text-center tracking-[0.4em] text-xl`}
          />
          <button disabled={loading} className={primaryButton}>
            {loading ? t('login.checking') : t('login.signIn')}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setCode('')
              setError(null)
            }}
            className="h-11 text-sm font-semibold text-muted underline"
          >
            {t('login.differentEmail')}
          </button>
        </form>
      )}

      {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}