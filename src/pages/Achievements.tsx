import React from 'react';
 import { Trophy, Award, Star, Zap, Users, Target, X } from 'lucide-react';
 import { ACHIEVEMENTS } from '../data/siteData';
 import { Logo } from '../components/Logo';
 import { useState } from 'react';

export function Achievements() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const formatImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const baseUrl = import.meta.env.BASE_URL || '/';
    return `${baseUrl}${cleanPath}`;
  };

  return (
    <div className="min-h-screen bg-dominant py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-tint text-accent text-sm font-bold mb-6">
            <Trophy className="w-4 h-4" /> Excellence & Impact
          </div>
          <h1 className="text-4xl font-extrabold text-primary tracking-tight sm:text-5xl lg:text-6xl mb-6">
            Our <span className="text-accent">Success Stories</span>
          </h1>
          <p className="text-xl text-secondary max-w-3xl mx-auto leading-relaxed">
            Celebrating our milestones, and the collective progress we've made in promoting sustainability and renewable energy innovation.
          </p>
        </div>

        {/* Impact Stats removed */}

        {/* Achievements Feed */}
        <div className="space-y-12 max-w-2xl mx-auto">
          {ACHIEVEMENTS.length > 0 ? (
            ACHIEVEMENTS.map((achievement) => (
              <div key={achievement.id} className="bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                
                {/* Post Header */}
                <div className="p-4 flex items-center gap-3 border-b border-subtle">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-subtle">
                    <Logo variant="icon" className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary leading-tight">E.R.I.S.E. Scientific Club</h3>
                    <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-wider">
                      <span>{achievement.year}</span>
                      <span>•</span>
                      <span className="text-accent font-bold">{achievement.category}</span>
                    </div>
                  </div>
                </div>

                {/* Post Media */}
                <div className="relative aspect-video bg-secondary/30 border-b border-subtle overflow-hidden">
                  {achievement.images && achievement.images.length > 1 ? (
                    <div className="grid grid-cols-2 grid-rows-2 h-full gap-1 cursor-pointer" onClick={() => setSelectedImage(achievement.images![0])}>
                      {achievement.images.slice(0, 4).map((img, i) => (
                        <div key={i} className={`relative group overflow-hidden ${achievement.images!.length === 3 && i === 0 ? 'row-span-2' : ''}`}>
                          <img 
                            src={formatImageUrl(img)} 
                            alt={`${achievement.title} ${i + 1}`} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onClick={(e) => { e.stopPropagation(); setSelectedImage(img); }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <img 
                      src={formatImageUrl(achievement.image)} 
                      alt={achievement.title} 
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                      onClick={() => setSelectedImage(achievement.image)}
                    />
                  )}
                </div>

                {/* Post Content */}
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-primary mb-4 group-hover:text-accent transition-colors">
                    {achievement.title}
                  </h3>
                  <p className="text-secondary leading-relaxed mb-6">
                    {achievement.description}
                  </p>
                  <div className="flex items-center gap-2 text-sm font-bold text-accent">
                    <Award className="w-5 h-5" /> Recognition of Excellence
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-surface rounded-3xl p-16 text-center border-2 border-subtle border-dashed">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary text-accent mb-6">
                <Star className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-4">Journey in Progress</h3>
              <p className="text-secondary max-w-lg mx-auto leading-relaxed">
                As a dynamic club, we are constantly working on new initiatives and projects. Check back soon as we document our latest achievements and impacts.
              </p>
            </div>
          )}
        </div>

        {/* Future Motto removed */}

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
