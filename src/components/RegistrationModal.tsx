import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Loader2, 
  CheckCircle2, 
  Camera, 
  CalendarCheck, 
  Lightbulb, 
  AlertCircle,
  User,
  CreditCard,
  Mail,
  Phone,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { STUDY_YEAR_OPTIONS } from '../data/studyYears';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SPECIALIZATIONS = ['IRIIA', 'µE', 'ENR', 'HV', 'GE'];

export function RegistrationModal({ isOpen, onClose }: RegistrationModalProps) {
  const { language, t } = useLanguage();
  const isRtl = language === 'ar';

  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studyYear, setStudyYear] = useState<string>(''); // option id like '1_st', '1_mi'
  const [specialization, setSpecialization] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFullName('');
      setStudentId('');
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
    if (selectedYearOption && selectedYearOption.yearNumber <= 2) {
      setSpecialization('');
    }
  }, [selectedYearOption]);

  const handleStudentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric digits and limit to 12
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

    // Validation
    const cleanName = fullName.trim();
    const cleanStudentId = studentId.replace(/\D/g, '').trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

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

    if (!cleanPhone || cleanPhone.length < 9) {
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

    try {
      // 1. Prepare Supabase payload
      const payload: any = {
        full_name: cleanName,
        student_id: cleanStudentId,
        email: cleanEmail,
        phone: cleanPhone,
        study_year: selectedYearOption.yearNumber,
        specialization: specRequired ? specialization : (selectedYearOption.branch === 'MI' ? 'MI' : null),
        departments: selectedDepartments,
      };

      // 2. Insert into Supabase (with fallback if student_id column is pending SQL migration)
      let { error: insertError } = await supabase.from('registrations').insert([payload]);

      if (insertError && (insertError.code === '42703' || insertError.message?.includes('student_id'))) {
        console.warn('student_id column not yet created in Supabase. Falling back without student_id column...');
        const { student_id: _, ...fallbackPayload } = payload;
        const retry = await supabase.from('registrations').insert([fallbackPayload]);
        if (retry.error) throw retry.error;
      } else if (insertError) {
        if (insertError.code === '23505' || insertError.message?.includes('unique')) {
          throw new Error(t.registerPage.duplicateError);
        }
        throw insertError;
      }

      // 3. Send email notification via Resend (fire & forget, includes all details)
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
      console.error('Registration modal error:', err);
      setError(err.message || t.registerPage.genericError);
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={onClose}
        >
          {/* Glass Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', duration: 0.45, bounce: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="relative card panel w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden z-10 text-left rtl:text-right"
          >
            {/* Modal Header */}
            <div className="p-6 sm:p-7 border-b border-subtle flex justify-between items-start bg-secondary/30 shrink-0">
              <div className="space-y-1 pr-6 rtl:pr-0 rtl:pl-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t.registerPage.badge}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
                  {t.registerPage.title}
                </h2>
                <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                  {t.registerPage.subtitle}
                </p>
              </div>

              <button
                onClick={onClose}
                aria-label="Close modal"
                className="p-2 text-muted hover:text-primary hover:bg-secondary rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6 ring-8 ring-emerald-500/5">
                      <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-primary mb-3">
                      {t.registerPage.successTitle}
                    </h3>
                    <p className="text-secondary text-sm sm:text-base max-w-md leading-relaxed mb-8">
                      {t.registerPage.successDesc}
                    </p>
                    <button
                      onClick={onClose}
                      className="btn-primary px-8 py-3 text-sm font-bold"
                    >
                      <span>{t.common.close}</span>
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
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

                    {/* Section 1: Personal Details */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="w-6 h-6 rounded-lg bg-accent/15 text-accent font-extrabold text-xs flex items-center justify-center border border-accent/20">1</span>
                        <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-primary">
                          {language === 'ar' ? 'البيانات الشخصية والأكاديمية' : 'Personal & Educational Details'}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Full Name */}
                        <div className="sm:col-span-2">
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

                        {/* Student Educational Number (12 digits) */}
                        <div className="sm:col-span-2">
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
                              className="input-standard has-icon font-mono tracking-wider"
                            />
                          </div>
                          <p className="text-[11px] text-muted mt-1 leading-normal">
                            {t.registerPage.studentIdHint}
                          </p>
                        </div>

                        {/* Email Address */}
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

                        {/* Phone Number */}
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
                        <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-primary">
                          {t.registerPage.studyYear} &amp; {t.registerPage.specialization.split(' ')[0]}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Year of Study */}
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
                          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-accent">
                            {t.registerPage.departmentsTitle} <span className="text-red-500">*</span>
                          </h3>
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
                                <h4 className="text-sm font-bold text-primary mb-0.5">
                                  {dept.displayName}
                                </h4>
                                <p className="text-xs text-muted leading-relaxed">
                                  {dept.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 border-t border-subtle flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary px-5 py-2.5 text-xs sm:text-sm font-bold"
                      >
                        {t.common.close}
                      </button>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary px-7 py-2.5 text-xs sm:text-sm font-bold"
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
