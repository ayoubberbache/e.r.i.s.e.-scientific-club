import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

const DISMISSED_KEY = 'erise_reg_notif_dismissed';

export function RegistrationNotification() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Safe storage check
    try {
      if (sessionStorage.getItem(DISMISSED_KEY)) return;
    } catch {
      // storage access blocked
    }

    async function check() {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'registration_open')
          .maybeSingle();

        if (!error && data?.value === 'true') {
          setTimeout(() => setVisible(true), 1500);
        }
      } catch {
        // silently fail
      }
    }

    check();
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const handleRegister = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // ignore
    }
    navigate('/register');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', duration: 0.6, bounce: 0.3 }}
          className="fixed bottom-6 right-6 rtl:right-auto rtl:left-6 z-[90] max-w-sm w-full pointer-events-auto"
        >
          <div className="bg-surface border border-subtle rounded-2xl shadow-2xl overflow-hidden text-left rtl:text-right">
            {/* Accent top bar */}
            <div className="h-1 bg-gradient-to-r from-accent via-[#00e5ff] to-accent" />

            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-primary leading-tight">{t.toast.regOpenTitle}</h4>
                    <p className="text-xs text-muted mt-0.5">{t.clubShortName}</p>
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  className="p-1 text-muted hover:text-primary hover:bg-subtle/50 rounded-lg transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <p className="text-sm text-secondary leading-relaxed mb-4">
                {t.toast.regOpenDesc}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRegister}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent-muted transition-colors shadow-lg shadow-accent/20 cursor-pointer"
                >
                  {t.toast.registerNow}
                </button>
                <button
                  onClick={dismiss}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-subtle/50 transition-colors cursor-pointer"
                >
                  {t.toast.later}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
