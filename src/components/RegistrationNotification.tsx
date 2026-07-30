import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RegistrationModal } from './RegistrationModal';

const DISMISSED_KEY = 'erise_reg_notif_dismissed';

export function RegistrationNotification() {
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    async function check() {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'registration_open')
          .single();

        if (data?.value === 'true') {
          // Small delay so it feels like a real notification arriving
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
    sessionStorage.setItem(DISMISSED_KEY, 'true');
  };

  const handleRegister = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setShowModal(true);
  };

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.6, bounce: 0.3 }}
            className="fixed bottom-6 right-6 z-[90] max-w-sm w-full pointer-events-auto"
          >
            <div className="bg-surface border border-subtle rounded-2xl shadow-2xl overflow-hidden">
              {/* Accent top bar */}
              <div className="h-1 bg-gradient-to-r from-accent via-[var(--laser-aqua)] to-accent" />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary leading-tight">Registrations are Open!</h4>
                      <p className="text-xs text-muted mt-0.5">E.R.I.S.E. Scientific Club</p>
                    </div>
                  </div>
                  <button
                    onClick={dismiss}
                    className="p-1 text-muted hover:text-primary hover:bg-subtle/50 rounded-lg transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <p className="text-sm text-secondary leading-relaxed mb-4">
                  Join our community of engineers working on renewable energy and sustainability. Sign up now!
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRegister}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent-muted transition-colors shadow-lg shadow-accent/20"
                  >
                    Register Now
                  </button>
                  <button
                    onClick={dismiss}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-subtle/50 transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <RegistrationModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
