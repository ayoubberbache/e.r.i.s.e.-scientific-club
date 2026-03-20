import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { LATEST_EVENTS, ACHIEVEMENTS } from '../data/content';
import type { Event, Achievement } from '../data/content';
import { IS_REGISTRATION_OPEN as DEFAULT_IS_REGISTRATION_OPEN, REGISTRATION_LINK as DEFAULT_REGISTRATION_LINK } from '../config/registration';

// ── Types ──────────────────────────────────────────────────────────

export interface Leader {
  name: string;
  role: string;
  image: string;
  bio: string;
  socials: { linkedin?: string; mail?: string; github?: string };
}

export interface RegistrationConfig {
  isOpen: boolean;
  link: string;
}

export interface FooterConfig {
  email: string;
  address: string;
}

interface SiteData {
  user: User | null | undefined; // undefined means loading
  leaders: Leader[];
  events: Event[];
  achievements: Achievement[];
  starMembers: Leader[];
  registration: RegistrationConfig;
  footer: FooterConfig;
  updateLeaders: (leaders: Leader[]) => Promise<void>;
  updateEvents: (events: Event[]) => Promise<void>;
  updateAchievements: (achievements: Achievement[]) => Promise<void>;
  updateStarMembers: (stars: Leader[]) => Promise<void>;
  updateRegistration: (config: RegistrationConfig) => Promise<void>;
  updateFooter: (config: FooterConfig) => Promise<void>;
  resetSection: (section: 'leaders' | 'events' | 'achievements' | 'starMembers' | 'registration' | 'footer') => Promise<void>;
}

// ── Default Data ───────────────────────────────────────────────────

export const DEFAULT_LEADERS: Leader[] = [
  {
    name: 'Mohammed Harkati',
    role: 'President',
    image: '/Team/Mohamed.JPG',
    bio: 'Strategically leading E.R.I.S.E. towards innovative energy solutions and fostering a culture of excellence within the club.',
    socials: { linkedin: '#', mail: 'mailto:#' }
  },
  {
    name: 'Maria Aridje Ben-Issa',
    role: 'Vice President',
    image: '/Team/Maria.JPG',
    bio: 'Passionate environmentalist dedicated to promoting circular economy principles and sustainable engineering practices.',
    socials: { linkedin: '#', mail: 'mailto:#' }
  },
  {
    name: 'Chahed Wissal Ben-Mechri',
    role: 'General Secretary',
    image: '/Team/Chahed.JPG',
    bio: 'Ensuring organizational excellence and streamlining communication to drive the club\'s administrative mission forward.',
    socials: { linkedin: '#', github: '#' }
  },
  {
    name: 'Ayoub Berbache',
    role: 'Head of Media',
    image: '/Team/Ayoub.JPG',
    bio: 'Leading E.R.I.S.E.\'s creative direction and media presence, ensuring our environmental mission is communicated effectively through impactful visuals and digital storytelling.',
    socials: { linkedin: '#', github: '#' }
  },
  {
    name: 'Mohammed Adel Batira',
    role: 'Head of Projects',
    image: '/Team/Adel.jpg',
    bio: 'Overseeing technical initiatives and project execution with a focus on cutting-edge renewable energy technologies.',
    socials: { linkedin: '#', github: '#' }
  },
  {
    name: 'Nourhan Hamani',
    role: 'Head of Organization',
    image: '/Team/Nourhan.JPG',
    bio: 'Expertly coordinating club events and logistics to ensure impactful outreach and organized community engagement.',
    socials: { linkedin: '#', mail: 'mailto:#' }
  },
  {
    name: 'Ahmed Ilyes Lakhdar',
    role: 'Head of Sports and Activities',
    image: '/Team/Ilyes.JPG',
    bio: 'Promoting student well-being and team spirit through engaging sports initiatives and club-wide activities.',
    socials: { linkedin: '#', github: '#' }
  },
  {
    name: 'Zakaria Takhnouni',
    role: 'Head of Internal Relationships',
    image: '/Team/Zakaria.JPG',
    bio: 'Fostering collaboration and maintaining strong communication within the club to ensure a cohesive and motivated team environment.',
    socials: { linkedin: '#', github: '#' }
  },
];

export const DEFAULT_FOOTER: FooterConfig = {
  email: 'erise.club@gmail.com',
  address: 'Higher National School of Renewable Energies, Environment and Sustainable Development, Batna, Algeria',
};

