import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Clock, MapPin, ArrowRight, ArrowLeft, 
  BellRing, CheckCircle2, XCircle, Sparkles, ChevronRight, ChevronLeft,
  Users, UserCheck, Megaphone
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

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
      <div className="w-full max-w-4xl mx-auto my-8 p-6 rounded-3xl bg-surface/50 border border-subtle backdrop-blur-sm animate-pulse text-center">
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
        className="w-full max-w-4xl mx-auto my-8 p-5 sm:p-6 rounded-3xl bg-surface/40 border border-subtle/80 backdrop-blur-md text-center shadow-lg"
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
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-4xl mx-auto my-8 relative z-20 group"
    >
      {/* Outer Glow & Background */}
      <div className="relative rounded-3xl bg-surface/90 border-2 border-accent/40 backdrop-blur-xl shadow-2xl shadow-accent/10 overflow-hidden text-left rtl:text-right">
        
        {/* Subtle glowing ambient accent header */}
        <div className="h-1.5 w-full bg-gradient-to-r from-accent via-[#00e5ff] to-accent" />

        <div className="p-6 sm:p-8">
          
          {/* Top Banner Row: Category / Notification Badge + Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-subtle/80">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-tint text-accent text-xs font-bold uppercase tracking-wider">
                <BellRing className="w-3.5 h-3.5" />
                <span>{t.eventsBanner.badge}</span>
              </span>

              {/* Status Badge */}
              {isRegistrationOpen ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.eventsBanner.regOpen}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-bold shadow-sm">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{t.eventsBanner.regClosed}</span>
                </span>
              )}
            </div>

            {/* Multiple Events Switcher Controls */}
            {events.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted">
                  {currentIndex + 1} / {events.length}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={isRtl ? nextEvent : prevEvent}
                    className="p-1.5 rounded-lg bg-dominant border border-subtle hover:border-accent text-secondary hover:text-primary transition-colors cursor-pointer"
                    title={t.eventsBanner.prev}
                    aria-label="Previous"
                  >
                    {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={isRtl ? prevEvent : nextEvent}
                    className="p-1.5 rounded-lg bg-dominant border border-subtle hover:border-accent text-secondary hover:text-primary transition-colors cursor-pointer"
                    title={t.eventsBanner.next}
                    aria-label="Next"
                  >
                    {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Animated Event Content (Pure Text - No Image) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentEvent.id || currentIndex}
              initial={{ opacity: 0, x: isRtl ? -15 : 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? 15 : -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Event Title */}
              <h3 className="text-2xl sm:text-3xl font-extrabold text-primary leading-tight tracking-tight">
                {title}
              </h3>

              {/* Event Metadata (Date, Time, Place) */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs sm:text-sm font-semibold text-secondary">
                {dateStr && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dominant border border-subtle">
                    <Calendar className="w-4 h-4 text-accent shrink-0" />
                    <span>{dateStr}</span>
                  </div>
                )}

                {time && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dominant border border-subtle">
                    <Clock className="w-4 h-4 text-accent shrink-0" />
                    <span>{time}</span>
                  </div>
                )}

                {location && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dominant border border-subtle">
                    <MapPin className="w-4 h-4 text-accent shrink-0" />
                    <span>{location}</span>
                  </div>
                )}

                {currentEvent.registration_type === 'team' && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>{t.eventsPage.teamReg} ({currentEvent.min_team_size || 2}-{currentEvent.max_team_size || 5})</span>
                  </div>
                )}
              </div>

              {/* Pure Text Description (No image) */}
              {description && (
                <p className="text-secondary text-sm sm:text-base leading-relaxed pt-1 whitespace-pre-line">
                  {description}
                </p>
              )}

              {/* Bottom Action Row */}
              <div className="pt-5 flex flex-wrap items-center justify-between gap-4 border-t border-subtle/80">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Direct Registration Form Button if Open */}
                  {isRegistrationOpen ? (
                    <Link
                      to={`/events/${currentEvent.id}/register`}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-accent text-white font-bold text-sm sm:text-base shadow-xl shadow-accent/25 hover:bg-accent-muted hover:shadow-2xl transition-all active:scale-95"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{t.eventsBanner.registerNow}</span>
                      {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-subtle/50 text-muted font-bold text-sm">
                      <XCircle className="w-4 h-4" />
                      <span>{t.eventsBanner.regClosed}</span>
                    </span>
                  )}

                  <Link
                    to="/events"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-secondary hover:text-primary hover:bg-subtle/40 text-sm font-semibold transition-colors"
                  >
                    <span>{t.eventsBanner.viewAllEvents}</span>
                    {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  </Link>
                </div>

                {/* Multiple events bullets */}
                {events.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    {events.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          idx === currentIndex
                            ? 'w-6 bg-accent'
                            : 'w-2 bg-subtle hover:bg-muted'
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
