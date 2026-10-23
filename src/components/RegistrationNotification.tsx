import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

const DISMISSED_KEY = 'erise_reg_notif_dismissed';

export function RegistrationNotification() {
  const { language, t } = useLanguage();
  const isRtl = language === 'ar';
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
          setTimeout(() => setVisible(true), 1200);
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
        <motion.aside
          aria-label="Recruitment Notification"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="fixed bottom-5 right-5 rtl:right-auto rtl:left-5 z-[90] max-w-sm w-[calc(100vw-2.5rem)] pointer-events-auto text-left rtl:text-right"
        >
          <div className="card panel p-4 shadow-2xl backdrop-blur-xl border border-subtle relative overflow-hidden group">
            {/* Subtle Ambient Glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-accent/15 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between gap-3 relative z-10">
              {/* Header Info */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <h4 className="text-sm font-extrabold text-primary tracking-tight leading-snug">
                  {t.clubFullName}
                </h4>

                <p className="text-xs text-secondary leading-relaxed line-clamp-2">
                  {t.toast.regOpenDesc}
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={dismiss}
                aria-label="Dismiss notification"
                className="p-1 rounded-md text-muted hover:text-primary hover:bg-secondary/60 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Bar */}
            <div className="mt-3.5 pt-3 border-t border-subtle/70 flex items-center justify-between gap-3 relative z-10">
              <button
                onClick={dismiss}
                className="text-xs font-semibold text-muted hover:text-primary transition-colors cursor-pointer px-1 py-1"
              >
                {t.toast.later}
              </button>

              <button
                onClick={handleRegister}
                className="btn-primary text-xs py-2 px-4 font-bold shadow-md shadow-accent/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span>{t.toast.registerNow}</span>
                {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
