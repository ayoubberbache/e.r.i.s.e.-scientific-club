import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, TranslationDict } from '../data/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: TranslationDict;
  getLocalized: (item: any, field: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'erise_selected_language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'ar' || saved === 'en') return saved;
      // Default to Arabic or English based on user's preference
      return 'ar'; // Defaulting to Arabic as requested by user
    } catch {
      return 'ar';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // storage blocked
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  useEffect(() => {
    const isRtl = language === 'ar';
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
    if (isRtl) {
      document.body.classList.add('font-arabic');
    } else {
      document.body.classList.remove('font-arabic');
    }
  }, [language]);

  const t = translations[language] || translations.en;

  /**
   * Helper to retrieve localized text from database objects
   * e.g. item.title_ar vs item.title
   */
  const getLocalized = (item: any, field: string): string => {
    if (!item) return '';
    if (language === 'ar') {
      const arVal = item[`${field}_ar`];
      if (typeof arVal === 'string' && arVal.trim() !== '') {
        return arVal;
      }
      return item[field] || '';
    } else {
      const enVal = item[field];
      if (typeof enVal === 'string' && enVal.trim() !== '') {
        return enVal;
      }
      return item[`${field}_ar`] || '';
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        getLocalized,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
