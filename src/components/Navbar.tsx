import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, UserPlus, Globe } from 'lucide-react';
import { Logo } from './Logo';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    async function fetchRegStatus() {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'registration_open')
          .single();

        if (data) {
          setIsRegistrationOpen(data.value === 'true');
        }
      } catch {
        setIsRegistrationOpen(false);
      }
    }

    fetchRegStatus();
  }, [location.pathname]);

  const navLinks = [
    { name: t.nav.home, path: '/' },
    { name: t.nav.events, path: '/events' },
    { name: t.nav.team, path: '/team' },
    { name: t.nav.achievements, path: '/achievements' },
    ...(isRegistrationOpen ? [{ name: t.nav.register, path: '/register', isHighlight: true }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-subtle transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Lockup */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group focus:outline-none">
              <Logo variant="full" className="h-10 sm:h-12 w-auto" />
              <div className="hidden lg:block border-l border-subtle pl-3 rtl:border-l-0 rtl:border-r rtl:pr-3">
                <p className="text-[11px] font-medium text-muted leading-tight max-w-[210px]">
                  {language === 'ar' 
                    ? 'المدرسة الوطنية العليا للطاقات المتجددة والبيئة — باتنة' 
                    : 'Energy • Robotics • Innovation • Sustainability'}
                </p>
              </div>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:items-center md:gap-1 rtl:space-x-reverse" aria-label="Main Navigation">
            {navLinks.map((link) => (
              link.isHighlight ? (
                <Link
                  key={link.path}
                  to={link.path}
                  className="inline-flex items-center gap-1.5 ml-3 rtl:ml-0 rtl:mr-3 px-4 py-2 rounded-lg bg-accent text-white text-xs sm:text-sm font-bold hover:bg-accent-muted transition-colors active:scale-98"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{link.name}</span>
                </Link>
              ) : (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                    isActive(link.path)
                      ? 'text-accent bg-accent-tint/60 font-bold'
                      : 'text-secondary hover:text-primary hover:bg-dominant'
                  }`}
                >
                  {link.name}
                </Link>
              )
            ))}

            {/* Separator */}
            <div className="h-4 w-px bg-subtle mx-2" />

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-subtle hover:border-accent bg-surface text-secondary hover:text-primary text-xs font-semibold transition-colors cursor-pointer"
              title={`Switch to ${language === 'ar' ? 'English' : 'العربية'}`}
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-accent" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-subtle hover:border-accent bg-surface text-muted hover:text-primary transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </nav>

          {/* Mobile Actions */}
          <div className="flex items-center md:hidden gap-1.5">
            {/* Language Mobile */}
            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1.5 rounded-lg border border-subtle bg-surface text-secondary text-xs font-semibold flex items-center gap-1"
              aria-label="Toggle language"
            >
              <Globe className="w-3 h-3 text-accent" />
              <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            {/* Theme Mobile */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-subtle bg-surface text-muted hover:text-primary transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Hamburger Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 rounded-lg border border-subtle bg-surface text-secondary hover:text-primary transition-colors"
              aria-expanded={isOpen}
              aria-label="Open menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-t border-subtle bg-surface px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                link.isHighlight
                  ? 'bg-accent text-white font-bold text-center'
                  : isActive(link.path)
                  ? 'bg-accent-tint/60 text-accent font-bold'
                  : 'text-secondary hover:bg-dominant hover:text-primary'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
