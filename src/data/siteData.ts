
export interface Leader {
  name: string;
  role: string;
  image: string;
  bio?: string;
  skills?: string[];
  specialty?: string;
  socials: { linkedin?: string; mail?: string; github?: string };
}

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image: string;
  images?: string[];
  status: string;
  noRegistration?: boolean;
}

export interface Achievement {
  id: number;
  title: string;
  description: string;
  date?: string;
  year?: string;
  image: string;
  images?: string[];
  category: string;
}

// ── Leaders ──────────────────────────────────────────────────────────────────

// Data is now fetched securely and dynamically from Supabase!

// ── Contact ──────────────────────────────────────────────────────────────────

export const CONTACT = {
  email: 'erise.club@gmail.com',
  address: 'Higher National School of Renewable Energies, Environment and Sustainable Development, Batna, Algeria',
};

// ── Registration ─────────────────────────────────────────────────────────────

export const REGISTRATION = {
  isOpen: false,
  link: '#',
};

// ── Home Content ─────────────────────────────────────────────────────────────

export const HOME = {
  hero: {
    title: "Engineers For Renewable Energy Innovation & Environmental Sustainability",
    subtitle: "Welcome to E.R.I.S.E. Scientific Club. We are a community of passionate students at the Higher National School of Renewable Energies, Environment, and Sustainable Development in Batna, Algeria.",
  },
  about: {
    title: "Our Mission & Vision",
    description: "E.R.I.S.E. is dedicated to fostering innovation, promoting environmental sustainability, and preparing the next generation of engineers to tackle global energy challenges.",
  },
  impact: {
    sustainability: "Promoting eco-friendly practices and raising awareness about environmental conservation within our community and beyond.",
    renewable: "Exploring and developing innovative solutions in solar, wind, and other renewable energy sources to power a sustainable future.",
    global: "Connecting with international organizations and participating in global initiatives to contribute to worldwide sustainability goals.",
  },
  teamPreviewImage: '/team-assets/our team.jpg',
};
