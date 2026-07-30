import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, CheckCircle, Camera, CalendarCheck, Lightbulb, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SPECIALIZATIONS = ['IRIIA', 'µE', 'ENR', 'HV', 'GE'];

const DEPARTMENTS = [
  {
    id: 'media',
    name: 'Media',
    icon: Camera,
    description: 'Content creation, social media management, photography, videography, and visual storytelling for the club.',
  },
  {
    id: 'organization',
    name: 'Organization',
    icon: CalendarCheck,
    description: 'Event planning, logistics, member coordination, scheduling, and smooth club operations.',
  },
  {
    id: 'projects',
    name: 'Projects',
    icon: Lightbulb,
    description: 'Technical projects, research initiatives, prototyping, and hands-on engineering solutions.',
  },
];

export function RegistrationModal({ isOpen, onClose }: RegistrationModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studyYear, setStudyYear] = useState<number | ''>('');
  const [specialization, setSpecialization] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const specRequired = typeof studyYear === 'number' && studyYear >= 3;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFullName('');
      setEmail('');
      setPhone('');
      setStudyYear('');
      setSpecialization('');
      setSelectedDepartments([]);
      setSuccess(false);
      setError('');
    }
  }, [isOpen]);

  // Clear specialization when switching to year 1-2
  useEffect(() => {
    if (typeof studyYear === 'number' && studyYear <= 2) {
      setSpecialization('');
    }
  }, [studyYear]);

  const toggleDepartment = (deptName: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(deptName) ? prev.filter((d) => d !== deptName) : [...prev, deptName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!fullName.trim() || !email.trim() || !phone.trim() || studyYear === '') {
      setError('Please fill in all required fields.');
      return;
    }
    if (specRequired && !specialization) {
      setError('Please select your specialization.');
      return;
    }
    if (selectedDepartments.length === 0) {
      setError('Please select at least one department.');
      return;
    }

    setSubmitting(true);

    try {
      // Insert into Supabase
      const payload = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        study_year: studyYear as number,
        specialization: specRequired ? specialization : null,
        departments: selectedDepartments,
      };

      const { error: insertError } = await supabase.from('registrations').insert([payload]);

      if (insertError) throw insertError;

      // Send email notification (fire & forget — don't block on email failure)
      fetch('/api/send-registration-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err) => console.warn('Email notification failed:', err));

      setSuccess(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-surface border border-subtle rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-subtle flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-primary">Join E.R.I.S.E.</h2>
                <p className="text-sm text-muted mt-1">Register to become a club member</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-muted hover:text-primary hover:bg-subtle/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.15, bounce: 0.5 }}
                    >
                      <CheckCircle className="w-20 h-20 text-emerald-500 mb-6" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-primary mb-3">Welcome aboard! 🎉</h3>
                    <p className="text-secondary max-w-sm leading-relaxed">
                      Your registration has been submitted successfully. We'll be in touch soon — get ready to make an impact!
                    </p>
                    <button
                      onClick={onClose}
                      className="mt-8 px-8 py-3 rounded-xl bg-accent text-white font-bold hover:bg-accent-muted transition-colors shadow-lg shadow-accent/20"
                    >
                      Done
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSubmit}
                    id="registration-form"
                    className="space-y-6"
                  >
                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 text-red-500 text-sm"
                        >
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Personal Information */}
                    <div>
                      <h3 className="text-sm font-bold text-accent uppercase tracking-wider mb-4">Personal Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-secondary mb-1.5">
                            Full Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. Ahmed Benali"
                            className="w-full bg-dominant border border-subtle rounded-xl px-4 py-3 text-primary placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1.5">
                            Email <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full bg-dominant border border-subtle rounded-xl px-4 py-3 text-primary placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1.5">
                            Phone Number <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. 0555 00 00 00"
                            className="w-full bg-dominant border border-subtle rounded-xl px-4 py-3 text-primary placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div>
                      <h3 className="text-sm font-bold text-accent uppercase tracking-wider mb-4">Academic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1.5">
                            Study Year <span className="text-red-400">*</span>
                          </label>
                          <select
                            required
                            value={studyYear}
                            onChange={(e) => setStudyYear(e.target.value ? Number(e.target.value) : '')}
                            className="w-full bg-dominant border border-subtle rounded-xl px-4 py-3 text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors appearance-none cursor-pointer"
                          >
                            <option value="">Select year...</option>
                            <option value={1}>1st Year</option>
                            <option value={2}>2nd Year</option>
                            <option value={3}>3rd Year</option>
                            <option value={4}>4th Year</option>
                            <option value={5}>5th Year</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1.5">
                            Specialization {specRequired && <span className="text-red-400">*</span>}
                          </label>
                          <select
                            value={specialization}
                            onChange={(e) => setSpecialization(e.target.value)}
                            disabled={!specRequired}
                            required={specRequired}
                            className={`w-full border rounded-xl px-4 py-3 focus:outline-none transition-colors appearance-none ${
                              specRequired
                                ? 'bg-dominant border-subtle text-primary focus:border-accent focus:ring-1 focus:ring-accent/30 cursor-pointer'
                                : 'bg-dominant/50 border-subtle/50 text-muted cursor-not-allowed opacity-50'
                            }`}
                          >
                            <option value="">{specRequired ? 'Select specialization...' : 'Not applicable'}</option>
                            {SPECIALIZATIONS.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          {!specRequired && studyYear !== '' && (
                            <p className="text-xs text-muted mt-1.5">No specialization for 1st & 2nd year students</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Department Selection */}
                    <div>
                      <h3 className="text-sm font-bold text-accent uppercase tracking-wider mb-1">
                        Departments <span className="text-red-400">*</span>
                      </h3>
                      <p className="text-xs text-muted mb-4">Select the departments you'd like to join — you can pick multiple.</p>
                      <div className="grid grid-cols-1 gap-3">
                        {DEPARTMENTS.map((dept) => {
                          const isSelected = selectedDepartments.includes(dept.name);
                          const Icon = dept.icon;
                          return (
                            <motion.button
                              key={dept.id}
                              type="button"
                              whileTap={{ scale: 0.98 }}
                              onClick={() => toggleDepartment(dept.name)}
                              className={`relative flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                                isSelected
                                  ? 'border-accent bg-accent/5 shadow-md shadow-accent/10'
                                  : 'border-subtle bg-dominant hover:border-accent/40 hover:bg-accent/[0.02]'
                              }`}
                            >
                              {/* Checkbox indicator */}
                              <div
                                className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                                  isSelected
                                    ? 'border-accent bg-accent'
                                    : 'border-subtle bg-surface'
                                }`}
                              >
                                <AnimatePresence>
                                  {isSelected && (
                                    <motion.svg
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0, opacity: 0 }}
                                      transition={{ type: 'spring', duration: 0.3, bounce: 0.5 }}
                                      className="w-3.5 h-3.5 text-white"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={3}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </motion.svg>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* Icon */}
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 ${
                                  isSelected ? 'bg-accent/15 text-accent' : 'bg-subtle/30 text-muted'
                                }`}
                              >
                                <Icon className="w-5 h-5" />
                              </div>

                              {/* Text */}
                              <div className="flex-1 min-w-0">
                                <span className={`block font-bold text-sm transition-colors ${isSelected ? 'text-accent' : 'text-primary'}`}>
                                  {dept.name}
                                </span>
                                <span className="block text-xs text-muted mt-0.5 leading-relaxed">
                                  {dept.description}
                                </span>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Footer — hidden on success */}
            {!success && (
              <div className="p-6 border-t border-subtle flex justify-end gap-3 shrink-0 bg-dominant/50">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl font-medium text-secondary hover:bg-subtle/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  form="registration-form"
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2.5 rounded-xl font-bold bg-accent text-white hover:bg-accent-muted transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-accent/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    'Register'
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
