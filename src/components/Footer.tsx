import React from 'react';
import { Mail, MapPin, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { CONTACT } from '../data/siteData';
import { useLanguage } from '../contexts/LanguageContext';

export function Footer() {
  const { t, language } = useLanguage();

  return (
    <footer className="bg-surface text-primary border-t border-subtle transition-colors pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 text-left rtl:text-right">
          
          {/* Brand & Purpose (Col 1-5) */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="inline-block focus:outline-none">
              <Logo variant="full" className="h-10 sm:h-12 w-auto" />
            </Link>
            <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-sm">
              {t.home.heroSubtitle}
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-dominant border border-subtle text-[11px] font-medium text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                {language === 'ar' ? 'المدرسة الوطنية العليا للطاقات المتجددة' : 'HNSRE Batna — Algeria'}
              </span>
            </div>
          </div>

          {/* Quick Links (Col 5-7) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
              {t.common.quickLinks}
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm font-medium">
              <li>
                <Link to="/" className="text-muted hover:text-accent transition-colors">
                  {t.nav.home}
                </Link>
              </li>
              <li>
                <Link to="/events" className="text-muted hover:text-accent transition-colors">
                  {t.nav.events}
                </Link>
              </li>
              <li>
                <Link to="/team" className="text-muted hover:text-accent transition-colors">
                  {t.nav.team}
                </Link>
              </li>
              <li>
                <Link to="/achievements" className="text-muted hover:text-accent transition-colors">
                  {t.nav.achievements}
                </Link>
              </li>
            </ul>
          </div>

          {/* Campus & Contact (Col 8-10) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
              {t.common.contactUs}
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm font-medium text-muted">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span className="leading-snug">{t.common.address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-accent shrink-0" />
                <a 
                  href={`mailto:${CONTACT.email}`} 
                  className="hover:text-accent transition-colors dir-ltr font-mono text-xs sm:text-sm"
                >
                  {CONTACT.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Connect & Social Channels (Col 11-12) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
              {t.common.connectWithUs}
            </h3>
            <div className="space-y-2">
              <a 
                href="https://www.instagram.com/erise.club?igsh=MTlyeGlzbGFzbndmOA==" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-between p-2 rounded-lg border border-subtle bg-dominant/50 hover:bg-dominant hover:border-accent text-secondary hover:text-primary transition-colors text-xs font-semibold group"
              >
                <div className="flex items-center gap-2.5">
                  <img src={`${import.meta.env.BASE_URL}instagram.png`} alt="Instagram" className="w-4 h-4 object-contain" />
                  <span>Instagram</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-accent transition-colors" />
              </a>

              <a 
                href="https://www.linkedin.com/in/erise-club-037589391" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-between p-2 rounded-lg border border-subtle bg-dominant/50 hover:bg-dominant hover:border-accent text-secondary hover:text-primary transition-colors text-xs font-semibold group"
              >
                <div className="flex items-center gap-2.5">
                  <img src={`${import.meta.env.BASE_URL}linkedin.png`} alt="LinkedIn" className="w-4 h-4 object-contain" />
                  <span>LinkedIn</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-accent transition-colors" />
              </a>

              <a 
                href={`mailto:${CONTACT.email}`} 
                className="flex items-center justify-between p-2 rounded-lg border border-subtle bg-dominant/50 hover:bg-dominant hover:border-accent text-secondary hover:text-primary transition-colors text-xs font-semibold group"
              >
                <div className="flex items-center gap-2.5">
                  <img src={`${import.meta.env.BASE_URL}gmail.png`} alt="Gmail" className="w-4 h-4 object-contain" />
                  <span>Direct Mail</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-accent transition-colors" />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <p>© {new Date().getFullYear()} E.R.I.S.E. Scientific Club. {t.common.allRightsReserved}</p>
          <p className="text-[11px] text-muted/80">
            Higher National School of Renewable Energies, Environment & Sustainable Development
          </p>
        </div>

      </div>
    </footer>
  );
}
