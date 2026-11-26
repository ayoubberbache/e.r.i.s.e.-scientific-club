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
    try {
      if (sessionStorage.getItem(DISMISSED_KEY)) return;
    } catch {}

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
      } catch {}
    }

    check();
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, 'true');
    } catch {}
  };

  const handleRegister = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, 'true');
    } catch {}
    navigate('/register');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
          dir={isRtl ? 'rtl' : 'ltr'}
          className={`fixed bottom-5 z-50 w-full max-w-sm ${isRtl ? 'left-5' : 'right-5'} px-4 sm:px-0`}
        >
          <div className="bg-surface border border-default rounded-xl shadow-md p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-accent mb-1">
                  {language === 'ar' ? 'التسجيلات مفتوحة' : 'Recruitment Open'}
                </span>
                <h4 className="font-display font-bold text-sm text-primary">
                  {language === 'ar' ? 'انضم إلى نادي إيريس العلمي' : 'Join E.R.I.S.E. Scientific Club'}
                </h4>
                <p className="text-xs text-secondary mt-1">
                  {language === 'ar'
                    ? 'سجل الآن في أقسام المشاريع أو التنظيم أو الإعلام.'
                    : 'Apply now for Projects, Organization, or Media departments.'}
                </p>
              </div>
              <button
                onClick={dismiss}
                className="p-1 rounded-lg text-muted hover:text-primary hover:bg-secondary transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={dismiss}
                className="text-xs font-semibold text-muted hover:text-primary px-3 py-1.5 cursor-pointer"
              >
                {language === 'ar' ? 'لاحقاً' : 'Later'}
              </button>
              <button
                onClick={handleRegister}
                className="btn-primary text-xs py-1.5 px-3"
              >
                <span>{t.nav.register}</span>
                {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
