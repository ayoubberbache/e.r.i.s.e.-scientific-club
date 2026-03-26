
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

export const LEADERS: Leader[] = [
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
    skills: ['Leadership & Team Coordination', 'Graphic Design (Beginner)', 'Soft Skills', 'Event Planning', 'Community Engagement', 'Problem Solving', 'UI Design'],
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

// ── Events ───────────────────────────────────────────────────────────────────

export const EVENTS: Event[] = [
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
  },
  {
    id: 2,
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
    noRegistration: true
  },
  {
    id: 3,
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
    noRegistration: true
  },
  {
    id: 4,
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
    noRegistration: true
  }
];

// ── Achievements ─────────────────────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 1,
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
  teamPreviewImage: '/team-assets/our team.JPG',
};
