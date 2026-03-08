// components/Navbar.tsx
'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { FaBars, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

// Type definitions for navigation items (matches your nested translation structure)
interface NavItem {
  href: string;
  labelKey: string; // e.g., 'navigation.home'
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'navigation.home' },
  { href: '/emergency', labelKey: 'navigation.emergency' },
  { href: '/safety', labelKey: 'navigation.safe_path' },
  { href: '/womenForWomen', labelKey: 'navigation.women_for_women' }, // Add to translations
  { href: '/payment/upgrade', labelKey: 'navigation.subscriptions' }, // Add to translations
];

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage(); // ✅ Use 'language' (your context)
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav
      style={{ backgroundColor: '#FFECFC' }}
      className="fixed w-full z-50 top-0 shadow-sm border-b border-[#9E199A]/20"
    >
      {/* === DESKTOP NAVBAR === */}
      <div className="hidden md:flex max-w-full mx-auto px-6 h-16 items-center justify-between">
        
        {/* Left – Logo + Name */}
        <div className="flex items-center space-x-2 ml-10">
          <div className="flex-shrink-0">
            <Image
              src="/home.jpeg"
              alt={t('common.logo_alt') || 'Alewlsh Logo'} // Fallback if key missing
              width={36}
              height={36}
              className="w-9 h-9 rounded-[50%] object-cover border border-[#9E199A]"
            />
          </div>
          <Link
            href="/"
            style={{ color: '#9E199A' }}
            className="text-base font-bold whitespace-nowrap hover:opacity-80 transition-opacity"
          >
            {t('common.app_name')}
          </Link>
        </div>

        {/* Center – Navigation Links */}
        <div className="flex items-center justify-center gap-8 lg:gap-10">
          {NAV_ITEMS.map(({ href, labelKey }) => (
            <motion.div
              key={href}
              whileHover={{ scale: 1.05, y: -1 }}
              className="flex-shrink-0"
            >
              <Link
                href={href}
                style={{ color: '#653126' }}
                className="text-sm font-medium hover:underline transition-all duration-200 whitespace-nowrap"
                onClick={handleNavClick}
              >
                {t(labelKey)}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Right – Language Switcher + Emergency Button */}
        <div className="flex items-center gap-4 mr-20">
          {/* Language Switcher */}
          <LanguageSwitcher />
          
          {/* Emergency "Ask for Help" Button */}
          <Link href="/emergency">
            <motion.button
              style={{ 
                backgroundColor: '#9E199A', 
                color: '#FFECFC',
                borderRadius: '8px 2px 8px 2px'
              }}
              className="px-5 py-2 text-sm font-semibold hover:opacity-90 transition-all duration-200 whitespace-nowrap flex items-center gap-2"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <FaExclamationTriangle className="w-4 h-4" />
              {t('navigation.ask_for_help') || 'Ask for Help'} {/* Fallback */}
            </motion.button>
          </Link>
        </div>
      </div>

      {/* === MOBILE NAVBAR === */}
      <div className="md:hidden flex justify-between items-center px-4 h-14">
        {/* Mobile Logo */}
        <Link href="/" className="flex items-center space-x-2" onClick={handleNavClick}>
          <Image 
            src="/logo.jpg" 
            alt={t('common.logo_alt') || 'Logo'} 
            width={32} 
            height={32} 
            className="rounded-full border border-[#9E199A]" 
          />
          <span style={{ color: '#653126' }} className="text-sm font-bold">
            {t('common.app_name')}
          </span>
        </Link>

        {/* Right Side: Language + Menu Toggle */}
        <div className="flex items-center gap-3">
          {/* Language Switcher (Compact for Mobile) */}
          <div className="scale-90">
            <LanguageSwitcher />
          </div>
          
          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-[#653126] hover:text-[#9E199A] transition-colors focus:outline-none"
            aria-label={isMenuOpen ? (t('common.close_menu') || 'Close menu') : (t('common.open_menu') || 'Open menu')}
          >
            {isMenuOpen ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* === MOBILE MENU DROPDOWN === */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-[#FFECFC]/95 backdrop-blur-sm border-t border-[#9E199A]/20 overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-2">
              {/* Emergency Button in Mobile Menu */}
              <Link href="/emergency" onClick={handleNavClick}>
                <motion.button
                  style={{ 
                    backgroundColor: '#9E199A', 
                    color: '#FFECFC',
                    borderRadius: '8px 2px 8px 2px'
                  }}
                  className="w-full px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 mb-4"
                  whileTap={{ scale: 0.98 }}
                >
                  <FaExclamationTriangle className="w-4 h-4" />
                  {t('navigation.ask_for_help') || 'Ask for Help'}
                </motion.button>
              </Link>

              {/* Mobile Nav Links */}
              {NAV_ITEMS.map(({ href, labelKey }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={handleNavClick}
                  className="text-[#653126] hover:text-[#9E199A] transition-colors duration-200 text-base font-medium px-3 py-3 rounded-lg hover:bg-[#9E199A]/10"
                >
                  {t(labelKey)}
                </Link>
              ))}

              {/* Current Language Indicator (Mobile) */}
              <div className="mt-4 pt-4 border-t border-[#9E199A]/20">
                <p className="text-xs text-[#653126]/70 text-center">
                  {t('common.current_language') || 'Language'}:{' '}
                  <span className="font-semibold uppercase">{language}</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}