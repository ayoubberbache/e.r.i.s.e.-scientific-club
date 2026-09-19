import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Clock, MapPin, ArrowRight, ArrowLeft, 
  BellRing, CheckCircle2, XCircle, ChevronRight, ChevronLeft,
  Users, UserCheck, Megaphone, GraduationCap, Tag
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { slugify } from '../lib/slugs';

export function UpcomingEventsNotification() {
  const { language, t, getLocalized } = useLanguage();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const isRtl = language === 'ar';

  useEffect(() => {
    async function fetchUpcomingEvents() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('start_date', { ascending: true });

        if (error || !data) {
          setEvents([]);
        } else {
          const todayMidnight = new Date();
          todayMidnight.setHours(0, 0, 0, 0);

          // Filter for upcoming events
          const upcoming = data.filter((event) => {
            if (event.end_date) {
              const endD = new Date(event.end_date + 'T23:59:59');
              if (!isNaN(endD.getTime())) return endD >= todayMidnight;
            }
            if (event.start_date) {
              const startD = new Date(event.start_date + 'T23:59:59');
              if (!isNaN(startD.getTime())) return startD >= todayMidnight;
            }
            if (event.status && event.status.toUpperCase() === 'UPCOMING') {
              return true;
            }
            return false;
          });

          // Sort chronologically
          upcoming.sort((a, b) => {
            const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
            const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
            return dateA - dateB;
          });

          setEvents(upcoming);
        }
      } catch (err) {
        console.warn('Error fetching upcoming events for banner:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchUpcomingEvents();
  }, []);

  const currentEvent = events[currentIndex] || null;

  const isRegistrationOpen = useMemo(() => {
    if (!currentEvent) return false;
    if (currentEvent.no_registration || currentEvent.noRegistration) return false;
    if (currentEvent.registration_enabled === false) return false;
    
    if (currentEvent.registration_deadline) {
      const deadline = new Date(currentEvent.registration_deadline).getTime();
      const now = new Date().getTime();
      if (deadline <= now) return false;
    }

    return true;
  }, [currentEvent]);

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto my-8 p-6 rounded-2xl bg-surface border border-subtle animate-pulse text-center">
        <div className="h-4 bg-accent/20 rounded-full w-48 mx-auto mb-3" />
        <div className="h-6 bg-accent/10 rounded-full w-3/4 mx-auto mb-2" />
        <div className="h-4 bg-subtle rounded-full w-1/2 mx-auto" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl mx-auto my-8 p-5 sm:p-6 rounded-2xl bg-surface border border-subtle text-center"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider mb-2">
          <Megaphone className="w-3.5 h-3.5" />
          <span>{t.eventsBanner.badge}</span>
        </div>
        <p className="text-secondary text-sm font-medium">
          {t.eventsBanner.noUpcoming}
        </p>
      </motion.div>
    );
  }

  const nextEvent = () => {
    setCurrentIndex((prev) => (prev + 1) % events.length);
  };

  const prevEvent = () => {
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);
  };

  const title = getLocalized(currentEvent, 'title') || currentEvent.title;
  const description = getLocalized(currentEvent, 'description') || currentEvent.description;
  const location = getLocalized(currentEvent, 'location') || currentEvent.location;
  const time = getLocalized(currentEvent, 'time') || currentEvent.time;
  const dateStr = currentEvent.date || (currentEvent.start_date ? currentEvent.start_date : '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full max-w-4xl mx-auto my-6 relative z-20 group"
    >
      {/* Minimal Clean Container — No AI slop, no green top stripe */}
      <div className="relative rounded-xl bg-surface border border-subtle/80 hover:border-subtle transition-colors overflow-hidden text-left rtl:text-right shadow-xs">
        
        <div className="p-5 sm:p-6">
          
          {/* Top Row: Clean Muted Header + Status Badge + Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-subtle/60">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent font-mono">
                <BellRing className="w-3.5 h-3.5" />
                <span>{t.eventsBanner.badge}</span>
              </span>

              <span className="text-muted/40 text-xs hidden sm:inline">&bull;</span>

              {/* Status Badge */}
              {isRegistrationOpen ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{t.eventsBanner.regOpen}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-medium">
                  <XCircle className="w-3 h-3" />
                  <span>{t.eventsBanner.regClosed}</span>
                </span>
              )}
            </div>

            {/* Multiple Events Switcher Controls */}
            {events.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted">
                  {currentIndex + 1} / {events.length}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={isRtl ? nextEvent : prevEvent}
                    className="p-1 rounded-md bg-dominant border border-subtle hover:border-accent text-secondary hover:text-primary transition-colors cursor-pointer"
                    title={t.eventsBanner.prev}
                    aria-label="Previous"
                  >
                    {isRtl ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={isRtl ? prevEvent : nextEvent}
                    className="p-1 rounded-md bg-dominant border border-subtle hover:border-accent text-secondary hover:text-primary transition-colors cursor-pointer"
                    title={t.eventsBanner.next}
                    aria-label="Next"
                  >
                    {isRtl ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Event Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentEvent.id || currentIndex}
              initial={{ opacity: 0, x: isRtl ? -8 : 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? 8 : -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-3"
            >
              {/* Event Title */}
              <h3 className="text-xl sm:text-2xl font-bold text-primary leading-snug tracking-tight">
                {title}
              </h3>

              {/* Event Metadata (Date, Time, Place) */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs font-medium text-secondary">
                {dateStr && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-dominant border border-subtle">
                    <Calendar className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span>{dateStr}</span>
                  </div>
                )}

                {time && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-dominant border border-subtle">
                    <Clock className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span>{time}</span>
                  </div>
                )}

                {location && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-dominant border border-subtle">
                    <MapPin className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span>{location}</span>
                  </div>
                )}

                {currentEvent.registration_type === 'hackathon' ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === 'ar' ? 'هاكاثون (فريق أو فردي)' : 'Hackathon (Team / Solo)'}</span>
                  </div>
                ) : currentEvent.registration_type === 'workshop' || currentEvent.registration_type === 'bootcamp' ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                    <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === 'ar' ? 'ورشة عمل / تدريب' : 'Workshop / Bootcamp'}</span>
                  </div>
                ) : currentEvent.registration_type?.startsWith('custom') ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <span>{currentEvent.registration_type.startsWith('custom:') ? currentEvent.registration_type.split(':')[1] : (language === 'ar' ? 'فعالية خاصة' : 'Custom Event')}</span>
                  </div>
                ) : currentEvent.registration_type === 'team' ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.eventsPage.teamReg} ({currentEvent.min_team_size || 2}-{currentEvent.max_team_size || 5})</span>
                  </div>
                ) : null}
              </div>

              {/* Pure Text Description */}
              {description && (
                <p className="text-secondary text-xs sm:text-sm leading-relaxed pt-0.5 whitespace-pre-line">
                  {description}
                </p>
              )}

              {/* Bottom Action Row */}
              <div className="pt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-subtle/60">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Direct Registration Form Button if Open */}
                  {isRegistrationOpen ? (
                    <Link
                      to={`/events/${slugify(currentEvent.title || String(currentEvent.id))}/register`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white font-semibold text-xs sm:text-sm hover:bg-accent-muted transition-colors shadow-xs active:scale-[0.98]"
                    >
                      <span>{t.eventsBanner.registerNow}</span>
                      {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-subtle/40 text-muted font-medium text-xs">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{t.eventsBanner.regClosed}</span>
                    </span>
                  )}

                  <Link
                    to="/events"
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-secondary hover:text-primary hover:bg-subtle/30 text-xs sm:text-sm font-medium transition-colors"
                  >
                    <span>{t.eventsBanner.viewAllEvents}</span>
                    {isRtl ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                  </Link>
                </div>

                {/* Multiple events bullets */}
                {events.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    {events.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === currentIndex
                            ? 'w-5 bg-accent'
                            : 'w-1.5 bg-subtle hover:bg-muted'
                        }`}
                        aria-label={`Go to event ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

            </motion.div>
          </AnimatePresence>

        </div>
      </div>
    </motion.div>
  );
}
