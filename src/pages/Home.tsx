import React from 'react';
import { ArrowRight, ArrowLeft, Target, Users, Zap, Award, BookOpen, Star, Bot, Cpu, Leaf, Compass, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HOME } from '../data/siteData';
import { Logo } from '../components/Logo';
import { RegistrationButton } from '../components/RegistrationButton';
import { UpcomingEventsNotification } from '../components/UpcomingEventsNotification';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

const ZaitonaViewer = React.lazy(() => import('../components/ZaitonaModel').then(m => ({ default: m.ZaitonaViewer })));

export function Home() {
  const { language, t, getLocalized } = useLanguage();
  const [latestEvent, setLatestEvent] = React.useState<any>(null);
  const [latestAchievement, setLatestAchievement] = React.useState<any>(null);

  const isRtl = language === 'ar';

  React.useEffect(() => {
    async function fetchLatest() {
      try {
        const { data: eventData } = await supabase.from('events').select('*').order('start_date', { ascending: false }).limit(1).maybeSingle();
        if (eventData) setLatestEvent(eventData);

        const { data: achData } = await supabase.from('achievements').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (achData) setLatestAchievement(achData);
      } catch (err) {
        console.warn('Error fetching latest content:', err);
      }
    }
    fetchLatest();
  }, []);

  const formatImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return supabase.storage.from('public_images').getPublicUrl(cleanPath).data.publicUrl;
  };

  const acronymIcons = [Zap, Bot, Lightbulb, Leaf, Users];

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
            {/* Main Big Logo */}
            <div className="mb-8 animate-fade-in flex justify-center">
              <Logo variant="full" className="h-64 md:h-96 w-auto" />
            </div>

            {/* UPCOMING EVENTS NOTIFICATION BANNER (Appears just below big logo) */}
            <UpcomingEventsNotification />
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-tint text-accent text-sm font-bold mb-6 animate-fade-in mx-auto shadow-sm">
              <Zap className="w-4 h-4" />
              <span>{t.home.heroBadge}</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-primary tracking-tight leading-[1.15] mb-8 animate-fade-in">
              {language === 'en' ? (
                <>
                  Energy <span className="text-accent">•</span> Robotic <span className="text-accent">•</span> Innovation <span className="text-accent">•</span> Sustainable <span className="text-accent">•</span> Engineers
                </>
              ) : (
                t.home.heroTitle
              )}
            </h1>
            
            <p className="text-lg sm:text-xl text-secondary mb-12 leading-relaxed max-w-3xl mx-auto animate-fade-in">
              {t.home.heroSubtitle}
            </p>

            {/* Registration CTA */}
            <div className="mb-14 animate-fade-in">
              <RegistrationButton />
            </div>

            {/* E.R.I.S.E. Acronym Pillars Breakdown Section */}
            <div className="mb-16 bg-surface/50 backdrop-blur-md rounded-3xl border border-subtle p-8 sm:p-10 shadow-xl animate-fade-in text-left rtl:text-right">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider mb-2">
                  <Compass className="w-3.5 h-3.5" />
                  {t.home.acronymSectionTitle}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-primary">
                  E • R • I • S • E
                </h2>
                <p className="text-secondary text-sm mt-2">
                  {t.home.acronymSectionSubtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {t.clubAcronymBreakdown.map((item, idx) => {
                  const Icon = acronymIcons[idx] || Sparkles;
                  return (
                    <div 
                      key={idx}
                      className="p-5 rounded-2xl bg-dominant/80 border border-subtle hover:border-accent hover:shadow-lg transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-2xl font-black text-accent group-hover:scale-110 transition-transform">
                            {item.letter}
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-accent-tint flex items-center justify-center text-accent">
                            <Icon className="w-4 h-4" />
                          </div>
                        </div>
                        <h3 className="font-bold text-primary text-base mb-2">
                          {item.word}
                        </h3>
                        <p className="text-secondary text-xs leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Zaitona 3D Mascot Brand */}
            <div className="mb-16 bg-surface/30 rounded-3xl border border-subtle overflow-hidden relative shadow-2xl animate-fade-in max-w-5xl mx-auto flex flex-col md:flex-row items-center">
              <div className="w-full md:w-1/2 p-8 md:p-12 text-left rtl:text-right">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold mb-4 uppercase tracking-wider">
                  <Star className="w-4 h-4" /> {t.home.zaitonaRole}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4 leading-tight">
                  {t.home.meetZaitona} <span className="text-accent">Zaitona • زيتونة</span>
                </h2>
                <p className="text-secondary leading-relaxed mb-6">
                  {t.home.zaitonaDesc}
                </p>
                <div className="flex gap-4">
                  <div className="px-4 py-2 rounded-lg bg-dominant border border-subtle flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-primary">{t.home.zaitonaRoots}</span>
                    <span className="text-xs text-muted uppercase">{t.home.zaitonaHeritage}</span>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-dominant border border-subtle flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-primary">{t.home.zaitonaGrowth}</span>
                    <span className="text-xs text-muted uppercase">{t.home.zaitonaInnovation}</span>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 h-[400px] md:h-[500px] relative bg-gradient-to-br from-accent/5 to-transparent">
                <React.Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-accent animate-pulse">Loading Zaitona...</div>}>
                  <ZaitonaViewer />
                </React.Suspense>
              </div>
            </div>

            {/* Impact Cards integrated into Hero */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-in text-left rtl:text-right">
              {[
                { icon: Award, label: t.home.impactSustainabilityTitle, text: t.home.impactSustainabilityDesc },
                { icon: Zap, label: t.home.impactRenewableTitle, text: t.home.impactRenewableDesc },
                { icon: Bot, label: t.home.impactRoboticsTitle, text: t.home.impactRoboticsDesc }
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
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section className="py-24 bg-dominant border-y border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Latest Event */}
            <Link to="/events" className="group bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden hover:shadow-xl transition-all flex flex-col text-left rtl:text-right">
              <div className="h-48 relative overflow-hidden">
                <img 
                  src={formatImageUrl(latestEvent?.image || 'events-assets/english_corner.jpg')} 
                  alt="Event" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="text-xs font-bold text-accent uppercase tracking-wider mb-2">{t.home.quickLatestEvent}</div>
                <h3 className="text-xl font-bold text-primary mb-3 group-hover:text-accent transition-colors leading-tight">
                  {latestEvent ? (getLocalized(latestEvent, 'title') || latestEvent.title) : t.eventsPage.upcomingTab}
                </h3>
                <p className="text-secondary text-sm line-clamp-3 mb-4 flex-1">
                  {latestEvent ? (getLocalized(latestEvent, 'description') || latestEvent.description) : t.eventsBanner.noUpcoming}
                </p>
                <div className="flex items-center gap-2 text-accent font-bold text-sm text-center justify-center border-t border-subtle pt-4 mt-auto">
                  <span>{t.home.quickViewEvents}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </div>
              </div>
            </Link>

            {/* Team Preview */}
            <Link to="/team" className="group bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden hover:shadow-xl transition-all flex flex-col text-left rtl:text-right">
              <div className="h-48 relative overflow-hidden">
                <img 
                  src={formatImageUrl(HOME.teamPreviewImage || 'team-assets/our team.JPG')} 
                  alt="Team" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="text-xs font-bold text-accent uppercase tracking-wider mb-2">{t.home.quickOurTeam}</div>
                <h3 className="text-xl font-bold text-primary mb-3 group-hover:text-accent transition-colors leading-tight">
                  {t.home.quickMeetTeam}
                </h3>
                <p className="text-secondary text-sm line-clamp-3 mb-4 flex-1">
                  {t.home.quickTeamDesc}
                </p>
                <div className="flex items-center gap-2 text-accent font-bold text-sm text-center justify-center border-t border-subtle pt-4 mt-auto">
                  <span>{t.home.quickExploreTeam}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </div>
              </div>
            </Link>

            {/* Achievements Preview */}
            <Link to="/achievements" className="group bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden hover:shadow-xl transition-all md:col-span-2 lg:col-span-1 flex flex-col text-left rtl:text-right">
              <div className="h-48 relative overflow-hidden">
                <img 
                  src={formatImageUrl(latestAchievement?.image || 'https://picsum.photos/seed/trophy/800/600')} 
                  alt="Achievements" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="text-xs font-bold text-accent uppercase tracking-wider mb-2">{t.home.quickImpact}</div>
                <h3 className="text-xl font-bold text-primary mb-3 group-hover:text-accent transition-colors leading-tight">
                  {latestAchievement ? (getLocalized(latestAchievement, 'title') || latestAchievement.title) : t.home.quickAchievements}
                </h3>
                <p className="text-secondary text-sm line-clamp-3 mb-4 flex-1">
                  {latestAchievement ? (getLocalized(latestAchievement, 'description') || latestAchievement.description) : t.home.quickAchievementsDesc}
                </p>
                <div className="flex items-center gap-2 text-accent font-bold text-sm text-center justify-center border-t border-subtle pt-4 mt-auto">
                  <span>{t.home.quickViewAchievements}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </div>
              </div>
            </Link>

          </div>
        </div>
      </section>
    </div>
  );
}
