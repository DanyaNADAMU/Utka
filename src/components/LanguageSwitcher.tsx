'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/LanguageProvider';
import { getCookie } from '@/lib/cookies'; // We'll implement a simple client cookie helper

export default function LanguageSwitcher() {
  const router = useRouter();
  // We can just read from document.cookie, but let's do a simple toggle
  const currentLocale = typeof document !== 'undefined' ? (document.cookie.includes('NEXT_LOCALE=en') ? 'en' : 'ru') : 'ru';

  const toggleLanguage = () => {
    const newLocale = currentLocale === 'ru' ? 'en' : 'ru';
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    router.refresh();
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors border border-slate-700/50"
      title="Switch Language"
    >
      <span className="text-lg leading-none">{currentLocale === 'ru' ? '🇷🇺' : '🇬🇧'}</span>
      <span className="text-sm font-medium uppercase tracking-wider text-slate-300">
        {currentLocale}
      </span>
    </button>
  );
}