// ── Context ────────────────────────────────────────────────────────

const SiteDataContext = createContext<SiteData | null>(null);

export function SiteDataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  
  const [leaders, setLeaders] = useState<Leader[]>(DEFAULT_LEADERS);
  const [events, setEvents] = useState<Event[]>(LATEST_EVENTS);
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [starMembers, setStarMembers] = useState<Leader[]>([]);
  const [registration, setRegistration] = useState<RegistrationConfig>({
    isOpen: DEFAULT_IS_REGISTRATION_OPEN,
    link: DEFAULT_REGISTRATION_LINK,
  });
  const [footer, setFooter] = useState<FooterConfig>(DEFAULT_FOOTER);

  // Authentication Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listeners
  useEffect(() => {
    // We store arrays in single documents inside a 'site_data' collection
    const unsubs: (() => void)[] = [];

    const listenToDoc = (docId: string, setter: any, fallback: any) => {
      const docRef = doc(db, 'site_data', docId);
      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          setter(snap.data().data || fallback);
        } else {
          // If document doesn't exist yet, we write the default to it
          setDoc(docRef, { data: fallback })
            .catch(err => console.error(`Error initializing ${docId}:`, err));
            // The snapshot listener will trigger again once written
        }
      }, (error) => {
        console.error(`Error listening to ${docId}:`, error);
      });
      unsubs.push(unsub);
    };

    // Firebase requires config keys. If they are missing (.env not populated), these listeners will fail.
    // We wrap in a simple check so the site doesn't crash if Firebase isn't set up yet.
    if (import.meta.env.VITE_FIREBASE_API_KEY) {
      listenToDoc('leaders', setLeaders, DEFAULT_LEADERS);
      listenToDoc('events', setEvents, LATEST_EVENTS);
      listenToDoc('achievements', setAchievements, ACHIEVEMENTS);
      listenToDoc('starMembers', setStarMembers, []);
      listenToDoc('registration', setRegistration, { isOpen: DEFAULT_IS_REGISTRATION_OPEN, link: DEFAULT_REGISTRATION_LINK });
      listenToDoc('footer', setFooter, DEFAULT_FOOTER);
    } else {
      console.warn("Firebase not configured. Using local default data only.");
      setUser(null); // Mark loading complete
    }

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  // Update helpers
  const updateFirebaseDoc = async (docId: string, data: any) => {
    if (!import.meta.env.VITE_FIREBASE_API_KEY) {
      alert("Firebase is not configured. Edit .env to add your keys.");
      return;
    }
    const docRef = doc(db, 'site_data', docId);
    await setDoc(docRef, { data });
  };

  const updateLeaders = async (data: Leader[]) => await updateFirebaseDoc('leaders', data);
  const updateEvents = async (data: Event[]) => await updateFirebaseDoc('events', data);
  const updateAchievements = async (data: Achievement[]) => await updateFirebaseDoc('achievements', data);
  const updateStarMembers = async (data: Leader[]) => await updateFirebaseDoc('starMembers', data);
  const updateRegistration = async (data: RegistrationConfig) => await updateFirebaseDoc('registration', data);
  const updateFooter = async (data: FooterConfig) => await updateFirebaseDoc('footer', data);

  const resetSection = async (section: 'leaders' | 'events' | 'achievements' | 'starMembers' | 'registration' | 'footer') => {
    switch (section) {
      case 'leaders': await updateLeaders(DEFAULT_LEADERS); break;
      case 'events': await updateEvents(LATEST_EVENTS); break;
      case 'achievements': await updateAchievements(ACHIEVEMENTS); break;
      case 'starMembers': await updateStarMembers([]); break;
      case 'registration': await updateRegistration({ isOpen: DEFAULT_IS_REGISTRATION_OPEN, link: DEFAULT_REGISTRATION_LINK }); break;
      case 'footer': await updateFooter(DEFAULT_FOOTER); break;
    }
  };

  return (
    <SiteDataContext.Provider value={{
      user, leaders, events, achievements, starMembers, registration, footer,
      updateLeaders, updateEvents, updateAchievements, updateStarMembers, updateRegistration, updateFooter, resetSection,
    }}>
      {children}
    </SiteDataContext.Provider>
  );
}

export function useSiteData() {
  const ctx = useContext(SiteDataContext);
  if (!ctx) throw new Error('useSiteData must be used within SiteDataProvider');
  return ctx;
}
