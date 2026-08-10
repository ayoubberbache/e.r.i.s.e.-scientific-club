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
    <nav className="bg-surface shadow-sm sticky top-0 z-50 border-b border-subtle transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3 group">
              <Logo variant="full" className="h-12 md:h-14 w-auto" />
              <div className="hidden sm:block">
                <p className="text-[10px] text-muted max-w-[220px] leading-tight rtl:text-right">
                  {language === 'ar' 
                    ? 'المدرسة الوطنية العليا للطاقات المتجددة، البيئة والتنمية المستدامة' 
                    : 'Energy • Robotic • Innovation • Sustainable • Engineers'}
                </p>
              </div>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center md:space-x-6 rtl:space-x-reverse">
            {navLinks.map((link) => (
              link.isHighlight ? (
                <Link
                  key={link.path}
                  to={link.path}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-sm font-bold shadow-md shadow-accent/20 hover:bg-accent-muted transition-all active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  {link.name}
                </Link>
              ) : (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold transition-colors ${
                    isActive(link.path)
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted hover:border-default hover:text-secondary'
                  }`}
                >
                  {link.name}
                </Link>
              )
            ))}

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-subtle hover:border-accent bg-dominant/50 text-secondary hover:text-primary text-xs font-bold transition-all cursor-pointer shadow-sm"
              title={`Switch to ${language === 'ar' ? 'English' : 'العربية'}`}
            >
              <Globe className="w-3.5 h-3.5 text-accent" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-muted hover:text-accent hover:bg-accent-tint transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Menu Action Buttons */}
          <div className="flex items-center md:hidden gap-2">
            {/* Language Switcher Mobile */}
            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1 rounded-lg border border-subtle bg-dominant text-secondary text-xs font-bold flex items-center gap-1"
            >
              <Globe className="w-3 h-3 text-accent" />
              <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-muted hover:text-accent transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-muted hover:text-secondary hover:bg-accent-tint focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent cursor-pointer"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-subtle bg-surface">
          <div className="pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block pl-3 pr-4 py-2 border-l-4 rtl:border-l-0 rtl:border-r-4 text-base font-bold ${
                  isActive(link.path)
                    ? 'bg-accent-tint border-accent text-accent'
                    : 'border-transparent text-muted hover:bg-accent-tint hover:border-default hover:text-secondary'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
