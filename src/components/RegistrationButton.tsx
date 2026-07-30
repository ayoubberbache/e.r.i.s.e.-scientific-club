import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserPlus, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RegistrationModal } from './RegistrationModal';

export function RegistrationButton() {
  const [isOpen, setIsOpen] = useState<boolean | null>(null); // null = loading
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function checkRegistration() {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'registration_open')
          .single();

        if (error) {
          console.warn('Could not fetch registration status:', error);
          setIsOpen(false);
          return;
        }

        setIsOpen(data?.value === 'true');
      } catch {
        setIsOpen(false);
      }
    }

    checkRegistration();
  }, []);

  // Don't render while loading
  if (isOpen === null) return null;

  if (!isOpen) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-surface border border-subtle text-muted font-medium text-sm cursor-default select-none"
      >
        <XCircle className="w-5 h-5 opacity-60" />
        Registrations Closed
      </motion.div>
    );
  }

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowModal(true)}
        className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-accent text-white font-bold text-base shadow-xl shadow-accent/25 hover:shadow-2xl hover:shadow-accent/35 transition-shadow overflow-hidden"
      >
        {/* Animated shine effect */}
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-2xl animate-ping opacity-[0.08] bg-accent pointer-events-none" />

        <UserPlus className="w-5 h-5 relative z-10" />
        <span className="relative z-10">Register Now</span>
      </motion.button>

      <RegistrationModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
