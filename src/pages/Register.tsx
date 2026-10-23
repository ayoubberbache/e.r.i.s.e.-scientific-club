import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  ArrowRight,
  User,
  CreditCard,
  Mail,
  Phone,
  GraduationCap,
  Sparkles,
  Camera,
  CalendarCheck,
  Lightbulb
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sanitizeInput } from '../lib/security';
import { useLanguage } from '../contexts/LanguageContext';
import { STUDY_YEAR_OPTIONS } from '../data/studyYears';

const SPECIALIZATIONS = ['IRIIA', 'µE', 'ENR', 'HV', 'GE'];

export function RegisterPage() {
  const { language, t } = useLanguage();
  const isRtl = language === 'ar';

  const [isRegOpen, setIsRegOpen] = useState<boolean | null>(null); // null = checking DB
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studyYear, setStudyYear] = useState<string>(''); // option id like '1_st', '1_mi'
  const [specialization, setSpecialization] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [honeypot, setHoneypot] = useState(''); // Anti-bot honeypot field
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);

  const selectedYearOption = STUDY_YEAR_OPTIONS.find((o) => o.id === studyYear);
  const specRequired = !!selectedYearOption && selectedYearOption.yearNumber >= 3;

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
    if (selectedYearOption && selectedYearOption.yearNumber <= 2) {
      setSpecialization('');
    }
  }, [selectedYearOption]);

  const handleStudentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 12);
    setStudentId(val);
  };

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

    // Rate limiting: prevent submissions faster than 4 seconds apart
    const now = Date.now();
    if (now - lastSubmitTime < 4000) {
      setError(t.registerPage.rateLimitError);
      return;
    }

    // Sanitize and validate inputs
    const cleanName = sanitizeInput(fullName.trim());
    const cleanStudentId = studentId.replace(/\D/g, '').trim();
    const cleanEmail = sanitizeInput(email.trim().toLowerCase());
    const cleanPhone = sanitizeInput(phone.trim());

    if (!cleanName || cleanName.length < 3) {
      setError(t.registerPage.nameTooShort);
      return;
    }

    if (cleanStudentId.length !== 12) {
      setError(t.registerPage.invalidStudentId);
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

    if (!selectedYearOption) {
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
      const payload: any = {
        full_name: cleanName,
        student_id: cleanStudentId,
        email: cleanEmail,
        phone: cleanPhone,
        study_year: selectedYearOption.yearNumber,
        specialization: specRequired ? specialization : (selectedYearOption.branch === 'MI' ? 'MI' : null),
        departments: selectedDepartments,
      };

      // 1. Direct Supabase insert
      let { error: insertError } = await supabase.from('registrations').insert([payload]);

      // Graceful fallback if student_id column is pending SQL migration in Supabase
      if (insertError && (insertError.code === '42703' || insertError.message?.includes('student_id'))) {
        console.warn('student_id column not yet created in Supabase. Inserting with fallback...');
        const { student_id: _, ...fallbackPayload } = payload;
        const retry = await supabase.from('registrations').insert([fallbackPayload]);
        if (retry.error) throw retry.error;
      } else if (insertError) {
        if (insertError.code === '23505' || insertError.message.includes('unique')) {
          throw new Error(t.registerPage.duplicateError);
        }
        throw insertError;
      }

      // 2. Send notification email to admin via Resend with complete payload
      fetch('/api/send-registration-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: cleanName,
          student_id: cleanStudentId,
          email: cleanEmail,
          phone: cleanPhone,
          study_year: selectedYearOption.yearNumber,
          study_year_label: language === 'ar' ? selectedYearOption.labelAr : selectedYearOption.labelEn,
          branch: selectedYearOption.branch,
          specialization: specRequired ? specialization : (selectedYearOption.branch === 'MI' ? 'MI' : null),
          departments: selectedDepartments,
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
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-dominant">
        <div className="flex flex-col items-center gap-3 text-accent font-semibold text-sm">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span>{t.common.loading}</span>
        </div>
      </div>
    );
  }

  if (isRegOpen === false) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6 text-center rtl:text-right bg-dominant">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card panel max-w-md w-full p-8 sm:p-10 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <XCircle className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-primary mb-2">
            {t.registerPage.closedTitle}
          </h1>
          <p className="text-sm text-secondary leading-relaxed mb-6">
            {t.registerPage.closedDesc}
          </p>
          <Link
            to="/"
            className="btn-secondary px-6 py-2.5 text-xs sm:text-sm font-bold"
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{t.registerPage.backHome}</span>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 md:py-16 px-4 sm:px-6 lg:px-8 text-left rtl:text-right bg-dominant relative z-10">
      <div className="max-w-3xl mx-auto">
        {/* Navigation Bar */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-muted hover:text-accent transition-colors cursor-pointer"
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{t.registerPage.backHome}</span>
          </Link>

          <span className="badge">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.registerPage.badge}</span>
          </span>
        </div>

        {/* Form Container Card */}
        <div className="card panel p-6 sm:p-10 shadow-xl">
          {/* Header */}
          <div className="border-b border-subtle pb-6 mb-8">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-primary tracking-tight mb-2">
              {t.registerPage.title}
            </h1>
            <p className="text-xs sm:text-sm text-secondary leading-relaxed">
              {t.registerPage.subtitle}
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
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-500/5">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-primary mb-3">
                  {t.registerPage.successTitle}
                </h2>
                <p className="text-sm sm:text-base text-secondary max-w-md mx-auto leading-relaxed mb-8">
                  {t.registerPage.successDesc}
                </p>
                <Link
                  to="/"
                  className="btn-primary px-8 py-3 text-sm font-bold"
                >
                  <span>{t.registerPage.backHome}</span>
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Anti-bot Honeypot */}
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
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Section 1: Personal & Educational Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="w-6 h-6 rounded-lg bg-accent/15 text-accent font-extrabold text-xs flex items-center justify-center border border-accent/20">1</span>
                    <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-primary">
                      {language === 'ar' ? 'البيانات الشخصية ورقم التسجيل' : 'Personal & University Details'}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-secondary mb-1.5">
                        {t.registerPage.fullName} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-muted absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={t.registerPage.fullNamePlaceholder}
                          className="input-standard has-icon"
                        />
                      </div>
                    </div>

                    {/* Student Educational Number (Matricule Étudiant - 12 Digits) */}
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-secondary">
                          {t.registerPage.studentId} <span className="text-red-500">*</span>
                        </label>
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-bold transition-colors ${
                          studentId.length === 12 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : 'bg-secondary text-muted'
                        }`}>
                          {studentId.length}/12 {studentId.length === 12 ? '✓' : ''}
                        </span>
                      </div>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 text-muted absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]{12}"
                          maxLength={12}
                          required
                          value={studentId}
                          onChange={handleStudentIdChange}
                          placeholder={t.registerPage.studentIdPlaceholder}
                          className="input-standard has-icon font-mono tracking-wider text-sm"
                        />
                      </div>
                      <p className="text-[11px] text-muted mt-1 leading-normal">
                        {t.registerPage.studentIdHint}
                      </p>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1.5">
                        {t.registerPage.email} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-muted absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t.registerPage.emailPlaceholder}
                          className="input-standard has-icon"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1.5">
                        {t.registerPage.phone} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-muted absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder={t.registerPage.phonePlaceholder}
                          className="input-standard has-icon"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Academic Background */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="w-6 h-6 rounded-lg bg-accent/15 text-accent font-extrabold text-xs flex items-center justify-center border border-accent/20">2</span>
                    <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-primary">
                      {language === 'ar' ? 'المستوى الدراسي والتخصص' : 'Academic Background'}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Year */}
                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1.5">
                        {t.registerPage.studyYear} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <GraduationCap className="w-4 h-4 text-muted absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          required
                          value={studyYear}
                          onChange={(e) => setStudyYear(e.target.value)}
                          className="input-standard has-icon cursor-pointer appearance-none"
                        >
                          <option value="">{t.registerPage.selectYear}</option>
                          {STUDY_YEAR_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {language === 'ar' ? opt.labelAr : opt.labelEn}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Specialization */}
                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1.5">
                        {t.registerPage.specialization} {specRequired && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        disabled={!specRequired}
                        required={specRequired}
                        className={`input-standard cursor-pointer appearance-none ${
                          !specRequired ? 'opacity-60 cursor-not-allowed bg-secondary/50' : ''
                        }`}
                      >
                        <option value="">
                          {specRequired 
                            ? t.registerPage.selectSpec 
                            : (language === 'ar' ? 'متاح لطلبة السنة 3 فما فوق' : 'Available for 3rd year & above')}
                        </option>
                        {SPECIALIZATIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Department Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="w-6 h-6 rounded-lg bg-accent/15 text-accent font-extrabold text-xs flex items-center justify-center border border-accent/20">3</span>
                    <div>
                      <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-primary">
                        {t.registerPage.departmentsTitle} <span className="text-red-500">*</span>
                      </h2>
                    </div>
                  </div>

                  <p className="text-xs text-secondary">
                    {t.registerPage.departmentsSubtitle}
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                    {DEPARTMENTS.map((dept) => {
                      const isSelected = selectedDepartments.includes(dept.name);
                      const Icon = dept.icon;

                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => toggleDepartment(dept.name)}
                          className={`w-full p-4 rounded-xl border text-left rtl:text-right transition-all flex items-start gap-4 cursor-pointer ${
                            isSelected
                              ? 'bg-accent/10 border-accent shadow-sm'
                              : 'bg-dominant border-subtle hover:border-accent/40'
                          }`}
                        >
                          {/* Checkbox indicator */}
                          <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-accent border-accent text-white'
                              : 'bg-surface border-subtle'
                          }`}>
                            {isSelected && <span className="text-xs font-bold leading-none">✓</span>}
                          </div>

                          {/* Department Icon */}
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'bg-accent text-white' : 'bg-secondary text-accent'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-primary mb-0.5">
                              {dept.displayName}
                            </h3>
                            <p className="text-xs text-muted leading-relaxed">
                              {dept.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Application Button */}
                <div className="pt-4 border-t border-subtle flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary w-full sm:w-auto px-10 py-3.5 text-sm font-bold"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t.registerPage.submitting}</span>
                      </>
                    ) : (
                      <>
                        <span>{t.registerPage.submit}</span>
                        {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
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
