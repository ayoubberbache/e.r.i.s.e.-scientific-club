import React, { useMemo, useState, useEffect } from 'react';
import { Mail, Linkedin, Github, Users, Star, Trophy } from 'lucide-react';
import { RegistrationButton } from '../components/RegistrationButton';
import ProfileCard from '../components/ProfileCard';
import { supabase } from '../lib/supabase';
import { ModelViewer } from '../components/ModelViewer';
import TiltedCard from '../components/TiltedCard';
import { useLanguage } from '../contexts/LanguageContext';

export function Team() {
  const { language, t, getLocalized } = useLanguage();
  const [dbLeaders, setDbLeaders] = useState<any[]>([]);
  const [dbStarMembers, setDbStarMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaders() {
      try {
        const { data, error } = await supabase.from('leaders').select('*');
        if (error || !data || data.length === 0) {
          setDbLeaders([]);
        } else {
          const formatted = data.map(d => {
            const soc = d.socials || {};
            return {
              ...d,
              socials: {
                linkedin: soc.linkedin || d.linkedin,
                mail: soc.mail || d.mail,
                github: soc.github || d.github,
              }
            };
          });
          setDbLeaders(formatted);
        }

        // Fetch Star Members
        const { data: starData } = await supabase.from('star_members').select('*');
        if (starData) {
          setDbStarMembers(starData);
        }
      } catch (err) {
        setDbLeaders([]);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaders();
  }, []);

  const formatImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return supabase.storage.from('public_images').getPublicUrl(cleanPath).data.publicUrl;
  };

  // Shuffle leaders on mount
  const shuffledLeaders = useMemo(() => {
    return [...dbLeaders].sort(() => Math.random() - 0.5);
  }, [dbLeaders]);

  return (
    <div className="min-h-screen bg-dominant">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden border-b border-subtle text-center">
        <div className="absolute inset-0 bg-accent-tint/5 z-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-tint text-accent text-sm font-bold mb-6">
            <Users className="w-4 h-4" /> {t.teamPage.heroBadge}
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-primary tracking-tight mb-6">
            {t.teamPage.heroTitle}
          </h1>
          <p className="text-xl text-secondary max-w-2xl mx-auto leading-relaxed">
            {t.teamPage.heroSubtitle}
          </p>
        </div>
      </section>

      {/* Club Leaders */}
      <section className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left rtl:text-right">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20 shrink-0">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-primary">{t.teamPage.leadersTitle}</h2>
              <p className="text-secondary">{t.teamPage.leadersSubtitle}</p>
            </div>
            <div className="h-px bg-subtle flex-1 ml-4 rtl:ml-0 rtl:mr-4 hidden md:block" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {shuffledLeaders.map((leader, idx) => {
              const leaderName = getLocalized(leader, 'name') || leader.name;
              const leaderRole = getLocalized(leader, 'role') || leader.role;
              const leaderSpec = getLocalized(leader, 'specialty') || leader.specialty || (language === 'ar' ? 'عضو قيادي' : 'Active');

              return (
                <div key={idx} className="flex flex-col items-center h-full gap-5">
                  <div className="text-center min-h-[40px] flex flex-col justify-end pb-2">
                    <h3 className="text-xl font-bold text-primary leading-tight">{leaderName}</h3>
                  </div>
                  <ProfileCard
                    name={leaderName}
                    title={leaderRole}
                    handle={leader.socials.linkedin ? "linkedin" : "member"}
                    status={leaderSpec}
                    contactText={t.teamPage.connect}
                    avatarUrl={formatImageUrl(leader.image)}
                    miniAvatarUrl={formatImageUrl(leader.image)}
                    showUserInfo={true}
                    enableTilt={true}
                    enableMobileTilt={true}
                    socials={leader.socials}
                    onContactClick={() => {
                      if (leader.socials.linkedin) window.open(leader.socials.linkedin, '_blank');
                      else if (leader.socials.mail) window.location.href = leader.socials.mail;
                    }}
                    behindGlowEnabled={true}
                    innerGradient="linear-gradient(145deg,#1F29378c 0%,#3B82F644 100%)"
                    className="w-full"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Star Members */}
      {dbStarMembers.length > 0 && (
        <section className="py-24 bg-dominant border-t border-subtle">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left rtl:text-right">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500 flex items-center justify-center text-white shadow-lg shadow-yellow-500/20 shrink-0">
                <Star className="w-6 h-6 fill-current" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-primary">{t.teamPage.starMembersTitle}</h2>
                <p className="text-secondary">{t.teamPage.starMembersSubtitle}</p>
              </div>
              <div className="h-px bg-subtle flex-1 ml-4 rtl:ml-0 rtl:mr-4 hidden md:block" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Half: Star Members Cards using TiltedCard */}
              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {dbStarMembers.map((member, idx) => {
                  const memberName = getLocalized(member, 'name') || member.name;
                  const memberOrg = getLocalized(member, 'organization') || member.organization;
                  const depts = Array.from(
                    new Set((memberOrg || '').split(',').map((s: string) => s.trim()).filter(Boolean))
                  ).join(', ');

                  return (
                    <TiltedCard
                      key={idx}
                      imageSrc={formatImageUrl(member.image)}
                      altText={memberName}
                      captionText={memberName}
                      containerHeight="340px"
                      containerWidth="100%"
                      rotateAmplitude={12}
                      scaleOnHover={1.05}
                      showMobileWarning={false}
                      showTooltip={false}
                      displayOverlayContent={true}
                      overlayContent={
                        <div className="w-full h-full p-4 flex flex-col justify-between items-center text-center pointer-events-none bg-surface rounded-3xl border border-subtle shadow-md">
                          {/* Photo Container */}
                          <div className="w-full h-52 sm:h-56 rounded-2xl overflow-hidden bg-dominant/30 flex items-center justify-center p-2 relative">
                            <img 
                              src={formatImageUrl(member.image)} 
                              alt={memberName} 
                              className="w-full h-full object-contain drop-shadow-md" 
                              onError={(e) => { 
                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(memberName)}&backgroundColor=121420&textColor=4ce0b3` 
                              }} 
                            />
                          </div>

                          {/* Text Container */}
                          <div className="w-full flex flex-col items-center justify-center pt-2">
                            <h3 className="text-lg font-extrabold text-primary leading-tight mb-1">
                              {memberName}
                            </h3>
                            <div className="px-3 py-0.5 rounded-full bg-accent/15 text-accent font-semibold text-xs capitalize">
                              {depts || (language === 'ar' ? 'عضو النادي' : 'Member')}
                            </div>
                          </div>
                        </div>
                      }
                    />
                  );
                })}
              </div>

              {/* Right Half: Medal Pose 3D Model */}
              <div className="lg:col-span-6 h-[380px] sm:h-[450px] bg-surface/50 rounded-3xl border border-subtle p-6 relative overflow-hidden shadow-xl flex flex-col items-center justify-center text-center">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-bold mb-2 border border-yellow-500/20 z-10">
                  <Trophy className="w-3.5 h-3.5" /> {t.teamPage.starMedalBadge}
                </div>
                <p className="text-sm font-medium text-secondary text-center mb-2 z-10">
                  {t.teamPage.starMedalDesc}
                </p>
                <ModelViewer
                  src="/Medal Pose.glb"
                  alt="Star Member Medal 3D Model"
                  cameraOrbit="180deg 75deg 105%"
                  shadowIntensity="1"
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Impact Section */}
      <section className="py-24 bg-dominant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-surface rounded-3xl p-12 relative overflow-hidden border border-subtle shadow-xl text-left rtl:text-right">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full -ml-32 -mb-32 blur-3xl" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">{t.teamPage.joinMissionTitle}</h2>
                <p className="text-lg text-secondary leading-relaxed mb-8">
                  {t.teamPage.joinMissionDesc}
                </p>
                <RegistrationButton />
              </div>
              
              <div className="hidden lg:block h-64 overflow-hidden rounded-3xl border border-subtle">
                <img src="/team-assets/our team.jpg" alt="Team" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
