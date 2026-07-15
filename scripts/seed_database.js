import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Note: we can't directly import TypeScript files in a basic Node script without ts-node or similar.
// So we will parse the siteData.ts file manually or use a workaround.
// The easiest is to just copy the data here for the seed script.
const LEADERS = [
  {
    name: 'Mohamed Harkati',
    role: 'President',
    image: '/team-assets/Mohamed.JPG',
    specialty: 'Renewable Energies Engineering Student',
    skills: ['Leadership & Strategy', 'Renewable Energy Systems', 'Project Coordination', 'Public Speaking'],
    socials: { 
      linkedin: 'https://www.linkedin.com/in/harkati-mohamed-elamin-7004bb389', 
      mail: 'mailto:me.harkati@hns-re2sd.dz' 
    }
  },
  {
    name: 'Maria Aridje Benaissa',
    role: 'Vice President',
    image: '/team-assets/Maria.JPG',
    specialty: 'Renewable Energies Engineering Student',
    skills: ['Leadership & Team Coordination', 'Graphic Design (Beginner)', 'Soft Skills', 'Event Planning'],
    socials: { 
      linkedin: 'https://www.linkedin.com/in/maria-aridje-benaissa-bb4033259/', 
      mail: 'mailto:mariaaridje16@gmail.com' 
    }
  },
  {
    name: 'Chehd Wissal Ben mecheri',
    role: 'General Secretary',
    image: '/team-assets/Chahed.JPG',
    specialty: 'AI and Industrial Networks Engineering Student',
    skills: ['Python', 'HTML', 'Data Analysis', 'Report Writing', 'Content Organization', 'Problem Solving'],
    socials: { 
      linkedin: 'https://www.linkedin.com/in/chehd-wissal-ben-mecheri-a08787388/', 
      github: 'https://github.com/CHEHD-TECH',
      mail: 'mailto:cw.benmecheri@hns-re2sd.dz'
    }
  },
  {
    name: 'Ayoub Berbache',
    role: 'Head of Media',
    image: '/team-assets/Ayoub.JPG',
    specialty: 'AI and Industrial Networks Engineering Student',
    skills: ['Full-stack Web Development', '3D Modeling & Design', 'UI/UX Design', 'Reverse Engineering', 'Analytical Thinking'],
    socials: { 
      linkedin: 'https://www.linkedin.com/in/berbache-ayyoub-a5a51a38b/', 
      mail: 'mailto:a.berbache@hns-re2sd.dz'
    }
  },
  {
    name: 'Mohammed Adel Batira',
    role: 'Head of Projects',
    image: '/team-assets/Adel.jpg',
    specialty: 'Micro Electronics and IC Design Engineering Student',
    skills: ['3D Design', 'Arduino/ESP32', 'Data Analyst', 'Video Editing', 'System Verilog/Verilog'],
    socials: { 
      mail: 'mailto:adolallla9@gmail.com' 
    }
  },
  {
    name: 'Nourhane Hamani',
    role: 'Head of Organization',
    image: '/team-assets/Nourhan.JPG',
    specialty: 'Electrical Engineering Student',
    skills: ['Organization & Teamwork', 'Engineering Problem-Solving', 'Decisiveness & Work Ethic', 'Adaptability & Learning'],
    socials: { 
      mail: 'mailto:n.hamani@hns-re2sd.dz' 
    }
  },
  {
    name: 'Ahmed Ilyes Lakhdar',
    role: 'Head of Sports and Activities',
    image: '/team-assets/Ilyes.JPG',
    specialty: 'Micro Electronics and IC Design Engineering Student',
    skills: ['Video Montage', 'Photoshop', 'Graphic Design', 'Layouts & Maquettes'],
    socials: { 
      linkedin: 'https://www.linkedin.com/in/lakhdar-ahmed-ilyes-7b2917399', 
      mail: 'mailto:ai.lakhdar@hns-re2sd.dz'
    }
  },
  {
    name: 'Zakaria Takhnouni',
    role: 'Head of Internal Relationships',
    image: '/team-assets/Zakaria.JPG',
    specialty: 'Green Hydrogen Engineering Student',
    skills: ['UI/UX Design', 'Creative Writing', 'Cubist Painter', 'Generative AI', 'Chemical Analysis & Experimental Design'],
    socials: { 
      linkedin: 'https://www.linkedin.com/in/zakaria-takhnouni-251230389', 
      mail: 'mailto:z.takhnouni@hns-re2sd.dz'
    }
  },
];

