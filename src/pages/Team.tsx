import React, { useMemo, useState, useEffect } from 'react';
import { Mail, Linkedin, Github, Users, Star, Trophy } from 'lucide-react';
import { RegistrationButton } from '../components/RegistrationButton';
import ProfileCard from '../components/ProfileCard';
import { supabase } from '../lib/supabase';

export function Team() {
  const [dbLeaders, setDbLeaders] = useState<any[]>([]);
  const [dbStarMembers, setDbStarMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaders() {
      try {
        const { data, error } = await supabase.from('leaders').select('*');
        if (error || !data || data.length === 0) {
          // Fallback to static data
          setDbLeaders([]);
        } else {
          // Ensure socials object is constructed properly from JSON column or fallback columns
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
      <section className="relative py-24 overflow-hidden border-b border-subtle">
        <div className="absolute inset-0 bg-accent-tint/5 z-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-tint text-accent text-sm font-bold mb-6">
            <Users className="w-4 h-4" /> Our Community
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-primary tracking-tight mb-6">
            The Minds Behind <span className="text-accent">E.R.I.S.E.</span>
          </h1>
          <p className="text-xl text-secondary max-w-2xl mx-auto leading-relaxed">
            Meet the passionate engineers, innovators, and leaders dedicated to building a sustainable future.
          </p>
        </div>
      </section>

      {/* Club Leaders */}
      <section className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-primary">Club Leaders</h2>
              <p className="text-secondary">Executive board leading our mission</p>
            </div>
            <div className="h-px bg-subtle flex-1 ml-4 hidden md:block" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {shuffledLeaders.map((leader, idx) => (
              <div key={idx} className="flex flex-col items-center h-full gap-5">
                <div className="text-center min-h-[40px] flex flex-col justify-end pb-2">
                  <h3 className="text-xl font-bold text-primary leading-tight">{leader.name}</h3>
                </div>
                <ProfileCard
                  name={leader.name}
                  title={leader.role}
                  handle={leader.socials.linkedin ? "linkedin" : "member"}
                  status={leader.specialty || "Active"}
                  contactText="Connect"
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
                  innerGradient="linear-gradient(145deg,#1F29378c 0%,#3B82F644 100%)" // matches dark theme better
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Star Members */}
      {dbStarMembers.length > 0 && (
        <section className="py-24 bg-dominant border-t border-subtle">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500 flex items-center justify-center text-white shadow-lg shadow-yellow-500/20">
                <Star className="w-6 h-6 fill-current" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-primary">Star Members</h2>
                <p className="text-secondary">Outstanding contributions and achievements</p>
              </div>
              <div className="h-px bg-subtle flex-1 ml-4 hidden md:block" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {dbStarMembers.map((member, idx) => (
                <div key={idx} className="bg-surface rounded-2xl border border-subtle p-6 flex flex-col items-center text-center shadow-lg hover:shadow-xl hover:border-accent/30 transition-all group">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-dominant shadow-inner mb-6 relative group-hover:scale-105 transition-transform duration-300">
                    <img 
                      src={formatImageUrl(member.image)} 
                      alt={member.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => { 
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}&backgroundColor=121420&textColor=4ce0b3` 
                      }} 
                    />
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-2">{member.name}</h3>
                  <div className="px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold">
                    {member.organization}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Impact Section */}
      <section className="py-24 bg-dominant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-surface rounded-3xl p-12 relative overflow-hidden border border-subtle shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full -ml-32 -mb-32 blur-3xl" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">Join Our Mission</h2>
                <p className="text-lg text-secondary leading-relaxed mb-8">
                  We are always looking for passionate students to join E.R.I.S.E. — whether you're interested in technical projects, media, or event organization, there's a place for you here.
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
