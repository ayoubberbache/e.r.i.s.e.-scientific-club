import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { useSiteData } from '../contexts/SiteDataContext';

export function Footer() {
  const { footer } = useSiteData();

  return (
    <footer className="bg-secondary text-primary pt-16 pb-8 border-t border-default">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand & Description */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <Logo variant="full" className="h-12 w-auto" />
            </div>
            <p className="text-sm text-muted leading-relaxed mb-6">
              Engineers For renewable Energy Innovation & Environmental sustainability. 
              A scientific club at the Higher National School of Renewable Energies, Environment, and Sustainable Development (Batna, Algeria).
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-primary font-semibold mb-6 uppercase tracking-wider text-sm">Quick Links</h3>
            <ul className="space-y-4 text-sm">
              <li><Link to="/" className="hover:text-accent transition-colors">Home</Link></li>
              <li><Link to="/events" className="hover:text-accent transition-colors">Events & Calendar</Link></li>
              <li><Link to="/team" className="hover:text-accent transition-colors">Our Team</Link></li>
              <li><Link to="/achievements" className="hover:text-accent transition-colors">Achievements</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-primary font-semibold mb-6 uppercase tracking-wider text-sm">Contact Us</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-accent shrink-0" />
                <span>{footer.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-accent shrink-0" />
                <a href={`mailto:${footer.email}`} className="hover:text-primary transition-colors">{footer.email}</a>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-primary font-semibold mb-6 uppercase tracking-wider text-sm">Connect With Us</h3>
            <div className="flex flex-col gap-4">
              <a href="https://www.instagram.com/erise.club?igsh=MTlyeGlzbGFzbndmOA==" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:opacity-80 transition-opacity" title="Instagram">
                <img src={`${import.meta.env.BASE_URL}instagram.png`} alt="Instagram" className="w-6 h-6 object-contain" />
                <span className="text-sm">Instagram</span>
              </a>
              <a href={`mailto:${footer.email}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity" title="Gmail">
                <img src={`${import.meta.env.BASE_URL}gmail.png`} alt="Gmail" className="w-6 h-6 object-contain" />
                <span className="text-sm">Gmail</span>
              </a>
              <a href="https://www.linkedin.com/in/erise-club-037589391?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:opacity-80 transition-opacity" title="LinkedIn">
                <img src={`${import.meta.env.BASE_URL}linkedin.png`} alt="LinkedIn" className="w-6 h-6 object-contain" />
                <span className="text-sm">LinkedIn</span>
              </a>
            </div>
          </div>

        </div>

        <div className="border-t border-default pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted">
          <p>&copy; {new Date().getFullYear()} E.R.I.S.E. Scientific Club. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
