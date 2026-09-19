import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Camera, CalendarCheck, Lightbulb, AlertCircle, Loader2, UserPlus, XCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const SPECIALIZATIONS = ['IRIIA', 'µE', 'ENR', 'HV', 'GE'];

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
  const { language, t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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

  const isRtl = language === 'ar';
  const specRequired = typeof studyYear === 'number' && studyYear >= 3;

  const DEPARTMENTS = [
    {
      id: 'media',
      name: 'Media',
      displayName: t.registerPage.deptMediaTitle,
      icon: Camera,
      description: t.registerPage.deptMediaDesc,
    },
    {
      id: 'organization',
      name: 'Organization',
      displayName: t.registerPage.deptOrgTitle,
      icon: CalendarCheck,
      description: t.registerPage.deptOrgDesc,
    },
    {
      id: 'projects',
      name: 'Projects',
      displayName: t.registerPage.deptProjectsTitle,
      icon: Lightbulb,
      description: t.registerPage.deptProjectsDesc,
    },
  ];

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

    // Anti-bot honeypot check
    if (honeypot.trim() !== '') {
      return;
    }

    // Rate limiting: prevent submissions faster than 5 seconds apart
    const now = Date.now();
    if (now - lastSubmitTime < 5000) {
      setError(t.registerPage.rateLimitError);
      return;
    }

    // Sanitize and validate inputs
    const cleanName = sanitizeInput(fullName.trim());
    const cleanEmail = sanitizeInput(email.trim().toLowerCase());
    const cleanPhone = sanitizeInput(phone.trim());

    if (!cleanName || cleanName.length < 3) {
      setError(t.registerPage.nameTooShort);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError(t.registerPage.invalidEmail);
      return;
    }

    const phoneRegex = /^(\+213|0)(5|6|7)[0-9]{8}$/;
    if (!phoneRegex.test(cleanPhone.replace(/\s+/g, ''))) {
      setError(t.registerPage.invalidPhone);
      return;
    }

    if (!studyYear) {
      setError(t.registerPage.selectYear);
      return;
    }

    if (specRequired && !specialization) {
      setError(t.registerPage.selectSpec);
      return;
    }

    if (selectedDepartments.length === 0) {
      setError(t.registerPage.selectDeptError);
      return;
    }

    setSubmitting(true);
    setLastSubmitTime(now);

    try {
      const payload = {
        full_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        study_year: Number(studyYear),
        specialization: specRequired ? specialization : null,
        departments: selectedDepartments,
        status: 'pending',
      };

      // 1. Primary: Serverless API proxy
      let submitted = false;
      try {
        const res = await fetch('/api/submit-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) submitted = true;
        }
      } catch (e) {
        // Fallback to client Supabase insert
      }

      // 2. Direct Supabase Fallback
      if (!submitted) {
        const { error: insertError } = await supabase.from('registrations').insert([payload]);
        if (insertError) {
          if (insertError.code === '23505' || insertError.message.includes('unique')) {
            throw new Error(t.registerPage.duplicateError);
          }
          throw insertError;
        }
      }

      // Send confirmation email asynchronously
      fetch('/api/send-registration-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          fullName: cleanName,
          departments: selectedDepartments.join(', '),
        }),
      }).catch((err) => console.warn('Registration email trigger warning:', err));

      setSuccess(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || t.registerPage.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  if (isRegOpen === null) {
    return (
      <div className={`min-h-[85vh] flex items-center justify-center p-4 ${isDark ? 'bg-[#0a1628]' : 'bg-[#f8fcfd]'}`}>
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-[#00e5ff]' : 'text-[#0d5c63]'}`} />
      </div>
    );
  }

  if (isRegOpen === false) {
    return (
      <div className={`min-h-[85vh] flex items-center justify-center p-6 text-center rtl:text-right ${isDark ? 'bg-[#0a1628] text-slate-100' : 'bg-[#f8fcfd] text-slate-900'}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-md w-full border p-8 text-center shadow-sm ${isDark ? 'bg-[#0f2537] border-slate-800' : 'bg-white border-slate-200'}`}
        >
          <div className="w-12 h-12 bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200">
            <XCircle className="w-6 h-6" />
          </div>
          <h1 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.registerPage.closedTitle}</h1>
          <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t.registerPage.closedDesc}
          </p>
          <Link
            to="/"
            className={`inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold border transition-colors ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{t.registerPage.backHome}</span>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-10 md:py-16 px-4 sm:px-6 lg:px-8 text-left rtl:text-right transition-colors duration-200 ${
      isDark ? 'bg-[#0a1628] text-slate-100' : 'bg-[#f8fcfd] text-slate-900'
    }`}>
      <div className="max-w-3xl mx-auto">
        {/* Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors ${
              isDark ? 'text-slate-400 hover:text-[#00e5ff]' : 'text-slate-600 hover:text-[#0d5c63]'
            }`}
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{t.registerPage.backHome}</span>
          </Link>
          <span className={`text-xs font-mono font-medium px-2.5 py-1 border ${
            isDark ? 'bg-slate-800 border-slate-700 text-[#00e5ff]' : 'bg-teal-50 border-teal-200 text-[#0d5c63]'
          }`}>
            {t.registerPage.badge}
          </span>
        </div>

        {/* Card */}
        <div className={`border p-6 sm:p-10 shadow-xs transition-colors duration-200 ${
          isDark ? 'bg-[#0f2537] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Header */}
          <div className={`border-b pb-6 mb-8 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {t.registerPage.title}
            </h1>
            <p className={`text-sm leading-relaxed ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {t.registerPage.subtitle}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-10 text-center"
              >
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t.registerPage.successTitle}
                </h2>
                <p className={`text-sm max-w-md mx-auto leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t.registerPage.successDesc}
                </p>
                <Link
                  to="/"
                  className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold border transition-colors ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  }`}
                >
                  {t.registerPage.backHome}
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Honeypot field */}
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
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Section 1: Personal Details */}
                <div className="space-y-4">
                  <h2 className={`text-xs font-bold uppercase tracking-wider ${
                    isDark ? 'text-[#00e5ff]' : 'text-[#0d5c63]'
                  }`}>
                    {language === 'ar' ? '1. البيانات الشخصية' : '1. Personal Details'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {t.registerPage.fullName} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t.registerPage.fullNamePlaceholder}
                        className={`w-full px-3.5 py-2 text-sm border transition-colors ${
                          isDark
                            ? 'bg-slate-950 border-slate-800 text-white focus:border-[#00e5ff] focus:outline-none'
                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-[#0d5c63] focus:outline-none'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {t.registerPage.email} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        maxLength={120}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t.registerPage.emailPlaceholder}
                        className={`w-full px-3.5 py-2 text-sm border transition-colors dir-ltr ${
                          isDark
                            ? 'bg-slate-950 border-slate-800 text-white focus:border-[#00e5ff] focus:outline-none'
                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-[#0d5c63] focus:outline-none'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {t.registerPage.phone} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={25}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={t.registerPage.phonePlaceholder}
                        className={`w-full px-3.5 py-2 text-sm border transition-colors dir-ltr ${
                          isDark
                            ? 'bg-slate-950 border-slate-800 text-white focus:border-[#00e5ff] focus:outline-none'
                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-[#0d5c63] focus:outline-none'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Academic Background */}
                <div className="space-y-4 pt-2">
                  <h2 className={`text-xs font-bold uppercase tracking-wider ${
                    isDark ? 'text-[#00e5ff]' : 'text-[#0d5c63]'
                  }`}>
                    {language === 'ar' ? '2. المستوى الأكاديمي والتخصص' : '2. Academic Background'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {t.registerPage.studyYear} <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={studyYear}
                        onChange={(e) => setStudyYear(e.target.value ? Number(e.target.value) : '')}
                        className={`w-full px-3.5 py-2 text-sm border transition-colors ${
                          isDark
                            ? 'bg-slate-950 border-slate-800 text-white focus:border-[#00e5ff] focus:outline-none'
                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-[#0d5c63] focus:outline-none'
                        }`}
                      >
                        <option value="">{t.registerPage.selectYear}</option>
                        <option value={1}>{language === 'ar' ? 'السنة الأولى (جذع مشترك)' : '1st Year (Preparatory)'}</option>
                        <option value={2}>{language === 'ar' ? 'السنة الثانية (جذع مشترك)' : '2nd Year (Preparatory)'}</option>
                        <option value={3}>{language === 'ar' ? 'السنة الثالثة (تخصص)' : '3rd Year (Specialization)'}</option>
                        <option value={4}>{language === 'ar' ? 'السنة الرابعة (هندسة / ماستر 1)' : '4th Year (Engineering)'}</option>
                        <option value={5}>{language === 'ar' ? 'السنة الخامسة (هندسة / ماستر 2)' : '5th Year (Graduation)'}</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {t.registerPage.specialization} {specRequired && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        disabled={!specRequired}
                        required={specRequired}
                        className={`w-full px-3.5 py-2 text-sm border transition-colors ${
                          specRequired
                            ? (isDark
                                ? 'bg-slate-950 border-slate-800 text-white focus:border-[#00e5ff] focus:outline-none'
                                : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-[#0d5c63] focus:outline-none')
                            : (isDark
                                ? 'bg-slate-900/40 border-slate-800/40 text-slate-500 cursor-not-allowed opacity-60'
                                : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60')
                        }`}
                      >
                        <option value="">{specRequired ? t.registerPage.selectSpec : (language === 'ar' ? 'متاح لطلبة السنة 3 فما فوق' : 'Available for 3rd year & above')}</option>
                        {SPECIALIZATIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Departments */}
                <div className="space-y-3 pt-2">
                  <h2 className={`text-xs font-bold uppercase tracking-wider ${
                    isDark ? 'text-[#00e5ff]' : 'text-[#0d5c63]'
                  }`}>
                    {t.registerPage.departmentsTitle} <span className="text-red-500">*</span>
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.registerPage.departmentsSubtitle}</p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {DEPARTMENTS.map((dept) => {
                      const isSelected = selectedDepartments.includes(dept.name);
                      const Icon = dept.icon;
                      return (
                        <div
                          key={dept.id}
                          onClick={() => toggleDepartment(dept.name)}
                          className={`p-3.5 border cursor-pointer transition-colors flex items-start gap-3.5 ${
                            isSelected
                              ? (isDark
                                  ? 'border-[#00e5ff] bg-[#00e5ff]/10 text-white'
                                  : 'border-[#0d5c63] bg-teal-50/70 text-slate-900')
                              : (isDark
                                  ? 'border-slate-800 bg-slate-900/40 hover:border-slate-700 text-slate-300'
                                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-800')
                          }`}
                        >
                          <div
                            className={`w-4 h-4 mt-0.5 border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? (isDark ? 'border-[#00e5ff] bg-[#00e5ff]' : 'border-[#0d5c63] bg-[#0d5c63]')
                                : (isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-white')
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <div className={`w-8 h-8 flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? (isDark ? 'bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff]/30' : 'bg-teal-100 text-[#0d5c63] border-teal-200')
                              : (isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-500 border-slate-200')
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`block text-sm font-bold ${
                              isSelected
                                ? (isDark ? 'text-[#00e5ff]' : 'text-[#0d5c63]')
                                : (isDark ? 'text-white' : 'text-slate-900')
                            }`}>
                              {dept.displayName}
                            </span>
                            <span className={`block text-xs mt-0.5 leading-relaxed ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              {dept.description}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit button */}
                <div className={`pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-2.5 px-6 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-xs ${
                      isDark
                        ? 'bg-[#00e5ff] hover:bg-[#5ef0ff] text-[#0a1628]'
                        : 'bg-[#0d5c63] hover:bg-[#0a4a50] text-white'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t.registerPage.submitting}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>{t.registerPage.submit}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
