import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
const envPath = join(__dirname, '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const firebaseConfig = {
  apiKey: envConfig.VITE_FIREBASE_API_KEY,
  authDomain: envConfig.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envConfig.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envConfig.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envConfig.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envConfig.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEFAULT_LEADERS = [
  {
    name: 'Mohammed Harkati',
    role: 'President',
    image: '/team-assets/Mohamed.JPG',
    bio: 'Strategically leading E.R.I.S.E. towards innovative energy solutions and fostering a culture of excellence within the club.',
    socials: { linkedin: '#', mail: 'mailto:#' }
  },
  {
    name: 'Maria Aridje Ben-Issa',
    role: 'Vice President',
    image: '/team-assets/Maria.JPG',
    bio: 'Passionate environmentalist dedicated to promoting circular economy principles and sustainable engineering practices.',
    socials: { linkedin: '#', mail: 'mailto:#' }
  },
  {
    name: 'Chahed Wissal Ben-Mechri',
    role: 'General Secretary',
    image: '/team-assets/Chahed.JPG',
    bio: 'Ensuring organizational excellence and streamlining communication to drive the club\'s administrative mission forward.',
    socials: { linkedin: '#', github: '#' }
  },
  {
    name: 'Ayoub Berbache',
    role: 'Head of Media',
    image: '/team-assets/Ayoub.JPG',
    bio: 'Leading E.R.I.S.E.\'s creative direction and media presence, ensuring our environmental mission is communicated effectively through impactful visuals and digital storytelling.',
    socials: { linkedin: '#', github: '#' }
  },
  {
    name: 'Mohammed Adel Batira',
    role: 'Head of Projects',
    image: '/team-assets/Adel.jpg',
    bio: 'Overseeing technical initiatives and project execution with a focus on cutting-edge renewable energy technologies.',
    socials: { linkedin: '#', github: '#' }
  },
  {
    name: 'Nourhan Hamani',
    role: 'Head of Organization',
    image: '/team-assets/Nourhan.JPG',
    bio: 'Expertly coordinating club events and logistics to ensure impactful outreach and organized community engagement.',
    socials: { linkedin: '#', mail: 'mailto:#' }
  },
  {
    name: 'Ahmed Ilyes Lakhdar',
    role: 'Head of Sports and Activities',
    image: '/team-assets/Ilyes.JPG',
    bio: 'Promoting student well-being and team spirit through engaging sports initiatives and club-wide activities.',
    socials: { linkedin: '#', github: '#' }
  },
  {
    name: 'Zakaria Takhnouni',
    role: 'Head of Internal Relationships',
    image: '/team-assets/Zakaria.JPG',
    bio: 'Fostering collaboration and maintaining strong communication within the club to ensure a cohesive and motivated team environment.',
    socials: { linkedin: '#', github: '#' }
  },
];

const DEFAULT_EVENTS = [
  {
    id: 1,
    title: "English Talk with Lore Academy",
    description: "Lore Academy is a leading language school and training center specializing in comprehensive foreign language education and official exam preparation. Join us for an interactive session to improve your English proficiency and confidence in real-world communication.",
    date: "2026-03-12",
    time: "2:00 PM - 4:00 PM",
    location: "Lore Academy",
    image: "/events-assets/english_corner.jpg",
    status: "Past",
    noRegistration: true
  }
];

const DEFAULT_HOME = {
  hero: { 
    title: "Engineers For Renewable Energy Innovation & Environmental Sustainability",
    subtitle: "Welcome to E.R.I.S.E. Scientific Club. We are a community of passionate students at the Higher National School of Renewable Energies, Environment, and Sustainable Development in Batna, Algeria.",
    logoVariant: "full"
  },
  about: {
    title: "Our Mission & Vision",
    description: "E.R.I.S.E. is dedicated to fostering innovation, promoting environmental sustainability, and preparing the next generation of engineers to tackle global energy challenges."
  },
  impact: {
    sustainability: "Promoting eco-friendly practices and raising awareness about environmental conservation within our community and beyond.",
    renewable: "Exploring and developing innovative solutions in solar, wind, and other renewable energy sources to power a sustainable future.",
    global: "Connecting with international organizations and participating in global initiatives to contribute to worldwide sustainability goals."
  }
};

async function seed() {
  console.log('🚀 Starting migration to new asset paths and dynamic home content...');
  
  const docs = {
    'leaders': DEFAULT_LEADERS,
    'events': DEFAULT_EVENTS,
    'achievements': [],
    'starMembers': [],
    'registration': { isOpen: true, link: "https://docs.google.com/forms/d/e/1FAIpQLScy2V1BIs-2nZas99i6U5E99lS9XmO-8xP-1sZ0V0V0V0V0V0/viewform" },
    'footer': {
      email: 'erise.club@gmail.com',
      address: 'Higher National School of Renewable Energies, Environment and Sustainable Development, Batna, Algeria',
    },
    'home': DEFAULT_HOME
  };

  for (const [docId, data] of Object.entries(docs)) {
    const docRef = doc(db, 'site_data', docId);
    await setDoc(docRef, { data });
    console.log(`✅ Seeded ${docId}`);
  }
  
  console.log('✨ Migration complete! Site is now fully dynamic and routing conflicts are resolved.');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
