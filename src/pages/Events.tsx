import React, { useState } from 'react';
import { Calendar as CalendarIcon, MapPin, Clock, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSiteData } from '../contexts/SiteDataContext';

export function Events() {
  const { events: LATEST_EVENTS } = useSiteData();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // Helper to sort and categorize events
  const categorizedEvents = LATEST_EVENTS.reduce((acc, event) => {
    const eventDate = new Date(event.date);
    // Set both dates to beginning of day for fair comparison
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

  // Monthly events for "Upcoming this month" list should stick to current displayed month in calendar
  const monthlyUpcomingEvents = categorization(LATEST_EVENTS).upcoming.filter(event => {
    const d = new Date(event.date);
    return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
  });

  // Helper function to re-categorize for the monthly view if needed
  function categorization(events: any[]) {
    return events.reduce((acc, event) => {
      const eventDate = new Date(event.date);
      const comparisonDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()) >= comparisonDate) {
        acc.upcoming.push(event);
      } else {
        acc.past.push(event);
      }
      return acc;
    }, { upcoming: [] as any[], past: [] as any[] });
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  // Simple calendar generation
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Derive events for the calendar view (All events)
  const calendarEvents: Record<number, string[]> = {};
  LATEST_EVENTS.forEach(event => {
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
          <h1 className="text-4xl font-extrabold text-primary tracking-tight sm:text-5xl">
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
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2 capitalize">
              <CalendarIcon className="w-6 h-6 text-accent" /> {activeTab} Events
            </h2>
            
            <div className="space-y-6">
              {displayEvents.length > 0 ? (
                displayEvents.map((event) => (
                  <div key={event.id} className="bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow">
                    <div className="md:w-1/3 h-48 md:h-auto relative overflow-hidden">
                      <img 
                        src={event.image} 
                        alt={event.title} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                      <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-accent shadow-sm">
                        {event.status}
                      </div>
                    </div>
                    <div className="p-6 md:w-2/3 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-primary mb-2">{event.title}</h3>
                        <p className="text-secondary text-sm mb-4 line-clamp-2">{event.description}</p>
                        
                        <div className="space-y-2 text-sm text-muted">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-accent" />
                            <span>{event.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-accent" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-accent" />
                            <span>{event.location}</span>
                          </div>
                        </div>
                      </div>
                      {!event.noRegistration && activeTab === 'upcoming' && (
                        <div className="mt-6 flex justify-end">
                          <button className="text-accent font-medium flex items-center gap-1 hover:gap-2 transition-all">
                            Register Now <ArrowRight className="w-4 h-4" />
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
    </div>
  );
}
