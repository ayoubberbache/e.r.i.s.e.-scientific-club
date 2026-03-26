import React, { useState } from 'react';
 import { Calendar as CalendarIcon, MapPin, Clock, ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
 import { EVENTS } from '../data/siteData';
 import { Logo } from '../components/Logo';

export function Events() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const formatImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const baseUrl = import.meta.env.BASE_URL || '/';
    return `${baseUrl}${cleanPath}`;
  };

  // Helper to sort and categorize events
  const categorizedEvents = EVENTS.reduce((acc, event) => {
    const eventDate = new Date(event.date);
    const comparisonDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const eventComparisonDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    
    if (eventComparisonDate >= comparisonDate) {
      acc.upcoming.push(event);
    } else {
      acc.past.push(event);
    }
    return acc;
  }, { upcoming: [] as any[], past: [] as any[] });

  // Sort upcoming chronologically, past reverse chronologically
  categorizedEvents.upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  categorizedEvents.past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const displayEvents = activeTab === 'upcoming' ? categorizedEvents.upcoming : categorizedEvents.past;

  // Monthly events for "Upcoming this month" list
  const monthlyUpcomingEvents = categorizedEvents.upcoming.filter(event => {
    const d = new Date(event.date);
    return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
  });

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const calendarEvents: Record<number, string[]> = {};
  EVENTS.forEach(event => {
    const d = new Date(event.date);
    if (d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear()) {
      const day = d.getDate();
      if (!calendarEvents[day]) calendarEvents[day] = [];
      calendarEvents[day].push(event.title);
    }
  });

  return (
    <div className="min-h-screen bg-dominant py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-primary tracking-tight sm:text-5xl flex items-center justify-center gap-3">
            Events & <span className="text-accent">Calendar</span>
          </h1>
          <p className="mt-4 text-xl text-muted max-w-2xl mx-auto">
            Stay updated with our latest workshops, symposiums, and sessions. Join us in shaping a sustainable future.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-surface p-1 rounded-xl border border-subtle flex gap-1">
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'upcoming' ? 'bg-accent text-white shadow-md' : 'text-muted hover:text-primary'}`}
            >
              Upcoming Events
            </button>
            <button 
              onClick={() => setActiveTab('past')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'past' ? 'bg-accent text-white shadow-md' : 'text-muted hover:text-primary'}`}
            >
              Past Events
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Events List */}
          <div className="lg:col-span-2 space-y-12">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2 capitalize">
              <CalendarIcon className="w-6 h-6 text-accent" /> {activeTab} Feed
            </h2>
            
            <div className="space-y-10 max-w-2xl mx-auto lg:mx-0">
              {displayEvents.length > 0 ? (
                displayEvents.map((event) => (
                  <div key={event.id} className="bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                    
                    {/* Post Header */}
                    <div className="p-4 flex items-center gap-3 border-b border-subtle">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-subtle">
                        <Logo variant="icon" className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-primary leading-tight">E.R.I.S.E. Scientific Club</h3>
                        <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-wider">
                          <span>{event.date}</span>
                          <span>•</span>
                          <span className="text-accent font-bold">{event.status}</span>
                        </div>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-primary mb-3">{event.title}</h3>
                      <p className="text-secondary text-sm leading-relaxed mb-4">{event.description}</p>
                    </div>

                    {/* Post Media (Collage or Single) */}
                    <div className="relative aspect-video bg-secondary/30 border-y border-subtle overflow-hidden">
                      {event.images && event.images.length >= 4 ? (
                        <div className="grid grid-cols-2 grid-rows-2 h-full gap-1 cursor-pointer" onClick={() => setSelectedImage(event.images![0])}>
                          {event.images.slice(0, 4).map((img, i) => (
                            <div key={i} className="relative group overflow-hidden">
                              <img 
                                src={formatImageUrl(img)} 
                                alt={`${event.title} ${i + 1}`} 
                                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${event.title.includes('Lore Academy') ? 'blur-md grayscale' : ''}`} 
                                onClick={(e) => { e.stopPropagation(); setSelectedImage(img); }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <img 
                          src={formatImageUrl(event.image)} 
                          alt={event.title} 
                          className={`w-full h-full object-cover cursor-pointer ${event.title.includes('Lore Academy') ? 'blur-md grayscale' : ''}`} 
                          onClick={() => setSelectedImage(event.image)}
                        />
                      )}
                    </div>

                    {/* Post Footer */}
                    <div className="p-5 border-t border-subtle bg-dominant/30">
                      <div className="flex flex-wrap gap-4 text-xs text-secondary font-medium">
                        {event.time && (
                          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full border border-subtle">
                            <Clock className="w-3.5 h-3.5 text-accent" />
                            <span>{event.time}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full border border-subtle">
                          <MapPin className="w-3.5 h-3.5 text-accent" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                      
                      {!event.noRegistration && activeTab === 'upcoming' && (
                        <div className="mt-6 flex justify-end">
                          <button className="px-6 py-2 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent-muted transition-all shadow-md">
                            Register Now
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-surface rounded-2xl p-12 text-center border border-subtle border-dashed">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary text-accent mb-4">
                    <CalendarIcon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-2">No {activeTab} Events</h3>
                  <p className="text-secondary max-w-sm mx-auto">
                    {activeTab === 'upcoming' 
                      ? "We're currently planning our next exciting events. Stay tuned!" 
                      : "We haven't archived any past events yet."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Calendar Widget */}
          <div className="lg:col-span-1">
            <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-6 sticky top-28">
              <h2 className="text-xl font-bold text-primary mb-6 flex items-center justify-between">
                <span>Calendar</span>
                <div className="flex gap-2">
                  <button onClick={prevMonth} aria-label="Previous Month" className="p-1 rounded-full hover:bg-secondary text-muted transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={nextMonth} aria-label="Next Month" className="p-1 rounded-full hover:bg-secondary text-muted transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </h2>
              
              <div className="text-center font-semibold text-lg text-accent mb-4">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-xs font-medium text-muted py-2">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {days.map((day, idx) => {
                  const isToday = day === today.getDate() && 
                                 currentMonth.getMonth() === today.getMonth() && 
                                 currentMonth.getFullYear() === today.getFullYear();
                  const hasEvent = day && calendarEvents[day];
                  
                  return (
                    <div 
                      key={idx} 
                      className={`
                        aspect-square flex items-center justify-center text-sm rounded-full relative
                        ${!day ? '' : 'hover:bg-secondary cursor-pointer transition-colors'}
                        ${isToday ? 'bg-accent/10 text-accent font-bold ring-1 ring-accent/30' : 'text-secondary'}
                        ${hasEvent ? 'font-bold underline decoration-accent decoration-2 underline-offset-4' : ''}
                      `}
                      title={hasEvent ? calendarEvents[day].join(', ') : ''}
                    >
                      {day}
                      {hasEvent && (
                        <div className="absolute bottom-1.5 w-1 h-1 bg-accent rounded-full"></div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-subtle">
                <h3 className="text-sm font-bold text-primary mb-4 uppercase tracking-wider">Upcoming this month</h3>
                {monthlyUpcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {monthlyUpcomingEvents.map(event => {
                      const eventDate = new Date(event.date);
                      const eventDay = eventDate.getDate();
                      const eventMonth = eventDate.toLocaleString('default', { month: 'short' });
                      return (
                        <div key={event.id} className="flex items-start gap-3 text-sm">
                          <div className="w-10 h-10 rounded-lg bg-secondary text-accent flex flex-col items-center justify-center shrink-0 font-bold">
                            <span className="text-xs leading-none uppercase">{eventMonth}</span>
                            <span className="leading-none mt-1">{eventDay}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-primary line-clamp-1">{event.title}</p>
                            <p className="text-muted text-xs mt-0.5">{event.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted italic">No upcoming events this month.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={() => setSelectedImage(null)}
            title="Close"
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={formatImageUrl(selectedImage)} 
            alt="Full size" 
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
