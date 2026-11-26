import { Department, DepartmentHeadUser } from '../types/portals';

// Public display configuration only — ZERO password hashes or salts live in the frontend bundle.
// Authentication happens exclusively on the server via `/api/auth`.

export const DEPARTMENT_HEADS: Record<Department, DepartmentHeadUser> = {
  Projects: {
    id: 'head-projects',
    name: 'Ayoub Berbache',
    username: 'ayoub_berbache',
    role: 'head_projects',
    roleTitle: 'Head of Projects',
    department: 'Projects',
    email: 'a.berbache@hns-re2sd.dz',
    avatar: '/team-assets/Ayoub.jpg',
    defaultMemberRoles: ['Embedded Systems Engineer', 'IoT Developer', 'CAD Designer', 'Project Researcher', 'Projects Member'],
  },
  Organization: {
    id: 'head-organization',
    name: 'Ahmed Amine Helali',
    username: 'ahmed_amine_helali',
    role: 'head_organization',
    roleTitle: 'Head of Organization',
    department: 'Organization',
    email: 'aa.helali@hns-re2sd.dz',
    defaultMemberRoles: ['Event Coordinator', 'Logistics Lead', 'Protocol & Reception', 'Operations Member'],
  },
  Media: {
    id: 'head-media',
    name: 'Matriche Abderrahmane',
    username: 'matriche_abderrahmane',
    role: 'head_media',
    roleTitle: 'Head of Media',
    department: 'Media',
    email: 'a.matriche@hns-re2sd.dz',
    defaultMemberRoles: ['Graphic Designer', 'Video Editor', 'Photographer', 'Content Writer', 'Media Member'],
  },
};

export interface DepartmentPortalInfo {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  department: Department;
  headName: string;
  roleTitle: string;
  avatar?: string;
}

export const DEPARTMENT_PORTALS: DepartmentPortalInfo[] = [
  {
    id: 'projects',
    slug: 'projects',
    name: 'Projects Department',
    nameAr: 'قسم المشاريع',
    department: 'Projects',
    headName: 'Ayoub Berbache',
    roleTitle: 'Head of Projects',
    avatar: '/team-assets/Ayoub.jpg',
  },
  {
    id: 'organization',
    slug: 'organization',
    name: 'Organization & Logistics',
    nameAr: 'قسم التنظيم واللوجستيك',
    department: 'Organization',
    headName: 'Ahmed Amine Helali',
    roleTitle: 'Head of Organization',
  },
  {
    id: 'media',
    slug: 'media',
    name: 'Media & Communication',
    nameAr: 'قسم الإعلام والتواصل',
    department: 'Media',
    headName: 'Matriche Abderrahmane',
    roleTitle: 'Head of Media',
  },
];
