import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import tr from './locales/tr.json'
import en from './locales/en.json'
import ar from './locales/ar.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'tr',
    supportedLngs: ['tr', 'en', 'ar'],
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

function applyDirection() {
  const lang = i18n.resolvedLanguage
  document.documentElement.lang = lang
  document.documentElement.dir = i18n.dir(lang)
}

applyDirection()
i18n.on('languageChanged', applyDirection)

export default i18n