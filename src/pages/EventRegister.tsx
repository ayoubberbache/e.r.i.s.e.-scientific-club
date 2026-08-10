import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Clock, MapPin, ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Loader2, 
  Users, User, ShieldCheck, Plus, Trash2, Car, Sparkles, Building2, UserCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ALGERIAN_INSTITUTIONS } from '../data/algerianInstitutions';
import { sanitizeString, isValidEmail, isValidPhone } from '../lib/security';
import { useLanguage } from '../contexts/LanguageContext';

interface MemberInput {
  full_name: string;
  email: string;
  phone: string;
}

export function EventRegister() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { language, t, getLocalized } = useLanguage();

  const isRtl = language === 'ar';

  const STUDY_YEARS = language === 'ar' ? [
    'السنة الأولى (تحضيري / ليسانس 1)',
    'السنة الثانية (تحضيري / ليسانس 2)',
    'السنة الثالثة (تخصص / ليسانس 3)',
    'السنة الرابعة (ماستر 1 / سنة ثانية هندسة)',
    'السنة الخامسة (ماستر 2 / سنة تخرج هندسة)',
    'دكتوراه / باحث ما بعد التدرج',
    'تلميذ بالتعليم الثانوي (ثانوي)'
  ] : [
    '1st Year (Preparatory / Bachelor)',
    '2nd Year (Preparatory / Bachelor)',
    '3rd Year (Specialization / License)',
    '4th Year (Master 1 / Engineering 2)',
    '5th Year (Master 2 / Engineering 3)',
    'Doctorate / Post-Graduate',
    'Secondary School Student (High School)'
  ];

  const COMPANION_ROLES = language === 'ar' ? [
    'سائق / منسق النقل',
    'أستاذ / مشرف أكاديمي',
    'سفير الفريق',
    'مرافق / مشرف عام',
    'صفة أخرى'
  ] : [
    'Driver / Transport Coordinator',
    'Professor / Academic Advisor',
    'Team Ambassador',
    'Chaperone / Supervisor',
    'Other'
  ];

  const [event, setEvent] = useState<any | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);

  // Form State
  const [teamName, setTeamName] = useState('');
  const [institution, setInstitution] = useState('');
  const [customInstitution, setCustomInstitution] = useState('');
  const [studyYear, setStudyYear] = useState('');

  // Members (Member 0 is always the Leader)
  const [members, setMembers] = useState<MemberInput[]>([
    { full_name: '', email: '', phone: '' }
  ]);

  // Companion State
  const [hasCompanion, setHasCompanion] = useState(false);
  const [companionName, setCompanionName] = useState('');
  const [companionRole, setCompanionRole] = useState(COMPANION_ROLES[0]);

  // Security & Anti-bot state
  const [honeypot, setHoneypot] = useState('');
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  // Status state
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Fetch Event Details
  useEffect(() => {
    async function fetchEvent() {
      if (!eventId) return;
      try {
        setLoadingEvent(true);
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (error || !data) {
          setEventError(language === 'ar' ? 'لم يتم العثور على الفعالية.' : 'Event not found.');
        } else {
          setEvent(data);
          // Initialize members count for team mode based on min_team_size
          if (data.registration_type === 'team') {
            const minSize = data.min_team_size || 2;
            const initialMembers: MemberInput[] = Array.from({ length: Math.max(1, minSize) }, () => ({
              full_name: '',
              email: '',
              phone: ''
            }));
            setMembers(initialMembers);
          }
        }
      } catch (err: any) {
        setEventError(language === 'ar' ? 'فشل تحميل بيانات الفعالية.' : 'Failed to load event details.');
      } finally {
        setLoadingEvent(false);
      }
    }

    fetchEvent();
  }, [eventId, language]);

  // Countdown timer effect
  useEffect(() => {
    if (!event || !event.registration_deadline) return;

    function updateTimer() {
      const deadline = new Date(event.registration_deadline).getTime();
      const now = new Date().getTime();
      const difference = deadline - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
      } else {
        setIsExpired(false);
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [event]);

  const handleMemberChange = (index: number, field: keyof MemberInput, value: string) => {
    setMembers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addMember = () => {
    const maxMembers = event?.max_team_size || 5;
    if (members.length < maxMembers) {
      setMembers((prev) => [...prev, { full_name: '', email: '', phone: '' }]);
    }
  };

  const removeMember = (index: number) => {
    const minMembers = event?.min_team_size || 2;
    if (members.length > minMembers) {
      setMembers((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Anti-bot honeypot check
    if (honeypot.trim() !== '') {
      setSuccess(true);
      return;
    }

    // 2. Client-side rate limiting
    const now = Date.now();
    if (now - lastSubmitTime < 8000) {
      setError(language === 'ar' ? 'يرجى الانتظار بضع ثوانٍ قبل المحاولة مجدداً.' : 'Please wait a few seconds before submitting again.');
      return;
    }

    if (isExpired) {
      setError(t.eventRegisterPage.deadlineExpired);
      return;
    }

    const isTeam = event?.registration_type === 'team';
    const rawInst = institution === 'Other Institution / University' || institution === 'تحديد مؤسسة أخرى' ? customInstitution : institution;
    const selectedInst = sanitizeString(rawInst);

    if (!selectedInst) {
      setError(language === 'ar' ? 'يرجى اختيار مؤسستك الجامعية أو تحديدها.' : 'Please select or specify your school or university.');
      return;
    }

    if (!studyYear) {
      setError(language === 'ar' ? 'يرجى اختيار مستواك الدراسي.' : 'Please select your study year.');
      return;
    }

    const cleanTeamName = sanitizeString(teamName);
    if (isTeam && !cleanTeamName) {
      setError(language === 'ar' ? 'يرجى كتابة اسم الفريق.' : 'Please enter a team name.');
      return;
    }

    // Validate & sanitize member details
    const sanitizedMembers: MemberInput[] = [];
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const roleLabel = isTeam ? (i === 0 ? (language === 'ar' ? 'قائد الفريق' : 'Team Leader') : `${language === 'ar' ? 'العضو' : 'Member'} ${i + 1}`) : (language === 'ar' ? 'المشارك' : 'Participant');
      
      const cleanName = sanitizeString(m.full_name);
      const cleanEmail = sanitizeString(m.email).toLowerCase();
      const cleanPhone = sanitizeString(m.phone);

      if (!cleanName) {
        setError(`${language === 'ar' ? 'يرجى كتابة الاسم واللقب لـ' : 'Please enter full name for'} ${roleLabel}.`);
        return;
      }
      if (!isValidEmail(cleanEmail)) {
        setError(`${language === 'ar' ? 'يرجى كتابة بريد إلكتروني صالح لـ' : 'Please enter a valid email for'} ${roleLabel}.`);
        return;
      }
      if (!isValidPhone(cleanPhone)) {
        setError(`${language === 'ar' ? 'يرجى كتابة رقم هاتف صالح لـ' : 'Please enter a valid phone number for'} ${roleLabel}.`);
        return;
      }

      sanitizedMembers.push({
        full_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone
      });
    }

    // Validate companion if checked
    const cleanCompanionName = sanitizeString(companionName);
    const cleanCompanionRole = sanitizeString(companionRole);
    if (hasCompanion && !cleanCompanionName) {
      setError(language === 'ar' ? 'يرجى كتابة اسم المرافق كاملاً.' : 'Please enter the name of your chaperone/driver/companion.');
      return;
    }

    setSubmitting(true);
    setLastSubmitTime(now);

    try {
      const regPayload = {
        event_id: Number(eventId),
        registration_type: event.registration_type || 'individual',
        team_name: isTeam ? cleanTeamName : null,
        institution: selectedInst,
        study_year: sanitizeString(studyYear),
        has_companion: hasCompanion,
        companion_name: hasCompanion ? cleanCompanionName : null,
        companion_role: hasCompanion ? cleanCompanionRole : null,
        status: 'pending'
      };

      const { data: regData, error: regError } = await supabase
        .from('event_registrations')
        .insert([regPayload])
        .select('id')
        .single();

      if (regError) throw regError;

      const registrationId = regData.id;

      const memberPayloads = sanitizedMembers.map((m, index) => ({
        registration_id: registrationId,
        is_leader: isTeam ? index === 0 : true,
        full_name: m.full_name,
        email: m.email,
        phone: m.phone
      }));

      const { error: membersError } = await supabase
        .from('event_registration_members')
        .insert(memberPayloads);

      if (membersError) throw membersError;

      setSuccess(true);
    } catch (err: any) {
      console.error('Registration submission error:', err);
      setError(err.message || (language === 'ar' ? 'فشل إرسال التسجيل، يرجى المحاولة مرة أخرى.' : 'Failed to submit registration. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-dominant flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="min-h-[80vh] bg-dominant flex items-center justify-center p-6 text-center rtl:text-right">
        <div className="max-w-md bg-surface border border-subtle rounded-3xl p-8 shadow-xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary mb-2">{language === 'ar' ? 'الفعالية غير موجودة' : 'Event Not Found'}</h2>
          <p className="text-secondary text-sm mb-6">{language === 'ar' ? 'تعذر العثور على الفعالية المطلوبة أو أنها لم تعد متاحة.' : 'The requested event could not be found or has been removed.'}</p>
          <Link to="/events" className="px-6 py-2.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-muted transition-colors cursor-pointer">
            {t.eventRegisterPage.backToEvents}
          </Link>
        </div>
      </div>
    );
  }

  const isRegistrationClosed = !event.registration_enabled || event.no_registration || isExpired;
  const isTeam = event.registration_type === 'team';

  const eventTitle = getLocalized(event, 'title') || event.title;
  const eventLoc = getLocalized(event, 'location') || event.location;
  const eventTime = getLocalized(event, 'time') || event.time;

  return (
    <div className="min-h-screen bg-dominant py-12 md:py-20 px-4 sm:px-6 lg:px-8 text-left rtl:text-right">
      <div className="max-w-3xl mx-auto">

        {/* Top Header Navigation */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <Link to="/events" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-accent transition-colors">
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{t.eventRegisterPage.backToEvents}</span>
          </Link>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.eventRegisterPage.registrationFor}</span>
          </div>
        </div>

        {/* Event Context Banner */}
        <div className="bg-surface border border-subtle rounded-3xl p-6 mb-8 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-bold uppercase">
                {event.status || 'UPCOMING'}
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-primary">{eventTitle}</h1>
              <div className="flex flex-wrap gap-4 text-xs text-muted font-medium pt-1">
                {event.start_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-accent shrink-0" />
                    <span>{event.start_date} {event.end_date ? `– ${event.end_date}` : ''}</span>
                  </div>
                )}
                {eventTime && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-accent shrink-0" />
                    <span>{eventTime}</span>
                  </div>
                )}
                {eventLoc && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-accent shrink-0" />
                    <span>{eventLoc}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Countdown Badge */}
            {event.registration_deadline && !isExpired && timeLeft && (
              <div className="bg-accent/10 border border-accent/30 p-4 rounded-2xl shrink-0 text-center md:text-right rtl:md:text-left">
                <span className="text-[10px] text-accent font-bold uppercase tracking-wider block mb-1">
                  {t.eventRegisterPage.deadlineTitle}
                </span>
                <div className="flex items-center justify-center md:justify-end rtl:md:justify-start gap-2 text-primary font-bold font-mono text-lg dir-ltr">
                  {timeLeft.days > 0 && <span>{timeLeft.days}d</span>}
                  <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
                  <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
                  <span>{String(timeLeft.seconds).padStart(2, '0')}s</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Form Container */}
        <div className="bg-surface border border-subtle rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent via-[#00e5ff] to-accent" />

          {isRegistrationClosed ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-primary mb-3">{t.eventsBanner.regClosed}</h2>
              <p className="text-secondary text-sm max-w-md mx-auto leading-relaxed mb-8">
                {isExpired ? t.eventRegisterPage.deadlineExpired : t.eventsBanner.regClosed}
              </p>
              <Link
                to="/events"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent-muted transition-colors cursor-pointer"
              >
                {t.eventRegisterPage.backToEvents}
              </Link>
            </div>
          ) : success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center"
            >
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold text-primary mb-3">{t.eventRegisterPage.successTitle} 🎉</h2>
              <p className="text-secondary max-w-md mx-auto leading-relaxed mb-8 text-sm">
                {t.eventRegisterPage.successDesc}
              </p>
              <div className="flex justify-center gap-4 flex-wrap">
                <Link
                  to="/events"
                  className="px-6 py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent-muted transition-colors shadow-lg shadow-accent/20 cursor-pointer"
                >
                  {t.eventRegisterPage.backToEvents}
                </Link>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Anti-bot honeypot field */}
              <input
                type="text"
                name="user_website_url_check"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />

              {/* Form Title */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isTeam ? 'bg-purple-500/15 text-purple-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                    {isTeam ? `${t.eventRegisterPage.teamBadge} (${event.min_team_size || 2}-${event.max_team_size || 5} ${t.eventsPage.members})` : t.eventRegisterPage.individualBadge}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-primary">{t.eventRegisterPage.generalInfoTitle}</h2>
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Section 1: Academic / School Info */}
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1.5">
                      {t.eventRegisterPage.institution} <span className="text-red-400">*</span>
                    </label>
                    <select
                      required
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full bg-dominant border border-subtle rounded-xl px-4 py-3 text-primary focus:border-accent focus:outline-none transition-colors cursor-pointer text-sm"
                    >
                      <option value="">{t.eventRegisterPage.selectInstitution}</option>
                      {ALGERIAN_INSTITUTIONS.map((inst) => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                      <option value="Other Institution / University">{t.eventRegisterPage.otherInstitution}</option>
                    </select>
                  </div>

                  {(institution === 'Other Institution / University' || institution === 'تحديد مؤسسة أخرى') && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-secondary mb-1.5">
                        {t.eventRegisterPage.otherInstitution} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={customInstitution}
                        onChange={(e) => setCustomInstitution(e.target.value)}
                        placeholder={t.eventRegisterPage.otherInstitutionPlaceholder}
                        className="w-full bg-dominant border border-subtle rounded-xl px-4 py-3 text-primary text-sm focus:border-accent focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1.5">
                      {t.eventRegisterPage.studyYear} <span className="text-red-400">*</span>
                    </label>
                    <select
                      required
                      value={studyYear}
                      onChange={(e) => setStudyYear(e.target.value)}
                      className="w-full bg-dominant border border-subtle rounded-xl px-4 py-3 text-primary focus:border-accent focus:outline-none transition-colors cursor-pointer text-sm"
                    >
                      <option value="">{t.eventRegisterPage.selectStudyYear}</option>
                      {STUDY_YEARS.map((sy) => (
                        <option key={sy} value={sy}>{sy}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Team Name (If Team Mode) */}
              {isTeam && (
                <div className="space-y-4 pt-4 border-t border-subtle">
                  <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent" /> {t.eventRegisterPage.teamName}
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1.5">
                      {t.eventRegisterPage.teamName} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder={t.eventRegisterPage.teamNamePlaceholder}
                      className="w-full bg-dominant border border-subtle rounded-xl px-4 py-3 text-primary text-sm focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Section 3: Members Details */}
              <div className="space-y-6 pt-4 border-t border-subtle">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-accent" /> {isTeam ? t.eventRegisterPage.membersInfoTitle : t.eventRegisterPage.leaderInfoTitle}
                  </h3>
                  {isTeam && (
                    <span className="text-xs text-muted">
                      {members.length} / {event.max_team_size || 5} {t.eventsPage.members} (Min: {event.min_team_size || 2})
                    </span>
                  )}
                </div>

                <div className="space-y-6">
                  {members.map((member, index) => {
                    const isLeader = isTeam && index === 0;
                    return (
                      <div
                        key={index}
                        className={`p-5 rounded-2xl border transition-all ${
                          isLeader
                            ? 'bg-accent/5 border-accent/40 shadow-sm'
                            : 'bg-dominant/40 border-subtle'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isLeader ? 'bg-accent text-white' : 'bg-subtle text-muted'}`}>
                              {index + 1}
                            </span>
                            <span className="font-bold text-primary text-sm">
                              {isTeam ? (isLeader ? `${t.eventRegisterPage.leader} ⭐` : `${t.eventRegisterPage.member} ${index + 1}`) : t.eventRegisterPage.leader}
                            </span>
                          </div>

                          {isTeam && !isLeader && members.length > (event.min_team_size || 2) && (
                            <button
                              type="button"
                              onClick={() => removeMember(index)}
                              className="text-red-400 hover:text-red-300 text-xs font-medium flex items-center gap-1 p-1 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> {t.eventRegisterPage.removeMember}
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-secondary mb-1">
                              {t.eventRegisterPage.fullName} <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={member.full_name}
                              onChange={(e) => handleMemberChange(index, 'full_name', e.target.value)}
                              placeholder={t.registerPage.fullNamePlaceholder}
                              className="w-full bg-surface border border-subtle rounded-xl px-3.5 py-2.5 text-primary text-sm focus:border-accent focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-secondary mb-1">
                              {t.eventRegisterPage.email} <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="email"
                              required
                              value={member.email}
                              onChange={(e) => handleMemberChange(index, 'email', e.target.value)}
                              placeholder={t.registerPage.emailPlaceholder}
                              className="w-full bg-surface border border-subtle rounded-xl px-3.5 py-2.5 text-primary text-sm focus:border-accent focus:outline-none dir-ltr"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-secondary mb-1">
                              {t.eventRegisterPage.phone} <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="tel"
                              required
                              value={member.phone}
                              onChange={(e) => handleMemberChange(index, 'phone', e.target.value)}
                              placeholder={t.registerPage.phonePlaceholder}
                              className="w-full bg-surface border border-subtle rounded-xl px-3.5 py-2.5 text-primary text-sm focus:border-accent focus:outline-none dir-ltr"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {isTeam && members.length < (event.max_team_size || 5) && (
                  <button
                    type="button"
                    onClick={addMember}
                    className="w-full py-3 border-2 border-dashed border-subtle hover:border-accent text-accent rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors bg-dominant/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> {t.eventRegisterPage.addMember} ({members.length + 1})
                  </button>
                )}
              </div>

              {/* Section 4: Optional Companion / Driver / Professor / Ambassador */}
              <div className="space-y-4 pt-4 border-t border-subtle">
                <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                  <Car className="w-4 h-4 text-accent" /> {t.eventRegisterPage.companionTitle}
                </h3>

                <label className="flex items-center gap-3 p-4 rounded-2xl border border-subtle bg-dominant/50 hover:border-accent/40 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={hasCompanion}
                    onChange={(e) => setHasCompanion(e.target.checked)}
                    className="w-4 h-4 accent-accent rounded cursor-pointer"
                  />
                  <div>
                    <span className="block text-sm font-bold text-primary">{t.eventRegisterPage.companionCheckbox}</span>
                  </div>
                </label>

                {hasCompanion && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-5 rounded-2xl border border-subtle bg-dominant/30 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">
                          {t.eventRegisterPage.companionName} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required={hasCompanion}
                          value={companionName}
                          onChange={(e) => setCompanionName(e.target.value)}
                          placeholder="Full Name"
                          className="w-full bg-surface border border-subtle rounded-xl px-3.5 py-2.5 text-primary text-sm focus:border-accent focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">
                          {t.eventRegisterPage.companionRole} <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={companionRole}
                          onChange={(e) => setCompanionRole(e.target.value)}
                          className="w-full bg-surface border border-subtle rounded-xl px-3.5 py-2.5 text-primary text-sm focus:border-accent focus:outline-none cursor-pointer"
                        >
                          {COMPANION_ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t border-subtle flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-10 py-3.5 rounded-xl font-bold bg-accent text-white hover:bg-accent-muted transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-accent/25 text-base cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> {t.eventRegisterPage.submitting}
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-5 h-5" /> {t.eventRegisterPage.submitReg}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
