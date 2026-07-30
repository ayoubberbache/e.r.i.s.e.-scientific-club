import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Camera, CalendarCheck, Lightbulb, AlertCircle, Loader2, Sparkles, UserPlus, XCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

// Simple XSS sanitizer for safe display and transmission
function sanitizeInput(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function RegisterPage() {
  const [isRegOpen, setIsRegOpen] = useState<boolean | null>(null); // null = checking DB
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studyYear, setStudyYear] = useState<number | ''>('');
  const [specialization, setSpecialization] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [honeypot, setHoneypot] = useState(''); // Anti-bot honeypot field
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);

  const specRequired = typeof studyYear === 'number' && studyYear >= 3;

  useEffect(() => {
    async function checkRegistrationStatus() {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'registration_open')
          .single();

        if (error || !data) {
          setIsRegOpen(false);
        } else {
          setIsRegOpen(data.value === 'true');
        }
      } catch {
        setIsRegOpen(false);
      }
    }
    checkRegistrationStatus();
  }, []);

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

    // 1. Anti-bot honeypot check (hidden field filled by automated bots)
    if (honeypot.trim() !== '') {
      // Fake success for bots
      setSuccess(true);
      return;
    }

    // 2. Client-side rate limiting (prevent multiple clicks within 10 seconds)
    const now = Date.now();
    if (now - lastSubmitTime < 10000) {
      setError('Please wait a few seconds before trying again.');
      return;
    }

    // 3. Strict Input Validation & Sanitization
    const cleanName = sanitizeInput(fullName.trim());
    const cleanEmail = sanitizeInput(email.trim().toLowerCase());
    const cleanPhone = sanitizeInput(phone.trim());

    if (!cleanName || !cleanEmail || !cleanPhone || studyYear === '') {
      setError('Please fill in all required fields.');
      return;
    }

    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    // Phone regex validation (basic phone format check)
    const phoneRegex = /^[0-9+\s-]{8,20}$/;
    if (!phoneRegex.test(phone.trim())) {
      setError('Please enter a valid phone number.');
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
    setLastSubmitTime(now);

    try {
      // 4. Secure Supabase Insert (Uses parameterized queries natively preventing SQL injection)
      const payload = {
        full_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        study_year: studyYear as number,
        specialization: specRequired ? sanitizeInput(specialization) : null,
        departments: selectedDepartments.map(d => sanitizeInput(d)),
      };

      const { error: insertError } = await supabase.from('registrations').insert([payload]);

      if (insertError) throw insertError;

      // 5. Send notification email via Vercel serverless route
      fetch('/api/send-registration-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err) => console.warn('Email notification dispatch error:', err));

      setSuccess(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isRegOpen === null) {
    return (
      <div className="min-h-screen bg-dominant flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!isRegOpen) {
    return (
      <div className="min-h-[85vh] bg-dominant flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-surface border border-subtle rounded-3xl p-8 text-center shadow-xl"
        >
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-3">Registrations are Closed</h1>
          <p className="text-secondary text-sm leading-relaxed mb-8">
            Thank you for your interest in E.R.I.S.E. Scientific Club. Registrations are currently closed. Follow our social channels to stay updated on our next intake!
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent-muted transition-colors shadow-lg shadow-accent/20"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dominant py-12 md:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Top bar */}
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-accent transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Official Registration Form
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface border border-subtle rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent via-[var(--laser-aqua)] to-accent" />

          {/* Form Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight mb-2">
              Join <span className="text-accent">E.R.I.S.E.</span> Scientific Club
            </h1>
            <p className="text-secondary text-sm md:text-base leading-relaxed">
              Fill out the form below to apply for membership. Be part of the innovation for renewable energy and environmental sustainability.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center"
              >
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold text-primary mb-3">Welcome to E.R.I.S.E.! 🎉</h2>
                <p className="text-secondary max-w-md mx-auto leading-relaxed mb-8">
                  Your application has been received successfully! A confirmation details summary was dispatched, and our team will get in touch with you soon.
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-accent text-white font-bold hover:bg-accent-muted transition-colors shadow-lg shadow-accent/20"
                >
                  Return to Homepage
                </Link>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleSubmit}
                className="space-y-8"
              >
                {/* Honeypot field for anti-spam (hidden from users) */}
                <input
                  type="text"
                  name="website_url_check"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  style={{ display: 'none' }}
                  tabIndex={-1}
                  autoComplete="off"
                />

                {/* Error Banner */}
                {error && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Section 1: Personal Info */}
                <div>
                  <h2 className="text-xs font-bold text-accent uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[10px]">1</span>
                    Personal Details
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-secondary mb-1.5">
                        Full Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Ahmed Benali"
                        className="w-full bg-dominant border border-subtle rounded-xl px-4 py-3 text-primary placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1.5">
                        Email Address <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        maxLength={120}
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
                        maxLength={25}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 0555 00 00 00"
                        className="w-full bg-dominant border border-subtle rounded-xl px-4 py-3 text-primary placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Academic Info */}
                <div>
                  <h2 className="text-xs font-bold text-accent uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[10px]">2</span>
                    Academic Background
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1.5">
                        Study Year <span className="text-red-400">*</span>
                      </label>
                      <select
                        required
                        value={studyYear}
                        onChange={(e) => setStudyYear(e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-dominant border border-subtle rounded-xl px-4 py-3 text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors cursor-pointer"
                      >
                        <option value="">Select year...</option>
                        <option value={1}>1st Year (No Specialization)</option>
                        <option value={2}>2nd Year (No Specialization)</option>
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
                        className={`w-full border rounded-xl px-4 py-3 focus:outline-none transition-colors ${
                          specRequired
                            ? 'bg-dominant border-subtle text-primary focus:border-accent focus:ring-1 focus:ring-accent/30 cursor-pointer'
                            : 'bg-dominant/50 border-subtle/50 text-muted cursor-not-allowed opacity-50'
                        }`}
                      >
                        <option value="">{specRequired ? 'Select specialization...' : 'Blocked for 1st & 2nd year'}</option>
                        {SPECIALIZATIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Department Choice */}
                <div>
                  <h2 className="text-xs font-bold text-accent uppercase tracking-wider mb-1 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[10px]">3</span>
                    Choose Department(s) <span className="text-red-400">*</span>
                  </h2>
                  <p className="text-xs text-muted mb-4 ml-8">Select one or multiple departments you want to contribute to.</p>
                  <div className="grid grid-cols-1 gap-3">
                    {DEPARTMENTS.map((dept) => {
                      const isSelected = selectedDepartments.includes(dept.name);
                      const Icon = dept.icon;
                      return (
                        <motion.div
                          key={dept.id}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => toggleDepartment(dept.name)}
                          className={`relative flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'border-accent bg-accent/5 shadow-md shadow-accent/10'
                              : 'border-subtle bg-dominant hover:border-accent/40 hover:bg-accent/[0.02]'
                          }`}
                        >
                          <div
                            className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                              isSelected ? 'border-accent bg-accent' : 'border-subtle bg-surface'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-accent/15 text-accent' : 'bg-subtle/30 text-muted'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`block font-bold text-base transition-colors ${isSelected ? 'text-accent' : 'text-primary'}`}>
                              {dept.name}
                            </span>
                            <span className="block text-xs text-muted mt-1 leading-relaxed">
                              {dept.description}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-subtle flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-10 py-3.5 rounded-xl font-bold bg-accent text-white hover:bg-accent-muted transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-accent/25 text-base"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" /> Submit Registration
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