const EVENTS = [
  {
    title: "English Talk with Lore Academy",
    description: "Lore Academy is a leading language school and training center specializing in comprehensive foreign language education and official exam preparation. Join us for an interactive session to improve your English proficiency and confidence in real-world communication.",
    date: "2026-03-12",
    time: "2:00 PM - 4:00 PM",
    location: "Lore Academy",
    image: "/events-assets/english_corner.jpg",
    status: "Past",
    no_registration: true
  },
  {
    title: "E-RISE Idea Track",
    description: "The E-RISE Idea Track was a 3-day intensive workshop hosted at the RE2S School. Participants worked on developing innovative solutions for renewable energy challenges, moving from concept to pitch with the guidance of expert mentors.",
    date: "2026-02-14 - 2026-02-16",
    time: "",
    location: "Higher National School of Renewable Energies (RE2S), Batna",
    image: "/events-assets/idea-track-1.jpg",
    images: [
      "/events-assets/idea-track-1.jpg",
      "/events-assets/idea-track-2.jpg",
      "/events-assets/idea-track-3.jpg",
      "/events-assets/idea-track-4.jpg"
    ],
    status: "Past",
    no_registration: true
  },
  {
    title: "E.R.I.S.E. Open Day",
    description: "The E.R.I.S.E. Open Day at the RE2SD school was a vibrant celebration of innovation and community. We welcomed students and visitors to explore our club's activities, projects, and mission. From live demonstrations to interactive discussions, the event showcased how our members are driving change in renewable energy and sustainability. It was an inspiring day of connection, learning, and sharing our passion for engineering a greener future.",
    date: "2025-11-11",
    time: "8:30 AM - 1:00 PM",
    location: "Higher National School of Renewable Energies (RE2S), Batna",
    image: "/events-assets/open-day-1.jpg",
    images: [
      "/events-assets/open-day-1.jpg",
      "/events-assets/open-day-2.jpg",
      "/events-assets/open-day-3.jpg"
    ],
    status: "Past",
    no_registration: true
  },
  {
    title: "Think and Sink",
    description: "An engaging event where participants tackled challenging ideas, fostering deep thinking and collaborative problem-solving among peers.",
    date: "2025-11-11",
    time: "14:00 - 16:00",
    location: "Higher National School of Renewable Energies (RE2S), Amphie 3",
    image: "/events-assets/think-and-sink-1.jpg",
    images: [
      "/events-assets/think-and-sink-1.jpg",
      "/events-assets/think-and-sink-2.jpg",
      "/events-assets/think-and-sink-3.jpg",
      "/events-assets/think-and-sink-4.jpg"
    ],
    status: "Past",
    no_registration: true
  }
];

const ACHIEVEMENTS = [
  {
    title: "Second National Gathering of Scientific Computer Science Clubs",
    description: "Workshops that fueled creativity, conferences that broadened our perspectives, and challenges that pushed us further at Constantine.",
    date: "2025-12-06",
    year: "2025",
    image: "/achievements-assets/hackathon-1.jpg",
    images: [
      "/achievements-assets/hackathon-1.jpg",
      "/achievements-assets/hackathon-2.jpg",
      "/achievements-assets/hackathon-3.jpg"
    ],
    category: "Event Participation"
  }
];

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding leaders...');
  for (const leader of LEADERS) {
    const { error } = await supabase.from('leaders').insert({
      name: leader.name,
      role: leader.role,
      image: leader.image,
      specialty: leader.specialty,
      skills: leader.skills || [],
      linkedin: leader.socials?.linkedin,
      mail: leader.socials?.mail,
      github: leader.socials?.github,
    });
    if (error) console.error(`Failed to insert leader ${leader.name}:`, error);
  }

  console.log('Seeding events...');
  for (const ev of EVENTS) {
    const { error } = await supabase.from('events').insert(ev);
    if (error) console.error(`Failed to insert event ${ev.title}:`, error);
  }

  console.log('Seeding achievements...');
  for (const ach of ACHIEVEMENTS) {
    const { error } = await supabase.from('achievements').insert(ach);
    if (error) console.error(`Failed to insert achievement ${ach.title}:`, error);
  }

  console.log('Database seeded successfully!');
}

seed();
