import { useMemo } from 'react';
import { Linkedin, Mail, Github, Users, Star } from 'lucide-react';
import { useSiteData } from '../contexts/SiteDataContext';

// Fisher-Yates shuffle — unbiased randomization
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function Team() {
  const { leaders, starMembers } = useSiteData();

  // Shuffle leaders on every mount (page load / refresh)
  const shuffledLeaders = useMemo(() => shuffle(leaders), [leaders]);
  const shuffledStars = useMemo(() => shuffle(starMembers), [starMembers]);

  return (
    <div className="min-h-screen bg-surface py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-4xl font-extrabold text-primary tracking-tight sm:text-5xl mb-4">
            Meet the <span className="text-accent">E.R.I.S.E. Team</span>
          </h1>
          <p className="text-xl text-muted max-w-2xl mx-auto">
            The dedicated students behind our initiatives, working together to promote renewable energy and environmental sustainability.
          </p>
        </div>

        {/* Star Members Section (Only visible if there are star members) */}
        {shuffledStars.length > 0 && (
          <div className="mb-24">
            <h2 className="text-3xl font-bold text-primary mb-12 text-center flex items-center justify-center gap-3">
              <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" /> Star Members
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {shuffledStars.map((leader, idx) => (
                <div key={idx} className="group bg-secondary rounded-2xl p-4 text-center hover:bg-accent-tint transition-all shadow-md border border-yellow-500/30 hover:border-yellow-500 hover:shadow-yellow-500/20">
                  <div className="relative aspect-3/4 w-full mx-auto mb-6 overflow-hidden rounded-xl border-2 border-surface shadow-md group-hover:border-yellow-500 transition-colors bg-dominant">
                    <img 
                      src={`${import.meta.env.BASE_URL}${leader.image.startsWith('/') ? leader.image.slice(1) : leader.image}`} 
                      alt={leader.name} 
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 will-change-transform"
                      fetchPriority="high"
                      decoding="sync"
                    />
                    <div className="absolute inset-0 ring-1 ring-black/5 rounded-xl"></div>
                    <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform">
                      <Star className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-1">{leader.name}</h3>
                  <p className="text-yellow-600 dark:text-yellow-500 font-semibold text-xs mb-4 uppercase tracking-wider">{leader.role}</p>
                  <p className="text-muted text-sm mb-6 line-clamp-4 px-2">{leader.bio}</p>
                  
                  <div className="flex justify-center gap-4 mt-auto">
                    {leader.socials.linkedin && (
                      <a href={leader.socials.linkedin} aria-label={`${leader.name}'s LinkedIn profile`} className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-muted hover:text-yellow-500 hover:shadow-md transition-all border border-default">
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    {leader.socials.mail && (
                      <a href={leader.socials.mail} aria-label={`Email ${leader.name}`} className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-muted hover:text-yellow-500 hover:shadow-md transition-all border border-default">
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                    {leader.socials.github && (
                      <a href={leader.socials.github} aria-label={`${leader.name}'s GitHub profile`} className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-muted hover:text-yellow-500 hover:shadow-md transition-all border border-default">
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaders Section */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-primary mb-12 text-center flex items-center justify-center gap-3">
            <Users className="w-8 h-8 text-accent" /> Club Leaders
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {shuffledLeaders.map((leader, idx) => (
              <div key={idx} className="group bg-secondary rounded-2xl p-4 text-center hover:bg-accent-tint transition-all border border-subtle hover:border-accent hover:shadow-lg">
                <div className="relative aspect-3/4 w-full mx-auto mb-6 overflow-hidden rounded-xl border-2 border-surface shadow-md group-hover:border-accent transition-colors bg-dominant">
                  <img 
                    src={`${import.meta.env.BASE_URL}${leader.image.startsWith('/') ? leader.image.slice(1) : leader.image}`} 
                    alt={leader.name} 
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 will-change-transform"
                    fetchPriority="high"
                    decoding="sync"
                  />
                  <div className="absolute inset-0 ring-1 ring-black/5 rounded-xl"></div>
                </div>
                <h3 className="text-xl font-bold text-primary mb-1">{leader.name}</h3>
                <p className="text-accent font-semibold text-xs mb-4 uppercase tracking-wider">{leader.role}</p>
                <p className="text-muted text-sm mb-6 line-clamp-4 px-2">{leader.bio}</p>
                
                <div className="flex justify-center gap-4 mt-auto">
                  {leader.socials.linkedin && (
                    <a href={leader.socials.linkedin} aria-label={`${leader.name}'s LinkedIn profile`} className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-muted hover:text-accent hover:shadow-md transition-all border border-default">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {leader.socials.mail && (
                    <a href={leader.socials.mail} aria-label={`Email ${leader.name}`} className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-muted hover:text-accent hover:shadow-md transition-all border border-default">
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  {leader.socials.github && (
                    <a href={leader.socials.github} aria-label={`${leader.name}'s GitHub profile`} className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-muted hover:text-accent hover:shadow-md transition-all border border-default">
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
