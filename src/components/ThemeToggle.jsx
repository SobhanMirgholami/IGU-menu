import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { applyTheme, getTheme, isDark, onSystemChange, setTheme } from '../theme'
import { MoonIcon, SunIcon } from './icons'

export default function ThemeToggle() {
  const { t } = useTranslation()
  const [theme, setThemeState] = useState(getTheme)
  const [, refresh] = useState(0)
  const dark = isDark(theme)

  useEffect(() => {
    return onSystemChange(() => {
      applyTheme(getTheme())
      refresh((n) => n + 1)
    })
  }, [])

  function toggle() {
    const next = dark ? 'light' : 'dark'
    setTheme(next)
    setThemeState(next)
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? t('theme.light') : t('theme.dark')}
      className="w-11 h-11 rounded-full border-2 border-ink bg-white text-ink flex items-center justify-center"
    >
      {dark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
    </button>
  )
}