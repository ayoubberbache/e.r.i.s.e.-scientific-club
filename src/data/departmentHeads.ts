import { Department, DepartmentHeadUser, UserRole } from '../types/portals';
import { verifyPasswordHash } from '../lib/authCrypto';

export interface HeadConfig {
  id: string;
  name: string;
  username: string;
  aliases: string[];
  salt: string;
  passwordHash: string;
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
    salt: 'erise_salt_proj_kinetics74_2026',
    passwordHash: '245c68a9395875404754e94a5bfa2e4ff6473dbb9896d778ed8721fd04de2deb',
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
    salt: 'erise_salt_org_logistics563_2026',
    passwordHash: 'b693eccfba56c3b412d531a047acbeca2d7bfa6aa6d2f6fb6e1d1e517f444189',
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
    salt: 'erise_salt_media_lumiere89_2026',
    passwordHash: 'a7c178c980c2743c35a572ce71a8a519ad226912d9f09a9c5fb3f66674bf38c1',
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
  salt: 'erise_salt_super_alpha982_2026',
  passwordHash: '33edd6f3e9e0cb5f8a1df580f26a0c9498ece17684b152ad13fe6df77a81e7cc',
  role: 'admin' as UserRole,
  roleTitle: 'Club Administrator',
  name: 'E.R.I.S.E. Administrator',
  department: 'All' as const,
  email: 'erise.club@gmail.com'
};

export async function authenticateByPassword(passwordInput: string): Promise<DepartmentHeadUser | null> {
  const cleanPass = passwordInput.trim();
  if (!cleanPass) return null;

  // 1. Check Projects Head
  const projectsHead = DEPARTMENT_HEADS.Projects;
  if (await verifyPasswordHash(cleanPass, projectsHead.salt, projectsHead.passwordHash)) {
    return {
      id: projectsHead.id,
      name: projectsHead.name,
      username: projectsHead.username,
      role: projectsHead.role,
      roleTitle: projectsHead.roleTitle,
      department: projectsHead.department,
      email: projectsHead.email,
      avatar: projectsHead.avatar,
    };
  }

  // 2. Check Organization Head
  const orgHead = DEPARTMENT_HEADS.Organization;
  if (await verifyPasswordHash(cleanPass, orgHead.salt, orgHead.passwordHash)) {
    return {
      id: orgHead.id,
      name: orgHead.name,
      username: orgHead.username,
      role: orgHead.role,
      roleTitle: orgHead.roleTitle,
      department: orgHead.department,
      email: orgHead.email,
      avatar: orgHead.avatar,
    };
  }

  // 3. Check Media Head
  const mediaHead = DEPARTMENT_HEADS.Media;
  if (await verifyPasswordHash(cleanPass, mediaHead.salt, mediaHead.passwordHash)) {
    return {
      id: mediaHead.id,
      name: mediaHead.name,
      username: mediaHead.username,
      role: mediaHead.role,
      roleTitle: mediaHead.roleTitle,
      department: mediaHead.department,
      email: mediaHead.email,
      avatar: mediaHead.avatar,
    };
  }

  // 4. Check Super Admin
  if (await verifyPasswordHash(cleanPass, SUPER_ADMIN_CONFIG.salt, SUPER_ADMIN_CONFIG.passwordHash)) {
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

  return null;
}

export async function authenticateUser(usernameInput: string, passwordInput: string): Promise<DepartmentHeadUser | null> {
  const cleanUser = usernameInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();
  if (!cleanPass) return null;

  // First try direct password resolution (automatic portal assignment)
  const passwordMatch = await authenticateByPassword(cleanPass);
  if (passwordMatch) {
    if (!cleanUser || cleanUser === 'admin' || cleanUser === passwordMatch.username.toLowerCase()) {
      return passwordMatch;
    }
  }

  // Check Super Admin via Salted Cryptographic SHA-256 Hash
  if (cleanUser === SUPER_ADMIN_CONFIG.username || cleanUser === 'admin') {
    const isValid = await verifyPasswordHash(cleanPass, SUPER_ADMIN_CONFIG.salt, SUPER_ADMIN_CONFIG.passwordHash);
    if (isValid) {
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
  }

  // Check Department Heads with explicit username
  for (const deptKey of Object.keys(DEPARTMENT_HEADS) as Department[]) {
    const head = DEPARTMENT_HEADS[deptKey];
    const matchUsername =
      cleanUser === head.username.toLowerCase() ||
      head.aliases.some(alias => alias.toLowerCase() === cleanUser);

    if (matchUsername && (await verifyPasswordHash(cleanPass, head.salt, head.passwordHash))) {
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


