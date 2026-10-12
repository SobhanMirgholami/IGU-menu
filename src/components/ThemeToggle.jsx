import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
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

  function toggle(event) {
    const next = dark ? 'light' : 'dark'

    function apply() {
      setTheme(next)
      setThemeState(next)
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduceMotion) {
      apply()
      return
    }

    const box = event.currentTarget.getBoundingClientRect()
    const x = box.left + box.width / 2
    const y = box.top + box.height / 2
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

    const transition = document.startViewTransition(() => {
      flushSync(apply)
    })

    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 550, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
      )
    })
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