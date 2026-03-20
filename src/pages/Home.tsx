import { ArrowRight, Leaf, Zap, Globe, Users, Award, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Logo } from '../components/Logo';
import { useSiteData } from '../contexts/SiteDataContext';

export function Home() {
  const { events: LATEST_EVENTS, achievements: ACHIEVEMENTS, home } = useSiteData();

  // Get latest items
  const latestEvent = [...LATEST_EVENTS].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const latestAchievement = [...ACHIEVEMENTS].sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : 0;
    const timeB = b.date ? new Date(b.date).getTime() : 0;
    return timeB - timeA;
  })[0];

  return (
    <div className="min-h-screen bg-dominant">
      {/* Hero Section */}
      <section className="relative bg-surface overflow-hidden">
        <div className="absolute inset-0 gradient-hero z-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center mb-8"
            >
              <Logo variant={home.hero.logoVariant} className="h-40 w-40 md:h-72 md:w-72" />
            </motion.div>
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-4xl md:text-6xl font-extrabold text-primary tracking-tight mb-6"
            >
              {home.hero.title}
            </motion.h1>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-4 text-xl text-muted max-w-2xl mx-auto"
            >
              {home.hero.subtitle}
            </motion.p>
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-10 flex justify-center gap-4"
            >
              <Link to="/events" className="px-8 py-3 border border-transparent text-base font-medium rounded-full shadow-sm btn-on-accent bg-accent hover:bg-accent-muted transition-colors">
                Discover Events
              </Link>
              <Link to="/team" className="px-8 py-3 border border-default text-base font-medium rounded-full shadow-sm text-secondary bg-surface hover:bg-secondary transition-colors">
                Meet the Team
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-primary sm:text-4xl">{home.about.title}</h2>
            <p className="mt-4 text-lg text-muted max-w-3xl mx-auto">
              {home.about.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-secondary rounded-2xl p-8 text-center hover:shadow-lg transition-shadow border border-subtle">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6 btn-on-accent">
                <Leaf className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-4">Environmental Sustainability</h3>
              <p className="text-secondary">{home.impact.sustainability}</p>
            </div>
            <div className="bg-secondary rounded-2xl p-8 text-center hover:shadow-lg transition-shadow border border-subtle">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6 btn-on-accent">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-4">Renewable Energy</h3>
              <p className="text-secondary">{home.impact.renewable}</p>
            </div>
            <div className="bg-secondary rounded-2xl p-8 text-center hover:shadow-lg transition-shadow border border-subtle">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6 btn-on-accent">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-4">Global Impact</h3>
              <p className="text-secondary">{home.impact.global}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="py-20 bg-dominant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Latest Events Preview */}
            <Link to="/events" className="group bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden hover:shadow-xl transition-all flex flex-col">
              <div className="h-48 relative overflow-hidden">
                <img 
                  src={latestEvent?.image || `${import.meta.env.BASE_URL}events-assets/english_corner.jpg`} 
                  alt="Event" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-accent mb-3">
                  <Calendar className="w-5 h-5" />
                  <span className="font-semibold">Latest Events</span>
                </div>
                <h3 className="text-xl font-bold text-primary mb-2 group-hover:text-accent transition-colors">
                  {latestEvent?.title || "Upcoming Events"}
                </h3>
                <p className="text-muted mb-4 line-clamp-2 flex-1">
                  {latestEvent?.description || "Stay tuned for our upcoming workshops and symposiums on green technology."}
                </p>
                <span className="text-accent font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  View all events <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>

            {/* Team Preview */}
            <Link to="/team" className="group bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden hover:shadow-xl transition-all flex flex-col">
              <div className="h-48 relative overflow-hidden">
                <img 
                  src={`${import.meta.env.BASE_URL}Team/our%20team.JPG`} 
                  alt="Team" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-accent mb-3">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">Our Team</span>
                </div>
                <h3 className="text-xl font-bold text-primary mb-2 group-hover:text-accent transition-colors">Meet the Innovators</h3>
                <p className="text-muted mb-4 line-clamp-2 flex-1">Discover the passionate leaders and members who drive E.R.I.S.E. forward, organizing events and leading impactful projects.</p>
                <span className="text-accent font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  View members <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>

            {/* Achievements Preview */}
            <Link to="/achievements" className="group bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden hover:shadow-xl transition-all md:col-span-2 lg:col-span-1 flex flex-col">
              <div className="h-48 relative overflow-hidden">
                <img 
                  src={latestAchievement?.image || "https://picsum.photos/seed/trophy/800/600"} 
                  alt="Achievements" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-accent mb-3">
                  <Award className="w-5 h-5" />
                  <span className="font-semibold">Achievements</span>
                </div>
                <h3 className="text-xl font-bold text-primary mb-2 group-hover:text-accent transition-colors">
                  {latestAchievement?.title || "Our Trophies & Awards"}
                </h3>
                <p className="text-muted mb-4 line-clamp-2 flex-1">
                  {latestAchievement?.description || "Explore our proudest moments, from winning national competitions to receiving recognition for our environmental initiatives."}
                </p>
                <span className="text-accent font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  View achievements <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>

          </div>
        </div>
      </section>
    </div>
  );
}
