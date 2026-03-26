import React, { useMemo } from 'react';
import { Mail, Linkedin, Github, Users, Star, Trophy } from 'lucide-react';
import { LEADERS, REGISTRATION } from '../data/siteData';

export function Team() {
  const formatImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const baseUrl = import.meta.env.BASE_URL || '/';
    return `${baseUrl}${cleanPath}`;
  };

  // Shuffle leaders on mount
  const shuffledLeaders = useMemo(() => {
    return [...LEADERS].sort(() => Math.random() - 0.5);
  }, []);

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
              <div key={idx} className="group bg-secondary rounded-2xl p-4 text-center hover:bg-accent-tint transition-all shadow-md border border-subtle hover:border-accent">
                <div className="relative aspect-3/4 w-full mx-auto mb-6 overflow-hidden rounded-xl border-2 border-surface shadow-md group-hover:border-accent transition-colors bg-dominant">
                  <img 
                    src={formatImageUrl(leader.image)} 
                    alt={leader.name} 
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 will-change-transform"
                    fetchPriority="high"
                    decoding="sync"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-6">
                    <div className="flex gap-4">
                      {leader.socials.linkedin && (
                        <a href={leader.socials.linkedin.startsWith('http') ? leader.socials.linkedin : '#'} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors">
                          <Linkedin className="w-5 h-5" />
                        </a>
                      )}
                      {leader.socials.mail && (
                        <a href={leader.socials.mail} className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors">
                          <Mail className="w-5 h-5" />
                        </a>
                      )}
                      {leader.socials.github && (
                        <a href={leader.socials.github.startsWith('http') ? leader.socials.github : '#'} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors">
                          <Github className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-primary mb-1">{leader.name}</h3>
                <p className="text-accent font-semibold text-xs uppercase tracking-wider mb-2">{leader.role}</p>
                
                {leader.specialty && (
                  <div className="mb-4 px-3 py-1 bg-accent-tint/30 rounded-lg inline-block">
                    <p className="text-accent text-[10px] font-bold leading-tight uppercase tracking-widest">{leader.specialty}</p>
                  </div>
                )}

                {leader.skills && leader.skills.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                    {leader.skills.map((skill, sIdx) => (
                      <span key={sIdx} className="px-2 py-0.5 bg-dominant text-secondary text-[10px] rounded-md border border-subtle">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

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
                  {REGISTRATION.isOpen 
                    ? "We are always looking for passionate students to join E.R.I.S.E. whether you're interested in technical projects, media, or event organization, there's a place for you here."
                    : "Registrations are currently closed. Follow us on social media to stay updated on our next recruitment cycle!"}
                </p>
                {REGISTRATION.isOpen && (
                  <button className="px-8 py-4 bg-accent text-white rounded-xl font-bold hover:bg-accent-muted transition-all active:scale-95 shadow-lg shadow-accent/20">
                    Apply to Join
                  </button>
                )}
              </div>
              
              <div className="hidden lg:block h-64 overflow-hidden rounded-3xl border border-subtle">
                <img src="/team-assets/our team.JPG" alt="Team" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
