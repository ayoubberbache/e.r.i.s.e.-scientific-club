import { Award, Trophy, Star, Medal } from 'lucide-react';
import { useSiteData } from '../contexts/SiteDataContext';

export function Achievements() {
  const { achievements: ACHIEVEMENTS } = useSiteData();

  const sortedAchievements = [...ACHIEVEMENTS].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : parseInt(a.year) || 0;
    const dateB = b.date ? new Date(b.date).getTime() : parseInt(b.year) || 0;
    return dateB - dateA;
  });

  return (
    <div className="min-h-screen bg-dominant py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-secondary text-accent rounded-full mb-6">
            <Trophy className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-extrabold text-primary tracking-tight sm:text-5xl mb-4">
            Our <span className="text-accent">Achievements</span>
          </h1>
          <p className="text-xl text-muted max-w-2xl mx-auto">
            Celebrating our milestones, trophies, and the impact we've made in the fields of renewable energy and environmental sustainability.
          </p>
        </div>

        {/* Timeline / Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {sortedAchievements.length > 0 ? (
            sortedAchievements.map((achievement) => {
              const Icon = achievement.icon || Award;
              const year = achievement.year || new Date(achievement.date).getFullYear();
              return (
                <div key={achievement.id} className="bg-surface rounded-3xl shadow-sm border border-subtle overflow-hidden hover:shadow-xl transition-all group flex flex-col">
                  <div className="h-64 relative overflow-hidden">
                    <img 
                      src={achievement.image} 
                      alt={achievement.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                      <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white font-bold text-sm border border-white/30">
                        {year}
                      </div>
                      <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center shadow-lg btn-on-accent transform group-hover:-translate-y-2 transition-transform">
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="text-xs font-bold text-accent uppercase tracking-wider mb-2">
                      {achievement.category}
                    </div>
                    <h3 className="text-2xl font-bold text-primary mb-4 group-hover:text-accent transition-colors">
                      {achievement.title}
                    </h3>
                    <p className="text-secondary leading-relaxed flex-1">
                      {achievement.description}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="md:col-span-2 bg-surface rounded-3xl p-16 text-center border border-subtle border-dashed">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-secondary text-accent rounded-full mb-6">
                <Trophy className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-4">No Achievements to Show Yet</h3>
              <p className="text-secondary max-w-lg mx-auto leading-relaxed">
                We're currently working on exciting new projects and competitions. 
                Our team is dedicated to excellence and we'll be sharing our new milestones here soon!
              </p>
            </div>
          )}
        </div>



      </div>
    </div>
  );
}
