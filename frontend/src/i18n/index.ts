import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import vi_common from './locales/vi/common.json'
import en_common from './locales/en/common.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'vi',
    defaultNS: 'common',
    ns: ['common'],
    resources: {
      vi: { common: vi_common },
      en: { common: en_common },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'knot-lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  })

export default i18n
