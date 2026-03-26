import React from 'react';
import { ArrowRight, Target, Users, Zap, Award, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HOME, EVENTS, ACHIEVEMENTS } from '../data/siteData';
import { Logo } from '../components/Logo';


export function Home() {
  // Get latest items
  const latestEvent = EVENTS[0];
  const latestAchievement = ACHIEVEMENTS[0];

  const formatImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const baseUrl = import.meta.env.BASE_URL || '/';
    return `${baseUrl}${cleanPath}`;
  };

  return (
    <div className="bg-dominant">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dominant z-10" />
          <div className="absolute inset-0 bg-accent-tint/10" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-14 animate-fade-in flex justify-center">
              <Logo variant="full" className="h-64 md:h-96 w-auto" />
            </div>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-tint text-accent text-sm font-bold mb-6 animate-fade-in mx-auto">
              <Zap className="w-4 h-4" /> Innovating for Tomorrow
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-primary tracking-tight leading-[1.1] mb-8 animate-fade-in">
              {HOME.hero.title.split(' & ').map((part, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-accent"> & </span>}
                  {part}
                </React.Fragment>
              ))}
            </h1>
            
            <p className="text-xl text-secondary mb-12 leading-relaxed max-w-2xl mx-auto animate-fade-in">
              {HOME.hero.subtitle}
            </p>

            {/* Impact Cards integrated into Hero */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-in text-left">
              {[
                { icon: Award, label: "Sustainability", text: HOME.impact.sustainability },
                { icon: Zap, label: "Renewable Energy", text: HOME.impact.renewable },
                { icon: BookOpen, label: "Global Goal", text: HOME.impact.global }
              ].map((item, i) => (
                <div key={i} className="p-6 bg-surface/50 backdrop-blur-sm rounded-2xl border border-subtle hover:border-accent transition-all flex flex-col gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-accent-tint flex items-center justify-center text-accent">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary mb-2 leading-tight">{item.label}</h3>
                    <p className="text-secondary text-sm leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Hero buttons removed */}
          </div>
        </div>
      </section>

      {/* About Section removed */}

      {/* Quick Access */}
      <section className="py-24 bg-dominant border-y border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Latest Event */}
            <Link to="/events" className="group bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden hover:shadow-xl transition-all flex flex-col">
              <div className="h-48 relative overflow-hidden">
                <img 
                  src={formatImageUrl(latestEvent?.image || 'events-assets/english_corner.jpg')} 
                  alt="Event" 
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${latestEvent?.title.includes('Lore Academy') ? 'blur-md grayscale' : ''}`} 
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Latest Event</div>
                <h3 className="text-xl font-bold text-primary mb-3 group-hover:text-accent transition-colors leading-tight">
                  {latestEvent?.title || "Upcoming Events"}
                </h3>
                <p className="text-secondary text-sm line-clamp-3 mb-4 flex-1">
                  {latestEvent?.description || "Explore our latest workshops, symposiums, and sessions. Join us in shaping a sustainable future."}
                </p>
                <div className="flex items-center gap-2 text-accent font-bold text-sm text-center justify-center border-t border-subtle pt-4 mt-auto">
                  View Events <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Team Preview */}
            <Link to="/team" className="group bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden hover:shadow-xl transition-all flex flex-col">
              <div className="h-48 relative overflow-hidden">
                <img 
                  src={formatImageUrl(HOME.teamPreviewImage || 'team-assets/our team.JPG')} 
                  alt="Team" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Our Team</div>
                <h3 className="text-xl font-bold text-primary mb-3 group-hover:text-accent transition-colors leading-tight">Meet our Team</h3>
                <p className="text-secondary text-sm line-clamp-3 mb-4 flex-1">
                  Learn more about the dedicated individuals leading E.R.I.S.E. and their commitment to sustainable engineering.
                </p>
                <div className="flex items-center gap-2 text-accent font-bold text-sm text-center justify-center border-t border-subtle pt-4 mt-auto">
                  Explore Team <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Achievements Preview */}
            <Link to="/achievements" className="group bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden hover:shadow-xl transition-all md:col-span-2 lg:col-span-1 flex flex-col">
              <div className="h-48 relative overflow-hidden">
                <img 
                  src={formatImageUrl(latestAchievement?.image || 'https://picsum.photos/seed/trophy/800/600')} 
                  alt="Achievements" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Impact</div>
                <h3 className="text-xl font-bold text-primary mb-3 group-hover:text-accent transition-colors leading-tight">Our Achievements</h3>
                <p className="text-secondary text-sm line-clamp-3 mb-4 flex-1">
                  Celebrating milestones and successes in our journey towards creating a significant impact in the field of renewable energy.
                </p>
                <div className="flex items-center gap-2 text-accent font-bold text-sm text-center justify-center border-t border-subtle pt-4 mt-auto">
                  View Achievements <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
