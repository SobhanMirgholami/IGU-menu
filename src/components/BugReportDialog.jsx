import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

const ERRORS = ['BUG_TOO_SHORT', 'BUG_TOO_LONG', 'BUG_LIMIT']

// What the developer gets automatically with every report
function deviceInfo() {
  const screenSize = `${window.screen.width}x${window.screen.height}`
  const mode = window.matchMedia?.('(display-mode: standalone)').matches ? 'installed app' : 'browser'
  const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  return `${navigator.userAgent} | ${screenSize} | ${mode} | ${theme}`.slice(0, 400)
}

export default function BugReportDialog({ page, onClose }) {
  const { t, i18n } = useTranslation()
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent
  const [error, setError] = useState(null)
  const textRef = useRef(null)

  useEffect(() => {
    textRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function send(e) {
    e.preventDefault()
    setError(null)
    if (message.trim().length < 10) return setError(t('bugs.errors.BUG_TOO_SHORT'))

    setStatus('sending')
    const { error } = await supabase.rpc('submit_bug_report', {
      p_message: message.trim(),
      p_page: page,
      p_lang: i18n.resolvedLanguage,
      p_device: deviceInfo(),
    })

    if (error) {
      setStatus('idle')
      if (error.code === 'PGRST202') return setError(t('bugs.errors.notReady'))
      return setError(ERRORS.includes(error.message) ? t(`bugs.errors.${error.message}`) : error.message)
    }
    setStatus('sent')
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-title"
        className="w-full max-w-md bg-surface text-fg border-2 border-ink rounded-[24px] shadow-hard p-5 flex flex-col gap-3"
      >
        <h2 id="bug-title" className="font-display font-extrabold text-2xl">
          {t('bugs.title')}
        </h2>

        {status === 'sent' ? (
          <>
            <p>{t('bugs.thanks')}</p>
            <button
              onClick={onClose}
              className="h-12 bg-brand text-white border-2 border-ink rounded-2xl font-bold shadow-hard-sm"
            >
              {t('bugs.close')}
            </button>
          </>
        ) : (
          <form onSubmit={send} className="flex flex-col gap-3">
            <label htmlFor="bug-message" className="text-sm text-muted">
              {t('bugs.hint')}
            </label>
            <textarea
              id="bug-message"
              ref={textRef}
              value={message}
              maxLength={2000}
              rows={5}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('bugs.placeholder')}
              className="w-full rounded-xl border-2 border-line bg-page text-fg p-3 placeholder:text-muted focus:outline-none focus:border-brand dark:focus:border-pop resize-none"
            />
            <p className="text-xs text-muted">{t('bugs.auto')}</p>

            {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button
                disabled={status === 'sending'}
                className="grow h-12 bg-brand text-white border-2 border-ink rounded-2xl font-bold shadow-hard-sm disabled:opacity-50"
              >
                {status === 'sending' ? t('bugs.sending') : t('bugs.send')}
              </button>
              <button type="button" onClick={onClose} className="h-12 px-4 rounded-2xl border-2 border-line bg-surface font-bold">
                {t('bugs.cancel')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
