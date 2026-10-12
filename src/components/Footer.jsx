import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BugReportDialog from './BugReportDialog'
import { canPromptInstall, isInstalled, isIos, onInstallChange, promptInstall } from '../lib/pwa'

// Bottom links: Terms · Privacy · Report a problem · Install app
export default function Footer({ signedIn, page }) {
  const { t } = useTranslation()
  const [reporting, setReporting] = useState(false)
  const [installable, setInstallable] = useState(canPromptInstall)
  const [iosHint, setIosHint] = useState(false)
  const closeReport = useCallback(() => setReporting(false), [])

  useEffect(() => onInstallChange(() => setInstallable(canPromptInstall())), [])

  const showIosInstall = isIos() && !isInstalled()
  const linkClass = 'underline underline-offset-2 hover:text-fg'

  return (
    <footer className="print:hidden flex flex-col items-center gap-2 py-6 text-sm text-muted">
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
        <a href="#terms" className={linkClass}>
          {t('legal.terms')}
        </a>
        <a href="#privacy" className={linkClass}>
          {t('legal.privacy')}
        </a>
        {signedIn && (
          <button onClick={() => setReporting(true)} className={linkClass}>
            {t('bugs.open')}
          </button>
        )}
        {installable && (
          <button onClick={promptInstall} className={`${linkClass} font-bold text-brand dark:text-pop`}>
            {t('pwa.install')}
          </button>
        )}
        {!installable && showIosInstall && (
          <button onClick={() => setIosHint((v) => !v)} className={`${linkClass} font-bold text-brand dark:text-pop`}>
            {t('pwa.install')}
          </button>
        )}
      </nav>

      {iosHint && <p className="max-w-xs text-center">{t('pwa.iosHint')}</p>}

      {reporting && <BugReportDialog page={page} onClose={closeReport} />}
    </footer>
  )
}
