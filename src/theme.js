const KEY = 'theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

export function getTheme() {
  try {
    return localStorage.getItem(KEY) ?? 'system'
  } catch {
    return 'system'
  }
}

export function isDark(theme) {
  return theme === 'dark' || (theme === 'system' && media.matches)
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', isDark(theme))
}

export function setTheme(theme) {
  try {
    if (theme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    // storage blocked: the theme still applies for this visit
  }
  applyTheme(theme)
}

export function onSystemChange(callback) {
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}