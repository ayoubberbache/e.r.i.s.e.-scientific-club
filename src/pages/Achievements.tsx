import React, { useState, useEffect } from 'react';
import { Trophy, Award, Star, Zap, Users, Target, X, Calendar } from 'lucide-react';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { ModelViewer } from '../components/ModelViewer';
import { useLanguage } from '../contexts/LanguageContext';

export function Achievements() {
  const { language, t, getLocalized } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [dbAchievements, setDbAchievements] = useState<any[]>([]);
  
  useEffect(() => {
    async function fetchAchievements() {
      try {
        const { data, error } = await supabase.from('achievements').select('*');
        if (error || !data || data.length === 0) {
          setDbAchievements([]);
        } else {
          setDbAchievements(data);
        }
      } catch (err) {
        setDbAchievements([]);
      }
    }
    fetchAchievements();
  }, []);

  const formatImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return supabase.storage.from('public_images').getPublicUrl(cleanPath).data.publicUrl;
  };

  return (
    <div className="min-h-screen bg-dominant py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-tint text-accent text-sm font-bold mb-6">
            <Trophy className="w-4 h-4" /> {t.achievementsPage.heroBadge}
          </div>
          <h1 className="text-4xl font-extrabold text-primary tracking-tight sm:text-5xl lg:text-6xl mb-6">
            {t.achievementsPage.heroTitle}
          </h1>
          <p className="text-xl text-secondary max-w-3xl mx-auto leading-relaxed">
            {t.achievementsPage.heroSubtitle}
          </p>
        </div>

        {/* 2-Column Split: Sticky Left 3D Model (~40%) & Scrollable Achievements Feed (~60%) */}
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          
          {/* Left Column: Non-scrollable / Sticky 3D Certificate Model (~40% horizontal width) */}
          <div className="w-full lg:w-[40%] lg:sticky lg:top-28 shrink-0">
            <div className="bg-surface rounded-3xl p-6 border border-subtle shadow-xl relative overflow-hidden flex flex-col items-center">
              <div className="absolute top-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none" />
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider mb-4 border border-accent/20">
                <Award className="w-4 h-4" /> {t.achievementsPage.certificateBadge}
              </div>
              <p className="text-sm font-medium text-secondary text-center mb-4">
                {t.achievementsPage.certificateDesc}
              </p>
              <div className="w-full h-[380px] sm:h-[460px] relative rounded-2xl overflow-hidden bg-dominant/40 border border-subtle shadow-inner">
                <ModelViewer
                  src="/Certificate Pose.glb"
                  alt="Certificate Pose 3D Model"
                  cameraOrbit="180deg 75deg 105%"
                  shadowIntensity="1"
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Achievements Feed (~60% horizontal width, scrolls normally) */}
          <div className="w-full lg:w-[60%] flex-1 space-y-12 text-left rtl:text-right">
            {dbAchievements.length > 0 ? (
              dbAchievements.map((achievement) => {
                const achTitle = getLocalized(achievement, 'title') || achievement.title;
                const achDesc = getLocalized(achievement, 'description') || achievement.description;
                const achCat = getLocalized(achievement, 'category') || achievement.category;

                return (
                  <div key={achievement.id} className="bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                    
                    {/* Post Header */}
                    <div className="p-4 flex items-center gap-3 border-b border-subtle">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-subtle shrink-0">
                        <Logo variant="icon" className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-primary leading-tight">{t.clubShortName}</h3>
                        <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-wider">
                          <span>{achievement.year || achievement.date}</span>
                          <span>•</span>
                          <span className="text-accent font-bold">{achCat}</span>
                        </div>
                      </div>
                    </div>

                    {/* Post Media */}
                    <div className="relative aspect-video bg-secondary/30 border-b border-subtle overflow-hidden">
                      {achievement.images && achievement.images.length > 1 ? (
                        <div 
                          className={`grid h-full gap-1 cursor-pointer ${
                            achievement.images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'
                          }`} 
                          onClick={() => setSelectedImage(achievement.images![0])}
                        >
                          {achievement.images.slice(0, 4).map((img: string, i: number) => (
                            <div 
                              key={i} 
                              className={`relative group overflow-hidden ${
                                achievement.images!.length === 3 && i === 0 ? 'row-span-2' : ''
                              }`}
                            >
                              <img 
                                src={formatImageUrl(img)} 
                                alt={`${achTitle} ${i + 1}`} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onClick={(e) => { e.stopPropagation(); setSelectedImage(img); }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <img 
                          src={formatImageUrl((achievement.images && achievement.images[0]) || achievement.image)} 
                          alt={achTitle} 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                          onClick={() => setSelectedImage((achievement.images && achievement.images[0]) || achievement.image)}
                        />
                      )}
                    </div>

                    {/* Post Content */}
                    <div className="p-6">
                      <h3 className="text-2xl font-bold text-primary mb-4 group-hover:text-accent transition-colors">
                        {achTitle}
                      </h3>
                      <p className="text-secondary leading-relaxed mb-6">
                        {achDesc}
                      </p>
                      <div className="flex items-center gap-2 text-sm font-bold text-accent">
                        <Award className="w-5 h-5" /> {t.achievementsPage.excellenceBadge}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-surface rounded-3xl p-16 text-center border-2 border-subtle border-dashed">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary text-accent mb-6">
                  <Star className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-primary mb-4">{t.achievementsPage.journeyTitle}</h3>
                <p className="text-secondary max-w-lg mx-auto leading-relaxed">
                  {t.achievementsPage.journeyDesc}
                </p>
              </div>
            )}
          </div>
        </div>

       </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer"
            onClick={() => setSelectedImage(null)}
            title={t.common.close}
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
