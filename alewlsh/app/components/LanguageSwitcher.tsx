// components/LanguageSwitcher.tsx
'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';

// Match your Language type: 'en' | 'am'
const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'am', label: 'አማ', name: 'Amharic' },
] as const;

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage(); // ✅ Use 'language'

  return (
    <div className="relative">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'en' | 'am')}
        className="appearance-none bg-[#9E199A]/10 border border-[#9E199A]/30 rounded-lg px-3 py-1.5 text-xs font-medium text-[#653126] focus:outline-none focus:ring-2 focus:ring-[#9E199A]/50 cursor-pointer"
        aria-label={t('common.current_language') || 'Language'}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
      
      {/* Custom dropdown arrow */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-3 h-3 text-[#653126]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}