import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Clock, MapPin, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2, 
  Users, User, Plus, Trash2, ShieldCheck, Check, GraduationCap, UserCheck, Tag
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ALGERIAN_INSTITUTIONS } from '../data/algerianInstitutions';
import { sanitizeString, isValidEmail, isValidPhone } from '../lib/security';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { slugify } from '../lib/slugs';

interface MemberInput {
  full_name: string;
  email: string;
  phone: string;
}

export function EventRegister() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { language, t, getLocalized } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
  const [participationMode, setParticipationMode] = useState<'team' | 'individual'>('team');
  const [studentNumber, setStudentNumber] = useState('');

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

  // Fetch Event Details (Support numeric ID OR slugified event title)
  useEffect(() => {
    async function fetchEvent() {
      if (!eventId) return;
      try {
        setLoadingEvent(true);
        setEventError(null);

        const isNumeric = /^\d+$/.test(eventId);

        if (isNumeric) {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', Number(eventId))
            .single();

          if (error || !data) {
            throw new Error(language === 'ar' ? 'الفعالية غير موجودة' : 'Event not found');
          }
          setEvent(data);
        } else {
          const { data: allEvents, error } = await supabase
            .from('events')
            .select('*');

          if (error || !allEvents) {
            throw new Error(language === 'ar' ? 'الفعالية غير موجودة' : 'Event not found');
          }

          const matchedEvent = allEvents.find((e: any) => {
            const slug = slugify(e.title);
            const slugAr = e.title_ar ? slugify(e.title_ar) : '';
            return slug === eventId || slugAr === eventId;
          });

          if (!matchedEvent) {
            throw new Error(language === 'ar' ? 'الفعالية غير موجودة' : 'Event not found');
          }

          setEvent(matchedEvent);
        }
      } catch (err: any) {
        console.error('Error fetching event details:', err);
        setEventError(err.message || (language === 'ar' ? 'حدث خطأ أثناء تحميل الفعالية' : 'Error loading event'));
      } finally {
        setLoadingEvent(false);
      }
    }

    fetchEvent();
  }, [eventId, language]);

  // Calculate remaining deadline countdown
  useEffect(() => {
    if (!event || !event.registration_deadline) return;

    const targetDate = new Date(event.registration_deadline).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
        clearInterval(interval);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [event]);

  // Adjust team members array size based on min_team_size and participationMode
  useEffect(() => {
    const isTeamActive = event?.registration_type === 'team' || (event?.registration_type === 'hackathon' && participationMode === 'team');
    if (event && isTeamActive) {
      const minSize = event.min_team_size || 2;
      if (members.length < minSize) {
        const additional = Array.from({ length: minSize - members.length }, () => ({
          full_name: '',
          email: '',
          phone: ''
        }));
        setMembers(prev => [...prev, ...additional]);
      }
    } else if (event && !isTeamActive) {
      if (members.length > 1) {
        setMembers(prev => [prev[0]]);
      }
    }
  }, [event, participationMode]);

  const handleMemberChange = (index: number, field: keyof MemberInput, value: string) => {
    setMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addMember = () => {
    if (!event) return;
    const maxSize = event.max_team_size || 5;
    if (members.length < maxSize) {
      setMembers(prev => [...prev, { full_name: '', email: '', phone: '' }]);
    }
  };

  const removeMember = (index: number) => {
    if (!event) return;
    const minSize = event.min_team_size || 2;
    if (members.length > minSize && index >= minSize) {
      setMembers(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Anti-bot honeypot check
    if (honeypot.trim() !== '') {
      return;
    }

    // Rate limiting: 5 seconds between submits
    const now = Date.now();
    if (now - lastSubmitTime < 5000) {
      setError(language === 'ar' ? 'يرجى الانتظار قليلاً قبل إعادة المحاولة.' : 'Please wait a moment before submitting again.');
      return;
    }

    if (!event) return;

    if (!event.registration_enabled) {
      setError(language === 'ar' ? 'التسجيل في هذه الفعالية مغلق حالياً.' : 'Registration for this event is currently closed.');
      return;
    }

    if (isExpired) {
      setError(language === 'ar' ? 'انتهت فترة التسجيل المحددة لهذه الفعالية.' : 'The registration period for this event has expired.');
      return;
    }

    const isHackathon = event.registration_type === 'hackathon';
    const isWorkshopOrBootcamp = event.registration_type === 'workshop' || event.registration_type === 'bootcamp';
    const isTeam = isHackathon ? participationMode === 'team' : event.registration_type === 'team';
    const cleanTeamName = sanitizeString(teamName);

    if (isTeam && !cleanTeamName) {
      setError(language === 'ar' ? 'يرجى إدخال اسم الفريق.' : 'Please enter team name.');
      return;
    }

    // 12-digit student registration number validation for workshops/bootcamps
    if (isWorkshopOrBootcamp) {
      const cleanStudentNum = studentNumber.trim();
      if (!cleanStudentNum || !/^\d{12}$/.test(cleanStudentNum)) {
        setError(language === 'ar' ? 'يرجى إدخال رقم تسجيل جامعي صالح مكوّن من 12 رقماً.' : 'Please enter a valid 12-digit student registration number.');
        return;
      }
    }

    const selectedInst = institution === 'Other Institution / University' || institution === 'تحديد مؤسسة أخرى'
      ? sanitizeString(customInstitution)
      : sanitizeString(institution);

    if (!selectedInst) {
      setError(language === 'ar' ? 'يرجى اختيار أو كتابة اسم المؤسسة / الجامعة.' : 'Please select or specify your institution/university.');
      return;
    }

    if (!studyYear) {
      setError(language === 'ar' ? 'يرجى اختيار المستوى الدراسي.' : 'Please select your study year.');
      return;
    }

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

    const cleanCompanionName = sanitizeString(companionName);
    const cleanCompanionRole = sanitizeString(companionRole);
    if (isTeam && hasCompanion && !cleanCompanionName) {
      setError(language === 'ar' ? 'يرجى كتابة اسم المرافق كاملاً.' : 'Please enter companion full name.');
      return;
    }

    setSubmitting(true);
    setLastSubmitTime(now);

    try {
      const cleanStudentNum = studentNumber.trim();
      const instWithId = cleanStudentNum ? `${selectedInst} [ID: ${cleanStudentNum}]` : selectedInst;
      const teamOrStudent = isTeam ? cleanTeamName : (cleanStudentNum ? `Student ID: ${cleanStudentNum}` : null);
      const companionOrStudent = isTeam && hasCompanion ? cleanCompanionRole : (cleanStudentNum ? `Student ID: ${cleanStudentNum}` : null);

      const regPayload = {
        event_id: Number(event.id),
        registration_type: isHackathon ? (isTeam ? 'team' : 'individual') : (event.registration_type || 'individual'),
        team_name: teamOrStudent,
        institution: instWithId,
        study_year: sanitizeString(studyYear),
        has_companion: isTeam ? hasCompanion : false,
        companion_name: isTeam && hasCompanion ? cleanCompanionName : null,
        companion_role: companionOrStudent,
        status: 'pending'
      };

      const memberPayloads = sanitizedMembers.map((m, index) => ({
        is_leader: isTeam ? index === 0 : true,
        full_name: m.full_name,
        email: m.email,
        phone: m.phone
      }));

      let submitted = false;

      // 1. Primary: Serverless API proxy
      try {
        const res = await fetch('/api/submit-event-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ regPayload, memberPayloads })
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
        const { data: regData, error: regError } = await supabase
          .from('event_registrations')
          .insert([regPayload])
          .select()
          .single();

        if (regError) throw regError;

        const membersWithRegId = memberPayloads.map(m => ({
          ...m,
          registration_id: regData.id
        }));

        const { error: membersError } = await supabase
          .from('event_registration_members')
          .insert(membersWithRegId);

        if (membersError) throw membersError;
      }

      // Send confirmation email asynchronously
      fetch('/api/send-registration-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sanitizedMembers[0].email,
          fullName: sanitizedMembers[0].full_name,
          eventTitle: getLocalized(event, 'title') || event.title,
          isEvent: true
        })
      }).catch(e => console.warn('Event email trigger warning:', e));

      setSuccess(true);
    } catch (err: any) {
      console.error('Registration submission error:', err);
      setError(err.message || (language === 'ar' ? 'فشل إرسال التسجيل. يرجى المحاولة لاحقاً.' : 'Failed to submit registration. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEvent) {
    return (
      <div className={`min-h-[85vh] flex items-center justify-center p-4 ${isDark ? 'bg-[#0a1628]' : 'bg-[#f8fcfd]'}`}>
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-[#00e5ff]' : 'text-[#0d5c63]'}`} />
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className={`min-h-[85vh] flex items-center justify-center p-6 text-center rtl:text-right ${isDark ? 'bg-[#0a1628] text-slate-100' : 'bg-[#f8fcfd] text-slate-900'}`}>
        <div className={`max-w-md w-full border p-8 shadow-xs ${isDark ? 'bg-[#0f2537] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="w-12 h-12 bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{eventError || 'Event Not Found'}</h1>
          <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {language === 'ar' ? 'الفعالية المطلوبة غير متاحة أو تم إغلاق التسجيل.' : 'The requested event is not available or registration has closed.'}
          </p>
          <Link
            to="/events"
            className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold border transition-colors ${
              isDark ? 'bg-slate-800 text-white hover:bg-slate-700 border-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300'
            }`}
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{language === 'ar' ? 'العودة للفعاليات' : 'Back to Events'}</span>
          </Link>
        </div>
      </div>
    );
  }

  const isHackathon = event.registration_type === 'hackathon';
  const isWorkshopOrBootcamp = event.registration_type === 'workshop' || event.registration_type === 'bootcamp';
  const isCustom = event.registration_type === 'custom' || (!['hackathon', 'workshop', 'bootcamp', 'individual', 'team'].includes(event.registration_type) && !!event.registration_type);
  const isTeam = isHackathon ? participationMode === 'team' : event.registration_type === 'team';
  const eventTitle = getLocalized(event, 'title') || event.title;
  const eventDesc = getLocalized(event, 'description') || event.description;
  const eventLocation = getLocalized(event, 'location') || event.location;
  const eventTime = getLocalized(event, 'time') || event.time;

  return (
    <div className={`min-h-screen py-10 md:py-16 px-4 sm:px-6 lg:px-8 text-left rtl:text-right transition-colors duration-200 ${
      isDark ? 'bg-[#0a1628] text-slate-100' : 'bg-[#f8fcfd] text-slate-900'
    }`}>
      <div className="max-w-3xl mx-auto">
        {/* Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/events"
            className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors ${
              isDark ? 'text-slate-400 hover:text-[#00e5ff]' : 'text-slate-600 hover:text-[#0d5c63]'
            }`}
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{language === 'ar' ? 'العودة إلى الفعاليات' : 'Back to Events'}</span>
          </Link>
          <span className={`text-xs font-mono font-medium px-2.5 py-1 border ${
            isDark ? 'bg-slate-800 border-slate-700 text-[#00e5ff]' : 'bg-teal-50 border-teal-200 text-[#0d5c63]'
          }`}>
            {isHackathon ? (
              language === 'ar' ? 'هاكاثون (فريق أو فردي)' : 'Hackathon (Team / Individual)'
            ) : isWorkshopOrBootcamp ? (
              language === 'ar' ? 'ورشة عمل / تدريب (رقم التسجيل مطلوب)' : 'Workshop / Bootcamp (Student ID Required)'
            ) : isCustom ? (
              event.registration_type?.startsWith('custom:') 
                ? event.registration_type.split(':')[1]
                : (language === 'ar' ? 'فعالية خاصة' : 'Custom Event')
            ) : isTeam ? (
              language === 'ar' ? 'تسجيل فرق' : 'Team Registration'
            ) : (
              language === 'ar' ? 'تسجيل فردي' : 'Individual Registration'
            )}
          </span>
        </div>

        {/* Main Card */}
        <div className={`border p-6 sm:p-10 shadow-xs transition-colors duration-200 ${
          isDark ? 'bg-[#0f2537] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Header */}
          <div className={`border-b pb-6 mb-8 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-3 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {eventTitle}
            </h1>
            {eventDesc && (
              <p className={`text-sm leading-relaxed mb-4 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {eventDesc}
              </p>
            )}

            {/* Event Meta Badges */}
            <div className={`flex flex-wrap gap-3 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 border font-semibold ${
                isDark ? 'bg-slate-800 border-slate-700 text-[#00e5ff]' : 'bg-slate-50 border-slate-200 text-[#0d5c63]'
              }`}>
                {isHackathon ? (
                  <>
                    <Users className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'هاكاثون / أفكار ابتكارية' : 'Hackathon / Ideathon'}</span>
                  </>
                ) : isWorkshopOrBootcamp ? (
                  <>
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'ورشة عمل / تدريب مكثف' : 'Bootcamp / Workshop'}</span>
                  </>
                ) : isCustom ? (
                  <>
                    <Tag className="w-3.5 h-3.5" />
                    <span>{event.registration_type?.startsWith('custom:') ? event.registration_type.split(':')[1] : (language === 'ar' ? 'فعالية خاصة' : 'Custom Event')}</span>
                  </>
                ) : isTeam ? (
                  <>
                    <Users className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'تسجيل فِرق' : 'Team Registration'}</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'تسجيل فردي' : 'Individual Registration'}</span>
                  </>
                )}
              </div>

              {event.date && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 border ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <Calendar className={`w-3.5 h-3.5 ${isDark ? 'text-[#00e5ff]' : 'text-[#0d5c63]'}`} />
                  <span>{event.date}</span>
                </div>
              )}
              {eventTime && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 border ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-[#00e5ff]' : 'text-[#0d5c63]'}`} />
                  <span>{eventTime}</span>
                </div>
              )}
              {eventLocation && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 border ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <MapPin className={`w-3.5 h-3.5 ${isDark ? 'text-[#00e5ff]' : 'text-[#0d5c63]'}`} />
                  <span>{eventLocation}</span>
                </div>
              )}
            </div>

            {/* Registration Deadline Warning */}
            {event.registration_deadline && (
              <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
                isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
              }`}>
                <span>
                  {language === 'ar' ? 'الموعد النهائي للتسجيل:' : 'Registration Deadline:'}
                </span>
                {isExpired ? (
                  <span className="text-red-600 font-semibold">{language === 'ar' ? 'انتهت فترة التسجيل' : 'Registration Closed'}</span>
                ) : timeLeft ? (
                  <span className={`font-mono font-bold ${isDark ? 'text-[#00e5ff]' : 'text-[#0d5c63]'}`}>
                    {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                  </span>
                ) : null}
              </div>
            )}
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
                  {language === 'ar' ? 'تم تسجيلك بنجاح' : 'Registration Successful'}
                </h2>
                <p className={`text-sm max-w-md mx-auto mb-6 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {language === 'ar' 
                    ? 'شكراً لتسجيلك في الفعالية. لقد تم إرسال تفاصيل التأكيد إلى بريدك الإلكتروني.'
                    : 'Thank you for registering. A confirmation summary has been sent to your email.'}
                </p>
                <div className="flex justify-center gap-3">
                  <Link
                    to="/events"
                    className={`px-6 py-2.5 text-sm font-semibold border transition-colors ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {language === 'ar' ? 'العودة للفعاليات' : 'Back to Events'}
                  </Link>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Honeypot hidden field */}
                <input
                  type="text"
                  name="user_note"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                />

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Hackathon Participation Mode Selector */}
                {isHackathon && (
                  <div className={`p-4 border space-y-2.5 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {language === 'ar' ? 'طريقة المشاركة في الهاكاثون *' : 'Hackathon Participation Mode *'}
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setParticipationMode('team')}
                        className={`p-3 text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          participationMode === 'team'
                            ? (isDark ? 'bg-[#00e5ff]/15 border-[#00e5ff] text-[#00e5ff]' : 'bg-[#0d5c63] border-[#0d5c63] text-white shadow-xs')
                            : (isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100')
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        <span>{language === 'ar' ? 'مشاركة كفريق' : 'Team Participation'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setParticipationMode('individual')}
                        className={`p-3 text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          participationMode === 'individual'
                            ? (isDark ? 'bg-[#00e5ff]/15 border-[#00e5ff] text-[#00e5ff]' : 'bg-[#0d5c63] border-[#0d5c63] text-white shadow-xs')
                            : (isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100')
                        }`}
                      >
                        <User className="w-4 h-4" />
                        <span>{language === 'ar' ? 'مشاركة فردية' : 'Individual Participation'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 12-Digit Student Registration Number for Workshops / Bootcamps */}
                {isWorkshopOrBootcamp && (
                  <div className={`p-4 border space-y-2 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className={`block text-xs font-bold uppercase tracking-wider ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        {language === 'ar' ? 'رقم التسجيل الجامعي (12 رقماً) *' : 'Student Registration Number (12 Digits) *'}
                      </label>
                      <span className={`text-[11px] font-mono font-bold ${
                        studentNumber.trim().length === 12
                          ? 'text-emerald-500'
                          : (studentNumber.trim().length > 0 ? 'text-amber-500' : 'text-slate-400')
                      }`}>
                        {studentNumber.trim().length} / 12
                      </span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{12}"
                      maxLength={12}
                      value={studentNumber}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '');
                        if (digitsOnly.length <= 12) setStudentNumber(digitsOnly);
                      }}
                      placeholder={language === 'ar' ? 'مثال: 202331048912' : 'e.g. 202331048912'}
                      required
                      className={`w-full px-3.5 py-2 text-sm font-mono tracking-wider border transition-colors ${
                        isDark
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-[#00e5ff] focus:outline-none'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#0d5c63] focus:outline-none'
                      }`}
                    />
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {language === 'ar'
                        ? 'رقم بطاقة الطالب أو شهادة التسجيل الجامعي المكوّن من 12 رقماً.'
                        : 'Official 12-digit university student registration number (Matricule).'}
                    </p>
                  </div>
                )}

                {/* Team Info if applicable */}
                {isTeam && (
                  <div className={`p-4 border space-y-2 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {language === 'ar' ? 'اسم الفريق *' : 'Team Name *'}
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder={language === 'ar' ? 'مثال: Solar Innovators' : 'e.g., Solar Innovators'}
                      required
                      className={`w-full px-3.5 py-2 text-sm border transition-colors ${
                        isDark
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-[#00e5ff] focus:outline-none'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#0d5c63] focus:outline-none'
                      }`}
                    />
                  </div>
                )}

                {/* Academic Institution & Study Year */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {language === 'ar' ? 'الجامعة أو المؤسسة *' : 'Institution / University *'}
                    </label>
                    <select
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      required
                      className={`w-full px-3.5 py-2 text-sm border transition-colors ${
                        isDark
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-[#00e5ff] focus:outline-none'
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-[#0d5c63] focus:outline-none'
                      }`}
                    >
                      <option value="">{language === 'ar' ? '-- اختر مؤسستك --' : '-- Select Institution --'}</option>
                      {ALGERIAN_INSTITUTIONS.map((inst, idx) => (
                        <option key={idx} value={inst}>
                          {inst}
                        </option>
                      ))}
                    </select>

                    {(institution === 'Other Institution / University' || institution === 'تحديد مؤسسة أخرى') && (
                      <input
                        type="text"
                        value={customInstitution}
                        onChange={(e) => setCustomInstitution(e.target.value)}
                        placeholder={language === 'ar' ? 'اكتب اسم المؤسسة...' : 'Specify institution name...'}
                        required
                        className={`mt-2 w-full px-3.5 py-2 text-sm border transition-colors ${
                          isDark
                            ? 'bg-slate-950 border-slate-800 text-white focus:border-[#00e5ff] focus:outline-none'
                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-[#0d5c63] focus:outline-none'
                        }`}
                      />
                    )}
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {language === 'ar' ? 'المستوى الدراسي *' : 'Study Year *'}
                    </label>
                    <select
                      value={studyYear}
                      onChange={(e) => setStudyYear(e.target.value)}
                      required
                      className={`w-full px-3.5 py-2 text-sm border transition-colors ${
                        isDark
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-[#00e5ff] focus:outline-none'
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-[#0d5c63] focus:outline-none'
                      }`}
                    >
                      <option value="">{language === 'ar' ? '-- اختر المستوى --' : '-- Select Year --'}</option>
                      {STUDY_YEARS.map((yr, idx) => (
                        <option key={idx} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Member Details */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${
                      isDark ? 'text-[#00e5ff]' : 'text-[#0d5c63]'
                    }`}>
                      {isTeam ? (language === 'ar' ? 'أعضاء الفريق' : 'Team Members') : (language === 'ar' ? 'معلومات المشارك' : 'Participant Details')}
                    </h3>
                    {isTeam && members.length < (event.max_team_size || 5) && (
                      <button
                        type="button"
                        onClick={addMember}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border transition-colors cursor-pointer ${
                          isDark
                            ? 'bg-slate-800 hover:bg-slate-700 text-[#00e5ff] border-slate-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-[#0d5c63] border-slate-300'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'إضافة عضو' : 'Add Member'}</span>
                      </button>
                    )}
                  </div>

                  {members.map((member, index) => (
                    <div
                      key={index}
                      className={`p-3.5 border space-y-2.5 relative ${
                        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {isTeam ? (index === 0 ? (language === 'ar' ? 'قائد الفريق' : 'Team Leader') : `${language === 'ar' ? 'العضو' : 'Member'} ${index + 1}`) : (language === 'ar' ? 'البيانات الشخصية' : 'Personal Details')}
                        </span>
                        {isTeam && index >= (event.min_team_size || 2) && (
                          <button
                            type="button"
                            onClick={() => removeMember(index)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title={language === 'ar' ? 'حذف العضو' : 'Remove Member'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <input
                          type="text"
                          value={member.full_name}
                          onChange={(e) => handleMemberChange(index, 'full_name', e.target.value)}
                          placeholder={language === 'ar' ? 'الاسم الكامل *' : 'Full Name *'}
                          required
                          className={`w-full px-3 py-1.5 text-xs sm:text-sm border transition-colors ${
                            isDark
                              ? 'bg-slate-950 border-slate-800 text-white focus:border-[#00e5ff] focus:outline-none'
                              : 'bg-white border-slate-300 text-slate-900 focus:border-[#0d5c63] focus:outline-none'
                          }`}
                        />
                        <input
                          type="email"
                          value={member.email}
                          onChange={(e) => handleMemberChange(index, 'email', e.target.value)}
                          placeholder={language === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}
                          required
                          className={`w-full px-3 py-1.5 text-xs sm:text-sm border transition-colors ${
                            isDark
                              ? 'bg-slate-950 border-slate-800 text-white focus:border-[#00e5ff] focus:outline-none'
                              : 'bg-white border-slate-300 text-slate-900 focus:border-[#0d5c63] focus:outline-none'
                          }`}
                        />
                        <input
                          type="tel"
                          value={member.phone}
                          onChange={(e) => handleMemberChange(index, 'phone', e.target.value)}
                          placeholder={language === 'ar' ? 'رقم الهاتف *' : 'Phone Number *'}
                          required
                          className={`w-full px-3 py-1.5 text-xs sm:text-sm border transition-colors ${
                            isDark
                              ? 'bg-slate-950 border-slate-800 text-white focus:border-[#00e5ff] focus:outline-none'
                              : 'bg-white border-slate-300 text-slate-900 focus:border-[#0d5c63] focus:outline-none'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Optional Companion / Driver / Chaperone (Only for Teams) */}
                {isTeam && (
                  <div className={`pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <label className={`flex items-center gap-2 cursor-pointer text-xs font-semibold ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      <input
                        type="checkbox"
                        checked={hasCompanion}
                        onChange={(e) => setHasCompanion(e.target.checked)}
                        className="border-slate-300"
                      />
                      <span>{language === 'ar' ? 'هل يرافقكم سائق أو مؤطر / مرافق؟ (اختياري)' : 'Do you have an accompanying driver or chaperone? (Optional)'}</span>
                    </label>

                    {hasCompanion && (
                      <div className={`mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 border ${
                        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <input
                          type="text"
                          value={companionName}
                          onChange={(e) => setCompanionName(e.target.value)}
                          placeholder={language === 'ar' ? 'اسم المرافق *' : 'Companion Full Name *'}
                          className={`w-full px-3 py-1.5 text-xs sm:text-sm border transition-colors ${
                            isDark
                              ? 'bg-slate-950 border-slate-800 text-white focus:border-[#00e5ff] focus:outline-none'
                              : 'bg-white border-slate-300 text-slate-900 focus:border-[#0d5c63] focus:outline-none'
                          }`}
                        />
                        <select
                          value={companionRole}
                          onChange={(e) => setCompanionRole(e.target.value)}
                          className={`w-full px-3 py-1.5 text-xs sm:text-sm border transition-colors ${
                            isDark
                              ? 'bg-slate-950 border-slate-800 text-white focus:border-[#00e5ff] focus:outline-none'
                              : 'bg-white border-slate-300 text-slate-900 focus:border-[#0d5c63] focus:outline-none'
                          }`}
                        >
                          {COMPANION_ROLES.map((role, idx) => (
                            <option key={idx} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit button */}
                <div className={`pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <button
                    type="submit"
                    disabled={submitting || isExpired}
                    className={`w-full py-2.5 px-6 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-xs ${
                      isDark
                        ? 'bg-[#00e5ff] hover:bg-[#5ef0ff] text-[#0a1628]'
                        : 'bg-[#0d5c63] hover:bg-[#0a4a50] text-white'
                    }`}
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                    <span>
                      {submitting
                        ? (language === 'ar' ? 'جارٍ الإرسال...' : 'Submitting...')
                        : (language === 'ar' ? 'تأكيد التسجيل في الفعالية' : 'Confirm Registration')}
                    </span>
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
