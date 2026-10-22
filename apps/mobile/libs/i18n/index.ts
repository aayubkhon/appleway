import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './locales/en';
import { ru } from './locales/ru';
import { uz } from './locales/uz';

export const DEFAULT_LANGUAGE = 'uz';

export const resources = {
  uz: { translation: uz },
  ru: { translation: ru },
  en: { translation: en },
} as const;

export type AppLanguage = keyof typeof resources;

export async function initI18n(language: AppLanguage = DEFAULT_LANGUAGE): Promise<void> {
  if (i18next.isInitialized) {
    return;
  }

  await i18next.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export { i18next };
