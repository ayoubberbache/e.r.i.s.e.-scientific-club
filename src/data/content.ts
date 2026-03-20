export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image: string;
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
  category: string;
  icon?: any;
}

export const LATEST_EVENTS: Event[] = [
  {
    id: 1,
    title: "English Talk with Lore Academy",
    description: "Lore Academy is a leading language school and training center specializing in comprehensive foreign language education and official exam preparation. Join us for an interactive session to improve your English proficiency and confidence in real-world communication.",
    date: "2026-03-12",
    time: "2:00 PM - 4:00 PM",
    location: "Lore Academy",
    image: "/Events/english_corner.jpg",
    status: "Past",
    noRegistration: true
  }
];

export const ACHIEVEMENTS: Achievement[] = [];
