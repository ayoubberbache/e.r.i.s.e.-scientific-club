import { Department, DepartmentHeadUser, UserRole } from '../types/portals';

export interface HeadConfig {
  id: string;
  name: string;
  username: string;
  aliases: string[];
  password: string;
  role: UserRole;
  roleTitle: string;
  department: Department;
  email: string;
  avatar: string;
  color: string;
  description: string;
  defaultMemberRoles: string[];
}

export const DEPARTMENT_HEADS: Record<Department, HeadConfig> = {
  Projects: {
    id: 'head-projects',
    name: 'Ayoub Berbache',
    username: 'ayoub_berbache',
    aliases: ['ayoub_berbache', 'ayoub berbache', 'ayoub', 'head_projects', 'berbache ayoub', 'head of projects'],
    password: 'Erise_Proj#2026!Ayoub',
    role: 'head_projects',
    roleTitle: 'Head of Projects',
    department: 'Projects',
    email: 'a.berbache@hns-re2sd.dz',
    avatar: '/team-assets/Ayoub.JPG',
    color: '#00e5ff',
    description: 'Lead engineering, hardware/software innovation, research development, and club project roadmaps.',
    defaultMemberRoles: [
      'Project Lead',
      'Hardware & IoT Engineer',
      'Embedded Systems Developer',
      'Full-stack Software Developer',
      'CAD & 3D Prototyping Specialist',
      'Renewable Energy Research Specialist',
      'Electronics & Circuit Designer',
      'Data & Simulation Analyst',
      'General Project Member'
    ]
  },
  Organization: {
    id: 'head-organization',
    name: 'Ahmed Amine Helali',
    username: 'ahmed_amine_helali',
    aliases: ['ahmed_amine_helali', 'ahmed amine helali', 'ahmed', 'head_organization', 'helali ahmed', 'head of organization'],
    password: 'Erise_Org#2026!Ahmed',
    role: 'head_organization',
    roleTitle: 'Head of Organization',
    department: 'Organization',
    email: 'aa.helali@hns-re2sd.dz',
    avatar: 'https://ygougrhejaesbtifacdk.supabase.co/storage/v1/object/public/public_images/leaders/u3rhnehip7l.jpg',
    color: '#10b981',
    description: 'Oversee club logistics, event operational planning, venue management, and on-site staffing execution.',
    defaultMemberRoles: [
      'Lead Event Coordinator',
      'Logistics & Venue Manager',
      'Front Desk & Attendee Check-in',
      'Protocol & VIP Reception Lead',
      'Stage & Audio/Visual Director',
      'Sponsorship & Partnership Officer',
      'Crowd Control & Safety Staff',
      'Catering & Refreshments Lead',
      'General Organization Member'
    ]
  },
  Media: {
    id: 'head-media',
    name: 'Matriche Abderrahmane',
    username: 'matriche_abderrahmane',
    aliases: ['matriche_abderrahmane', 'matriche abderrahmane', 'matriche', 'abderrahmane', 'head_media', 'abderrahmane matriche', 'head of media'],
    password: 'Erise_Media#2026!Matriche',
    role: 'head_media',
    roleTitle: 'Head of Media',
    department: 'Media',
    email: 'a.matriche@hns-re2sd.dz',
    avatar: 'https://ygougrhejaesbtifacdk.supabase.co/storage/v1/object/public/public_images/leaders/ax7eqppq7q5.jpg',
    color: '#a855f7',
    description: 'Direct multimedia coverage, visual branding, photo/video production, social media, and communication.',
    defaultMemberRoles: [
      'Lead Photographer',
      'Videographer & Cinematographer',
      'Short-form Content & Reels Creator',
      'Video Editor & Motion Designer',
      'Graphic & Poster Designer',
      'Social Media & Community Manager',
      'Copywriter & Press Writer',
      'Live Streaming Operator',
      'Audio & Sound Specialist',
      'General Media Member'
    ]
  }
};

export const SUPER_ADMIN_CONFIG = {
  username: 'erise_admin',
  password: 'Er!s3_Cl0b@2026#Sec',
  role: 'admin' as UserRole,
  roleTitle: 'Club Administrator',
  name: 'E.R.I.S.E. Administrator',
  department: 'All' as const,
  email: 'erise.club@gmail.com'
};

export function authenticateUser(usernameInput: string, passwordInput: string): DepartmentHeadUser | null {
  const cleanUser = usernameInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  // Check Super Admin
  if (
    (cleanUser === SUPER_ADMIN_CONFIG.username || cleanUser === 'admin') &&
    cleanPass === SUPER_ADMIN_CONFIG.password
  ) {
    return {
      id: 'super-admin',
      name: SUPER_ADMIN_CONFIG.name,
      username: SUPER_ADMIN_CONFIG.username,
      role: 'admin',
      roleTitle: SUPER_ADMIN_CONFIG.roleTitle,
      department: 'All',
      email: SUPER_ADMIN_CONFIG.email,
    };
  }

  // Check Department Heads
  for (const deptKey of Object.keys(DEPARTMENT_HEADS) as Department[]) {
    const head = DEPARTMENT_HEADS[deptKey];
    const matchUsername =
      cleanUser === head.username.toLowerCase() ||
      head.aliases.some(alias => alias.toLowerCase() === cleanUser);

    if (matchUsername && cleanPass === head.password) {
      return {
        id: head.id,
        name: head.name,
        username: head.username,
        role: head.role,
        roleTitle: head.roleTitle,
        department: head.department,
        email: head.email,
        avatar: head.avatar,
      };
    }
  }

  return null;
}
