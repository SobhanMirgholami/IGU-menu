import { Trans, useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'
import { LogoutIcon } from './icons'

export default function Hero({ name, signedIn, children }) {
  const { t } = useTranslation()

  return (
    <header className="relative bg-brand text-white rounded-b-[36px] overflow-hidden px-5 pt-5 pb-8">
      <div aria-hidden="true" className="absolute -top-16 -end-12 w-44 h-44 rounded-full bg-pop" />
      <div aria-hidden="true" className="absolute top-40 end-10 w-16 h-16 rounded-full border-[3px] border-white opacity-25" />

      <div className="relative max-w-md mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-2xl tracking-tight">IGU Café</span>
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-pop" />
          </div>
          <div className="flex gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {signedIn && (
              <button
                onClick={() => supabase.auth.signOut()}
                aria-label={t('app.signOut')}
                className="w-11 h-11 rounded-full border-2 border-ink bg-white text-ink flex items-center justify-center"
              >
                <LogoutIcon size={18} className="rtl:rotate-180" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {name && <p className="font-semibold text-brand-soft">{t('home.greeting', { name })}</p>}
          <h1 className="font-display font-extrabold text-[34px] leading-tight tracking-tight">
            <Trans
              i18nKey={signedIn ? 'home.headline' : 'home.welcome'}
              components={{ pop: <span className="inline-block bg-pop text-ink px-2.5 rounded-[10px] -rotate-2" /> }}
            />
          </h1>
        </div>

        {children}
      </div>
    </header>
  )
}