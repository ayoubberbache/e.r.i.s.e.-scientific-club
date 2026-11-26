import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ArrowLeft,
  Users,
  Zap,
  Star,
  Cpu,
  Leaf,
  Compass,
  Lightbulb,
  Sparkles,
  Globe2,
  Building2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { RegistrationButton } from '../components/RegistrationButton';
import { UpcomingEventsNotification } from '../components/UpcomingEventsNotification';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

const ZaitonaViewer = React.lazy(() =>
  import('../components/ZaitonaModel')
    .then(m => ({ default: m.ZaitonaViewer }))
    .catch(err => {
      console.warn('Failed to load Zaitona 3D model component:', err);
      return { default: () => null };
    })
);

export function Home() {
  const { language, t, getLocalized } = useLanguage();
  const [latestEvent, setLatestEvent] = React.useState<any>(null);
  const [latestAchievement, setLatestAchievement] = React.useState<any>(null);

  const isRtl = language === 'ar';

  React.useEffect(() => {
    async function fetchLatest() {
      try {
        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (eventData) setLatestEvent(eventData);

        const { data: achData } = await supabase
          .from('achievements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
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
    if (path.includes('team-assets')) {
      const clean = path.startsWith('/') ? path.slice(1) : path;
      return `${import.meta.env.BASE_URL}${clean}?v=2`;
    }
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return supabase.storage.from('public_images').getPublicUrl(cleanPath).data.publicUrl;
  };

  const acronymIcons = [Users, Zap, Lightbulb, Leaf, Globe2];

  const tracks = [
    {
      icon: Zap,
      title: language === 'ar' ? 'الطاقات المتجددة' : 'Renewable Energy',
      desc:
        language === 'ar'
          ? 'أنظمة الطاقة الشمسية، طاقة الرياح، والهيدروجين الأخضر.'
          : 'Solar photovoltaics, wind engineering, and clean grid optimization.',
    },
    {
      icon: Cpu,
      title: language === 'ar' ? 'الأنظمة المدمجة وإنترنت الأشياء' : 'Embedded & IoT Systems',
      desc:
        language === 'ar'
          ? 'تصميم الدوائر، الروبوتيك، والمراقبة الذكية للطاقة.'
          : 'Hardware prototyping, robotics telemetry, and real-time sensing.',
    },
    {
      icon: Leaf,
      title: language === 'ar' ? 'الاستدامة البيئية' : 'Environmental Sustainability',
      desc:
        language === 'ar'
          ? 'إدارة الموارد المائية، تقليل البصمة الكربونية، والاقتصاد الدائري.'
          : 'Sustainable materials, circular design, and ecological impact.',
    },
  ];

  return (
    <div className="bg-dominant">
      {/* Hero Section */}
      <section className="relative pt-10 sm:pt-14 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-4xl mx-auto text-center"
          >
            {/* Institution Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary border border-default text-xs font-bold text-accent mb-6">
              <Building2 className="w-3.5 h-3.5" />
              <span>
                {language === 'ar'
                  ? 'المدرسة الوطنية العليا للطاقات المتجددة والبيئة والتنمية المستدامة — باتنة'
                  : 'HNSRE2SD — Higher National School of Renewable Energies, Batna'}
              </span>
            </div>

            {/* Brand Mark */}
            <div className="mb-6 flex justify-center">
              <Logo variant="full" className="h-44 sm:h-56 md:h-64 w-auto" />
            </div>

            {/* Live Upcoming Events Pill */}
            <UpcomingEventsNotification />

            <h1 className="text-3xl sm:text-5xl font-extrabold text-primary tracking-tight leading-[1.18] mb-5">
              {language === 'en' ? (
                <>
                  Engineers for Renewable Energy, <br className="hidden sm:inline" />
                  <span className="text-accent">Innovation &amp; Environmental Sustainability</span>
                </>
              ) : (
                t.home.heroTitle
              )}
            </h1>

            <p className="text-base sm:text-lg text-secondary mb-9 leading-relaxed max-w-2xl mx-auto">
              {t.home.heroSubtitle}
            </p>

            {/* Primary CTA */}
            <div className="mb-12">
              <RegistrationButton />
            </div>
          </motion.div>

          {/* Engineering Focus Strip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 text-left rtl:text-right"
          >
            {tracks.map((tr, i) => {
              const Icon = tr.icon;
              return (
                <div
                  key={i}
                  className="bg-surface rounded-xl border border-default p-5 flex items-start gap-4 hover:border-accent transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-secondary border border-subtle flex items-center justify-center text-accent shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-primary mb-1">{tr.title}</h3>
                    <p className="text-xs text-secondary leading-relaxed">{tr.desc}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* E.R.I.S.E. Acronym Pillars */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14 }}
            className="mb-12 bg-surface rounded-2xl border border-default p-7 sm:p-9 text-left rtl:text-right"
          >
            <div className="text-center max-w-2xl mx-auto mb-7">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-subtle text-accent text-xs font-bold uppercase tracking-wider mb-2">
                <Compass className="w-3.5 h-3.5" />
                {t.home.acronymSectionTitle}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-primary">E • R • I • S • E</h2>
              <p className="text-secondary text-sm mt-1.5">{t.home.acronymSectionSubtitle}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {t.clubAcronymBreakdown.map((item, idx) => {
                const Icon = acronymIcons[idx] || Sparkles;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-dominant border border-default hover:border-accent transition-colors flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl font-black text-accent">{item.letter}</span>
                        <div className="w-8 h-8 rounded-lg bg-secondary border border-subtle flex items-center justify-center text-accent">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="font-bold text-primary text-sm mb-1.5">{item.word}</h3>
                      <p className="text-secondary text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Zaitona 3D Mascot */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="bg-surface rounded-2xl border border-default overflow-hidden max-w-6xl mx-auto flex flex-col md:flex-row items-center"
          >
            <div className="w-full md:w-1/2 p-8 md:p-11 text-left rtl:text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-subtle text-accent text-xs font-bold mb-4 uppercase tracking-wider">
                <Star className="w-3.5 h-3.5" /> {t.home.zaitonaRole}
              </div>
              <h2 className="text-3xl font-bold text-primary mb-3 leading-tight">
                {t.home.meetZaitona} <span className="text-accent">Zaitona • زيتونة</span>
              </h2>
              <p className="text-secondary text-sm sm:text-base leading-relaxed mb-6">
                {t.home.zaitonaDesc}
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <div className="px-4 py-3 rounded-xl bg-dominant border border-default text-center">
                  <div className="text-lg font-bold text-primary">{t.home.zaitonaRoots}</div>
                  <div className="text-[11px] text-muted uppercase font-semibold">{t.home.zaitonaHeritage}</div>
                </div>
                <div className="px-4 py-3 rounded-xl bg-dominant border border-default text-center">
                  <div className="text-lg font-bold text-primary">{t.home.zaitonaGrowth}</div>
                  <div className="text-[11px] text-muted uppercase font-semibold">{t.home.zaitonaInnovation}</div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 h-[360px] md:h-[440px] relative bg-dominant border-t md:border-t-0 md:border-l border-default rtl:md:border-l-0 rtl:md:border-r">
              <React.Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center text-accent text-xs font-semibold">
                    Loading Zaitona...
                  </div>
                }
              >
                <ZaitonaViewer />
              </React.Suspense>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Access Showcase */}
      <section className="py-16 bg-dominant border-t border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Latest Event */}
            <Link
              to="/events"
              className="group bg-surface rounded-2xl border border-default hover:border-accent overflow-hidden transition-colors flex flex-col text-left rtl:text-right"
            >
              <div className="h-48 relative overflow-hidden bg-dominant border-b border-subtle">
                <img
                  src={formatImageUrl(latestEvent?.image || 'events-assets/english_corner.jpg')}
                  alt="Event"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="text-[11px] font-bold text-accent uppercase tracking-wider mb-1.5">
                  {t.home.quickLatestEvent}
                </div>
                <h3 className="text-lg font-bold text-primary mb-2 group-hover:text-accent transition-colors leading-snug">
                  {latestEvent ? getLocalized(latestEvent, 'title') || latestEvent.title : t.eventsPage.upcomingTab}
                </h3>
                <p className="text-secondary text-xs sm:text-sm line-clamp-3 mb-4 flex-1 leading-relaxed">
                  {latestEvent
                    ? getLocalized(latestEvent, 'description') || latestEvent.description
                    : t.eventsBanner.noUpcoming}
                </p>
                <div className="flex items-center justify-between text-accent font-bold text-xs border-t border-subtle pt-3.5 mt-auto">
                  <span>{t.home.quickViewEvents}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </div>
              </div>
            </Link>

            {/* Team Preview */}
            <Link
              to="/team"
              className="group bg-surface rounded-2xl border border-default hover:border-accent overflow-hidden transition-colors flex flex-col text-left rtl:text-right"
            >
              <div className="h-48 relative overflow-hidden bg-dominant border-b border-subtle">
                <img
                  src={`${import.meta.env.BASE_URL}team-assets/our%20team.JPG?v=2`}
                  alt="Team"
                  className="w-full h-full object-cover object-top group-hover:scale-103 transition-transform duration-300"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="text-[11px] font-bold text-accent uppercase tracking-wider mb-1.5">
                  {t.home.quickOurTeam}
                </div>
                <h3 className="text-lg font-bold text-primary mb-2 group-hover:text-accent transition-colors leading-snug">
                  {t.home.quickMeetTeam}
                </h3>
                <p className="text-secondary text-xs sm:text-sm line-clamp-3 mb-4 flex-1 leading-relaxed">
                  {t.home.quickTeamDesc}
                </p>
                <div className="flex items-center justify-between text-accent font-bold text-xs border-t border-subtle pt-3.5 mt-auto">
                  <span>{t.home.quickExploreTeam}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </div>
              </div>
            </Link>

            {/* Achievements Preview */}
            <Link
              to="/achievements"
              className="group bg-surface rounded-2xl border border-default hover:border-accent overflow-hidden transition-colors flex flex-col text-left rtl:text-right"
            >
              <div className="h-48 relative overflow-hidden bg-dominant border-b border-subtle">
                <img
                  src={formatImageUrl(latestAchievement?.image || 'events-assets/english_corner.jpg')}
                  alt="Achievements"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="text-[11px] font-bold text-accent uppercase tracking-wider mb-1.5">
                  {t.home.quickImpact}
                </div>
                <h3 className="text-lg font-bold text-primary mb-2 group-hover:text-accent transition-colors leading-snug">
                  {latestAchievement
                    ? getLocalized(latestAchievement, 'title') || latestAchievement.title
                    : t.home.quickAchievements}
                </h3>
                <p className="text-secondary text-xs sm:text-sm line-clamp-3 mb-4 flex-1 leading-relaxed">
                  {latestAchievement
                    ? getLocalized(latestAchievement, 'description') || latestAchievement.description
                    : t.home.quickAchievementsDesc}
                </p>
                <div className="flex items-center justify-between text-accent font-bold text-xs border-t border-subtle pt-3.5 mt-auto">
                  <span>{t.home.quickViewAchievements}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
