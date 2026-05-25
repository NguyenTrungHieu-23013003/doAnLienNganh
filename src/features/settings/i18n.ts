import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/mockDb/locales/en/translation.json';
import vi from '@/mockDb/locales/vi/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
