export interface StudyYearOption {
  id: string;
  yearNumber: number;
  branch: 'ST' | 'MI';
  labelEn: string;
  labelAr: string;
}

/**
 * Standard study year options for E.R.I.S.E. registration.
 * All existing years are under Science & Technology (ST),
 * plus 1st Year under Mathematics & Informatics (MI).
 */
export const STUDY_YEAR_OPTIONS: StudyYearOption[] = [
  {
    id: '1_st',
    yearNumber: 1,
    branch: 'ST',
    labelEn: '1st Year — Science & Technology (ST)',
    labelAr: 'السنة الأولى — علوم وتكنولوجيا (ST)',
  },
  {
    id: '1_mi',
    yearNumber: 1,
    branch: 'MI',
    labelEn: '1st Year — Mathematics & Informatics (MI)',
    labelAr: 'السنة الأولى — رياضيات وإعلام آلي (MI)',
  },
  {
    id: '2_st',
    yearNumber: 2,
    branch: 'ST',
    labelEn: '2nd Year — Science & Technology (ST)',
    labelAr: 'السنة الثانية — علوم وتكنولوجيا (ST)',
  },
  {
    id: '3_st',
    yearNumber: 3,
    branch: 'ST',
    labelEn: '3rd Year — Science & Technology (ST / Engineering)',
    labelAr: 'السنة الثالثة — علوم وتكنولوجيا / هندسة (ST)',
  },
  {
    id: '4_st',
    yearNumber: 4,
    branch: 'ST',
    labelEn: '4th Year — Science & Technology (ST / Engineering)',
    labelAr: 'السنة الرابعة — علوم وتكنولوجيا / هندسة (ST)',
  },
  {
    id: '5_st',
    yearNumber: 5,
    branch: 'ST',
    labelEn: '5th Year — Science & Technology (ST / Master Final)',
    labelAr: 'السنة الخامسة — علوم وتكنولوجيا / ماستر (ST)',
  },
];
