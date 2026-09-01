export type Language = 'en' | 'ar';

export interface TranslationDict {
  // Brand & Slogan
  clubFullName: string;
  clubShortName: string;
  clubSlogan: string;
  clubAcronymBreakdown: {
    letter: string;
    word: string;
    desc: string;
  }[];

  // Navigation
  nav: {
    home: string;
    events: string;
    team: string;
    achievements: string;
    register: string;
    admin: string;
    language: string;
    switchTo: string;
  };

  // Home Page
  home: {
    heroBadge: string;
    heroTitle: string;
    heroSubtitle: string;
    acronymSectionTitle: string;
    acronymSectionSubtitle: string;
    meetZaitona: string;
    zaitonaRole: string;
    zaitonaDesc: string;
    zaitonaRoots: string;
    zaitonaHeritage: string;
    zaitonaGrowth: string;
    zaitonaInnovation: string;
    impactSustainabilityTitle: string;
    impactSustainabilityDesc: string;
    impactRenewableTitle: string;
    impactRenewableDesc: string;
    impactRoboticsTitle: string;
    impactRoboticsDesc: string;
    quickLatestEvent: string;
    quickViewEvents: string;
    quickOurTeam: string;
    quickMeetTeam: string;
    quickExploreTeam: string;
    quickTeamDesc: string;
    quickImpact: string;
    quickAchievements: string;
    quickViewAchievements: string;
    quickAchievementsDesc: string;
  };

  // Upcoming Events Notification Banner
  eventsBanner: {
    badge: string;
    liveBadge: string;
    regOpen: string;
    regClosed: string;
    noUpcoming: string;
    registerNow: string;
    viewAllEvents: string;
    eventDetails: string;
    date: string;
    time: string;
    location: string;
    next: string;
    prev: string;
    eventNumber: string;
  };

  // Events Page
  eventsPage: {
    heroBadge: string;
    heroTitle: string;
    heroSubtitle: string;
    upcomingTab: string;
    pastTab: string;
    feedTitle: string;
    noEventsTitle: string;
    noUpcomingDesc: string;
    noPastDesc: string;
    individualReg: string;
    teamReg: string;
    members: string;
    regClosed: string;
    registerNow: string;
    calendarTitle: string;
    upcomingThisMonth: string;
    noEventsThisMonth: string;
    daysOfWeek: string[];
    months: string[];
  };

  // Team Page
  teamPage: {
    heroBadge: string;
    heroTitle: string;
    heroSubtitle: string;
    leadersTitle: string;
    leadersSubtitle: string;
    starMembersTitle: string;
    starMembersSubtitle: string;
    starMedalBadge: string;
    starMedalDesc: string;
    connect: string;
    joinMissionTitle: string;
    joinMissionDesc: string;
  };

  // Achievements Page
  achievementsPage: {
    heroBadge: string;
    heroTitle: string;
    heroSubtitle: string;
    certificateBadge: string;
    certificateDesc: string;
    excellenceBadge: string;
    journeyTitle: string;
    journeyDesc: string;
  };

  // General Intake Registration Page
  registerPage: {
    badge: string;
    title: string;
    subtitle: string;
    closedTitle: string;
    closedDesc: string;
    backHome: string;
    fullName: string;
    fullNamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    phone: string;
    phonePlaceholder: string;
    studyYear: string;
    selectYear: string;
    specialization: string;
    selectSpec: string;
    departmentsTitle: string;
    departmentsSubtitle: string;
    submit: string;
    submitting: string;
    successTitle: string;
    successDesc: string;
    errorPrefix: string;
    deptMediaTitle: string;
    deptMediaDesc: string;
    deptOrgTitle: string;
    deptOrgDesc: string;
    deptProjectsTitle: string;
    deptProjectsDesc: string;
  };

  // Event Registration Page
  eventRegisterPage: {
    backToEvents: string;
    registrationFor: string;
    teamBadge: string;
    individualBadge: string;
    deadlineTitle: string;
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
    deadlineExpired: string;
    generalInfoTitle: string;
    teamName: string;
    teamNamePlaceholder: string;
    institution: string;
    selectInstitution: string;
    otherInstitution: string;
    otherInstitutionPlaceholder: string;
    studyYear: string;
    selectStudyYear: string;
    leaderInfoTitle: string;
    membersInfoTitle: string;
    member: string;
    leader: string;
    fullName: string;
    email: string;
    phone: string;
    addMember: string;
    removeMember: string;
    companionTitle: string;
    companionCheckbox: string;
    companionName: string;
    companionRole: string;
    submitReg: string;
    submitting: string;
    successTitle: string;
    successDesc: string;
  };

  // Notification Toast
  toast: {
    regOpenTitle: string;
    regOpenDesc: string;
    registerNow: string;
    later: string;
  };

  // Common / Footer
  common: {
    allRightsReserved: string;
    quickLinks: string;
    contactUs: string;
    connectWithUs: string;
    loading: string;
    close: string;
    error: string;
    success: string;
    address: string;
    schoolName: string;
  };
}

export const translations: Record<Language, TranslationDict> = {
  en: {
    clubFullName: "Energy Robotic Innovation Sustainable Engineers",
    clubShortName: "E.R.I.S.E.",
    clubSlogan: "Innovating for Tomorrow's Sustainable Future",
    clubAcronymBreakdown: [
      {
        letter: "E",
        word: "Energy",
        desc: "Exploring clean and renewable energy systems, solar, wind, and green power solutions.",
      },
      {
        letter: "R",
        word: "Robotic",
        desc: "Engineering intelligent robotics, automation, IoT, embedded systems, and smart control.",
      },
      {
        letter: "I",
        word: "Innovation",
        desc: "Pioneering creative engineering solutions, hackathons, and transformative student projects.",
      },
      {
        letter: "S",
        word: "Sustainable",
        desc: "Committed to eco-friendly practices, circular economy, and long-term environmental protection.",
      },
      {
        letter: "E",
        word: "Engineers",
        desc: "Empowering visionary student engineers at the National School of Renewable Energies.",
      },
    ],
    nav: {
      home: "Home",
      events: "Events & Calendar",
      team: "Our Team",
      achievements: "Achievements",
      register: "Join Club",
      admin: "Admin",
      language: "Language",
      switchTo: "العربية",
    },
    home: {
      heroBadge: "Energy • Robotics • Innovation • Sustainability",
      heroTitle: "Energy Robotic Innovation Sustainable Engineers",
      heroSubtitle: "Welcome to E.R.I.S.E. Scientific Club — a vibrant hub of student engineers at the Higher National School of Renewable Energies, Environment and Sustainable Development in Batna, Algeria.",
      acronymSectionTitle: "The Core of E.R.I.S.E.",
      acronymSectionSubtitle: "Our identity defines every project, competition, and initiative we build.",
      meetZaitona: "Meet",
      zaitonaRole: "Official Club Mascot",
      zaitonaDesc: "Meet Zaitona, our official club mascot! Inspired by the strength and resilience of the olive tree, she’s here to guide you through our club, projects, upcoming events, and everything we build together at E.R.I.S.E.",
      zaitonaRoots: "Roots",
      zaitonaHeritage: "Algerian Heritage",
      zaitonaGrowth: "Ambition",
      zaitonaInnovation: "Tech & Robotics",
      impactSustainabilityTitle: "Environmental Sustainability",
      impactSustainabilityDesc: "Promoting eco-friendly practices and raising awareness about environmental conservation within our community and beyond.",
      impactRenewableTitle: "Renewable Energy & Power",
      impactRenewableDesc: "Exploring and developing innovative solutions in solar, wind, and sustainable power sources for tomorrow.",
      impactRoboticsTitle: "Robotics & Innovation",
      impactRoboticsDesc: "Designing autonomous robots, automation hardware, and AI-driven systems to tackle real-world engineering challenges.",
      quickLatestEvent: "Latest Event",
      quickViewEvents: "View All Events",
      quickOurTeam: "Our Team",
      quickMeetTeam: "Meet Our Team",
      quickExploreTeam: "Explore Team",
      quickTeamDesc: "Discover the passionate individuals, leadership board, and star members steering our mission.",
      quickImpact: "Impact & Milestone",
      quickAchievements: "Our Achievements",
      quickViewAchievements: "View Achievements",
      quickAchievementsDesc: "Celebrating milestones and accolades in robotics, renewable energy, and scientific competitions.",
    },
    eventsBanner: {
      badge: "Upcoming Event Notification",
      liveBadge: "Live Notice",
      regOpen: "Registrations Open",
      regClosed: "Registrations Closed",
      noUpcoming: "No upcoming events scheduled right now. Stay tuned for future workshops and symposiums!",
      registerNow: "Register For Event",
      viewAllEvents: "Explore All Events",
      eventDetails: "Event Details",
      date: "Date",
      time: "Time",
      location: "Location",
      next: "Next Event",
      prev: "Previous Event",
      eventNumber: "Event",
    },
    eventsPage: {
      heroBadge: "Interactive 3D Experience",
      heroTitle: "Events & Calendar",
      heroSubtitle: "Explore our workshops, hackathons, robotics challenges, and symposiums. Get along with Zaitona participating in our events!",
      upcomingTab: "Upcoming Events",
      pastTab: "Past Events",
      feedTitle: "Events Feed",
      noEventsTitle: "No Events Found",
      noUpcomingDesc: "We are currently planning our next exciting initiatives. Check back soon!",
      noPastDesc: "No past events have been archived yet.",
      individualReg: "Individual Registration",
      teamReg: "Team Registration",
      members: "members",
      regClosed: "Registration Closed",
      registerNow: "Register Now",
      calendarTitle: "Calendar",
      upcomingThisMonth: "Upcoming This Month",
      noEventsThisMonth: "No upcoming events scheduled for this month.",
      daysOfWeek: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
      months: [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ],
    },
    teamPage: {
      heroBadge: "Our Community",
      heroTitle: "The Minds Behind E.R.I.S.E.",
      heroSubtitle: "Meet the passionate engineers, innovators, and leaders dedicated to building a sustainable robotic future.",
      leadersTitle: "Club Leaders",
      leadersSubtitle: "Executive board driving our vision and daily operations",
      starMembersTitle: "Star Members",
      starMembersSubtitle: "Outstanding contributors and members of the month recognized for exceptional dedication",
      starMedalBadge: "Star Honor Medal",
      starMedalDesc: "Shine bright and celebrate excellence with Zaitona!",
      connect: "Connect",
      joinMissionTitle: "Join Our Mission",
      joinMissionDesc: "We are always looking for passionate students to join E.R.I.S.E. — whether you're interested in robotics, technical projects, media, or organization.",
    },
    achievementsPage: {
      heroBadge: "Excellence & Impact",
      heroTitle: "Our Success Stories",
      heroSubtitle: "Celebrating our milestones, competition victories, and the collective progress we've achieved in robotics and sustainable engineering.",
      certificateBadge: "Certificate Of Excellence",
      certificateDesc: "Earn new milestones and achievements like Zaitona!",
      excellenceBadge: "Recognition of Excellence",
      journeyTitle: "Journey in Progress",
      journeyDesc: "As an active scientific club, we are continually competing, innovating, and reaching new heights. Stay tuned for upcoming recognitions!",
    },
    registerPage: {
      badge: "Club Recruitment Intake",
      title: "Join E.R.I.S.E. Scientific Club",
      subtitle: "Become part of an energetic community of future engineers passionate about renewable energy, robotics, and hands-on innovation.",
      closedTitle: "Registrations Are Currently Closed",
      closedDesc: "Recruitment is not open at the moment. Follow our social media channels to be notified when the next intake round begins!",
      backHome: "Back to Home",
      fullName: "Full Name",
      fullNamePlaceholder: "e.g. John Doe",
      email: "Email Address",
      emailPlaceholder: "your.email@example.com",
      phone: "Phone Number",
      phonePlaceholder: "0550 12 34 56",
      studyYear: "Year of Study",
      selectYear: "Select your current year",
      specialization: "Specialization (Required for 3rd year & above)",
      selectSpec: "Select your engineering specialization",
      departmentsTitle: "Choose Your Departments",
      departmentsSubtitle: "Select one or more departments you want to contribute to:",
      submit: "Submit Application",
      submitting: "Submitting Application...",
      successTitle: "Application Submitted Successfully!",
      successDesc: "Thank you for applying to E.R.I.S.E.! Our team will review your application and contact you soon for the next steps.",
      errorPrefix: "Please correct the following: ",
      deptMediaTitle: "Media & Design",
      deptMediaDesc: "Content creation, visual storytelling, photography, graphic design, and social media.",
      deptOrgTitle: "Organization & Logistics",
      deptOrgDesc: "Event coordination, planning, logistics management, member relations, and scheduling.",
      deptProjectsTitle: "Technical Projects & Robotics",
      deptProjectsDesc: "Hands-on engineering, robotics, prototyping, clean energy systems, and research.",
    },
    eventRegisterPage: {
      backToEvents: "Back to Events",
      registrationFor: "Registration For",
      teamBadge: "Team Participation",
      individualBadge: "Individual Participation",
      deadlineTitle: "Registration Closes In",
      days: "Days",
      hours: "Hours",
      minutes: "Mins",
      seconds: "Secs",
      deadlineExpired: "Registration window has expired.",
      generalInfoTitle: "General Information",
      teamName: "Team Name",
      teamNamePlaceholder: "e.g. Solar Innovators",
      institution: "University / Higher School / Institution",
      selectInstitution: "Select your university or school...",
      otherInstitution: "Specify Other Institution",
      otherInstitutionPlaceholder: "Enter your institution name...",
      studyYear: "Study Level / Year",
      selectStudyYear: "Select study year...",
      leaderInfoTitle: "Team Leader Details",
      membersInfoTitle: "Team Members Details",
      member: "Member",
      leader: "Leader",
      fullName: "Full Name",
      email: "Email Address",
      phone: "Phone Number",
      addMember: "Add Team Member",
      removeMember: "Remove Member",
      companionTitle: "Companion / Driver / Academic Supervisor (Optional)",
      companionCheckbox: "We have an accompanying driver, professor, or supervisor traveling with us",
      companionName: "Companion Full Name",
      companionRole: "Companion Role / Purpose",
      submitReg: "Complete Registration",
      submitting: "Submitting Registration...",
      successTitle: "Registration Confirmed!",
      successDesc: "Your registration has been successfully recorded. Check your email for further instructions and updates.",
    },
    toast: {
      regOpenTitle: "Registrations Are Open!",
      regOpenDesc: "Join E.R.I.S.E. Scientific Club and become part of our robotic and sustainable innovation community.",
      registerNow: "Register Now",
      later: "Later",
    },
    common: {
      allRightsReserved: "All rights reserved.",
      quickLinks: "Quick Links",
      contactUs: "Contact Us",
      connectWithUs: "Connect With Us",
      loading: "Loading...",
      close: "Close",
      error: "Error",
      success: "Success",
      address: "Higher National School of Renewable Energies, Environment and Sustainable Development, Batna, Algeria",
      schoolName: "Higher National School of Renewable Energies, Environment and Sustainable Development",
    },
  },
  ar: {
    clubFullName: "مهندسو الطاقة، الروبوتات، الابتكار والاستدامة",
    clubShortName: "إيريس • E.R.I.S.E.",
    clubSlogan: "نبتكر اليوم من أجل مستقبل مستدام",
    clubAcronymBreakdown: [
      {
        letter: "E",
        word: "Energy • الطاقة",
        desc: "استكشاف الطاقات المتجددة والنظيفة، الطاقة الشمسية، وطاقة الرياح وحلول الطاقة الخضراء.",
      },
      {
        letter: "R",
        word: "Robotic • الروبوتات",
        desc: "هندسة الأنظمة الروبوتية الذكية، الأتمتة، إنترنت الأشياء (IoT)، والأنظمة المدمجة والتحكم.",
      },
      {
        letter: "I",
        word: "Innovation • الابتكار",
        desc: "تطوير حلول هندسية مبتكرة، والمشاركة في الهاكاثونات والمسابقات والمشاريع الطلابية الرائدة.",
      },
      {
        letter: "S",
        word: "Sustainable • الاستدامة",
        desc: "الالتزام بالممارسات الصديقة للبيئة والاقتصاد الدائري والحفاظ على البيئة للأجيال القادمة.",
      },
      {
        letter: "E",
        word: "Engineers • المهندسون",
        desc: "تمكين نخبة من مهندسي المستقبل بالمدرسة الوطنية العليا للطاقات المتجددة بباتنة.",
      },
    ],
    nav: {
      home: "الرئيسية",
      events: "الفعاليات والتقويم",
      team: "فريقنا",
      achievements: "الإنجازات",
      register: "انضم إلينا",
      admin: "لوحة التحكم",
      language: "اللغة",
      switchTo: "English",
    },
    home: {
      heroBadge: "الطاقة • الروبوتات • الابتكار • الاستدامة",
      heroTitle: "مهندسو الطاقة، الروبوتات، الابتكار والاستدامة",
      heroSubtitle: "مرحبًا بكم في النادي العلمي E.R.I.S.E. — مجتمع طلابي ريادي يجمع نخبة مهندسي المستقبل بالمدرسة الوطنية العليا للطاقات المتجددة والبيئة والتنمية المستدامة بباتنة، الجزائر.",
      acronymSectionTitle: "جوهر وهوية نادي E.R.I.S.E.",
      acronymSectionSubtitle: "حروف اسم نادينا تمثل ركائزنا الخمسة في كل مشروع وابتكار ومبادرة نقوم بها.",
      meetZaitona: "تعرّف على",
      zaitonaRole: "التميمة الرسمية للنادي",
      zaitonaDesc: "تعرّفوا على «زيتونة»، التميمة الرسمية لنادي E.R.I.S.E.! مستوحاة من صمود وأصالة شجرة الزيتون، وسترافقكم لاكتشاف مشاريعنا، ورشاتنا، وفعالياتنا وكل ما نبنيه معًا في النادي.",
      zaitonaRoots: "الأصالة",
      zaitonaHeritage: "الهوية والتراث",
      zaitonaGrowth: "الطموح",
      zaitonaInnovation: "الروبوتات والابتكار",
      impactSustainabilityTitle: "الاستدامة البيئية",
      impactSustainabilityDesc: "تعزيز السلوكيات البيئية الإيجابية ونشر الوعي بالحفاظ على الموارد الطبيعية وحماية البيئة.",
      impactRenewableTitle: "الطاقات المتجددة",
      impactRenewableDesc: "دراسة وتطوير حلول مبتكرة في مجالات الطاقة الشمسية والرياح وتخزين الطاقة النظيفة.",
      impactRoboticsTitle: "الروبوتات والأنظمة الذكية",
      impactRoboticsDesc: "تصميم وبناء روبوتات ذكية وأنظمة تحكم وأتمتة مبرمجة لمواجهة التحديات الهندسية المعاصرة.",
      quickLatestEvent: "أحدث فعالية",
      quickViewEvents: "عرض كل الفعاليات",
      quickOurTeam: "فريق العمل",
      quickMeetTeam: "تعرّف على فريقنا",
      quickExploreTeam: "استكشف الفريق",
      quickTeamDesc: "تعرّف على الكفاءات والشغوفين في الهيئة التنفيذية والأعضاء المتميزين الذين يقودون مسيرتنا.",
      quickImpact: "الأثر والتميز",
      quickAchievements: "إنجازاتنا وتتويجاتنا",
      quickViewAchievements: "مشاهدة الإنجازات",
      quickAchievementsDesc: "احتفاء بالجوائز والنجاحات والمسابقات الوطنية في مجالات الروبوتات والطاقة والابتكار.",
    },
    eventsBanner: {
      badge: "إشعار الفعاليات القادمة",
      liveBadge: "إعلان هام",
      regOpen: "التسجيل مفتوح الآن",
      regClosed: "التسجيل مغلق",
      noUpcoming: "لا توجد فعاليات قادمة حالياً. ترقبوا الإعلان عن ورشات عمل ومؤتمرات جديدة قريباً!",
      registerNow: "سجّل الآن في الفعالية",
      viewAllEvents: "تصفح جميع الفعاليات",
      eventDetails: "تفاصيل الفعالية",
      date: "التاريخ",
      time: "التوقيت",
      location: "المكان",
      next: "الفعالية التالية",
      prev: "الفعالية السابقة",
      eventNumber: "فعالية",
    },
    eventsPage: {
      heroBadge: "تجربة ثلاثية الأبعاد تفاعلية",
      heroTitle: "الفعاليات والتقويم",
      heroSubtitle: "استكشف ورشاتنا التدريبية، تحديات الروبوتات، والملتقيات العلمية. شارك مع زيتونة في مختلف الأنشطة!",
      upcomingTab: "الفعاليات القادمة",
      pastTab: "الفعاليات السابقة",
      feedTitle: "سجل الفعاليات",
      noEventsTitle: "لا توجد فعاليات",
      noUpcomingDesc: "نحن حالياً بصدد التحضير لفعاليات ومبادرات مميزة. ترقبونا قريباً!",
      noPastDesc: "لم يتم أرشفة أي فعاليات سابقة بعد.",
      individualReg: "تسجيل فردي",
      teamReg: "تسجيل فِرق",
      members: "أعضاء",
      regClosed: "التسجيل مغلق",
      registerNow: "سجّل الآن",
      calendarTitle: "التقويم السنوي",
      upcomingThisMonth: "فعاليات هذا الشهر",
      noEventsThisMonth: "لا توجد فعاليات مبرمجة خلال هذا الشهر.",
      daysOfWeek: ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"],
      months: [
        "جانفي (يناير)", "فيفري (فبراير)", "مارس", "أفريل (أبريل)", "ماي (مايو)", "جوان (يونيو)",
        "جويلية (يوليو)", "أوت (أغسطس)", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
      ],
    },
    teamPage: {
      heroBadge: "مجتمعنا الطلابي",
      heroTitle: "العقول والمواهب وراء E.R.I.S.E.",
      heroSubtitle: "تعرّف على المهندسين والمبتكرين والقادة الذين يعملون بشغف لصنع مستقبل مستدام في الروبوتات والطاقة.",
      leadersTitle: "قادة النادي",
      leadersSubtitle: "المكتب التنفيذي المشرف على توجيه مسيرة النادي وأنشطته",
      starMembersTitle: "الأعضاء المتميزون",
      starMembersSubtitle: "أعضاء الشهر وأصحاب المساهمات البارزة والاستثنائية في نجاح مبادرات النادي",
      starMedalBadge: "ميدالية الشرف والتميز",
      starMedalDesc: "تألّق واحتفل بالإنجاز والتميز مع زيتونة!",
      connect: "تواصل",
      joinMissionTitle: "انضم إلى مسيرتنا",
      joinMissionDesc: "نرحب دائماً بالطلبة الشغوفين للانضمام إلى E.R.I.S.E. — سواء كنت مهتماً بالروبوتات، المشاريع التقنية، الإعلام والتصميم، أو التنظيم.",
    },
    achievementsPage: {
      heroBadge: "التميز والأثر",
      heroTitle: "قصص نجاحنا وإنجازاتنا",
      heroSubtitle: "نحتفي بمحطات نجاحنا، وتتويجاتنا في المسابقات، والتقدم المستمر في مجالات الروبوتات والهندسة المستدامة.",
      certificateBadge: "شهادة التميز والاستحقاق",
      certificateDesc: "حقق إنجازات جديدة وارتقِ بطموحك مع زيتونة!",
      excellenceBadge: "وسام التميز العلمي",
      journeyTitle: "مسيرة مستمرة نحو القمة",
      journeyDesc: "كنادي علمي ريادي، نواصل الابتكار والمنافسة في مختلف التحديات العلمية والوطنية. ترقبوا المزيد من التتويجات!",
    },
    registerPage: {
      badge: "فترة التوظيف والانخراط",
      title: "انضم إلى النادي العلمي E.R.I.S.E.",
      subtitle: "كن جزءاً من مجتمع هندسي ملهم يجمع الشغف بالطاقات المتجددة، الروبوتات، والمشاريع المبتكرة.",
      closedTitle: "التسجيلات مغلقة حالياً",
      closedDesc: "باب الانخراط غير متاح في الوقت الحالي. تابعونا عبر منصات التواصل الاجتماعي لمعرفة موعد إطلاق دفعة التسجيل القادمة!",
      backHome: "العودة للرئيسية",
      fullName: "الاسم واللقب",
      fullNamePlaceholder: "مثال: يونس بن علي",
      email: "البريد الإلكتروني",
      emailPlaceholder: "your.email@example.com",
      phone: "رقم الهاتف",
      phonePlaceholder: "0550 12 34 56",
      studyYear: "السنة الدراسية",
      selectYear: "اختر سنتك الدراسية الحالية",
      specialization: "التخصص (إلزامي لطلبة السنة الثالثة فما فوق)",
      selectSpec: "اختر تخصصك الهندسي",
      departmentsTitle: "اختر اللجان واللجان الفرعية",
      departmentsSubtitle: "حدد لجنة واحدة أو أكثر ترغب في المشاركة والمساهمة فيها:",
      submit: "إرسال استمارة التسجيل",
      submitting: "جارٍ إرسال الاستمارة...",
      successTitle: "تم إرسال طلبك بنجاح!",
      successDesc: "شكراً لاهتمامك بالانضمام إلى E.R.I.S.E.! ستقوم لجنة النادي بمراجعة طلبك والتواصل معك قريباً لإعلامك بالخطوات القادمة.",
      errorPrefix: "يرجى تصحيح التالي: ",
      deptMediaTitle: "الإعلام والتصميم",
      deptMediaDesc: "صناعة المحتوى المرئي، التصميم الجرافيكي، التصوير، وإدارة منصات التواصل الاجتماعي.",
      deptOrgTitle: "التنظيم واللوجستيات",
      deptOrgDesc: "تنسيق الفعاليات، التخطيط، تسيير الحضور واللوجستيات، والتنظيم الميداني للأنشطة.",
      deptProjectsTitle: "المشاريع التقنية والروبوتات",
      deptProjectsDesc: "العمل التطبيقي، برمجة وبناء الروبوتات، مشاريع الطاقات المتجددة، والبحث التطويري.",
    },
    eventRegisterPage: {
      backToEvents: "العودة للفعاليات",
      registrationFor: "التسجيل في فعالية",
      teamBadge: "مشاركة كفريق",
      individualBadge: "مشاركة فردية",
      deadlineTitle: "ينتهي التسجيل خلال",
      days: "أيام",
      hours: "ساعات",
      minutes: "دقائق",
      seconds: "ثوانٍ",
      deadlineExpired: "انتهت فترة التسجيل لهذه الفعالية.",
      generalInfoTitle: "المعلومات العامة",
      teamName: "اسم الفريق",
      teamNamePlaceholder: "مثال: رواد الطاقة المستدامة",
      institution: "الجامعة / المدرسة العليا / المؤسسة",
      selectInstitution: "اختر مؤسستك الجامعية...",
      otherInstitution: "تحديد مؤسسة أخرى",
      otherInstitutionPlaceholder: "اكتب اسم المؤسسة الجامعية...",
      studyYear: "المستوى الدراسي",
      selectStudyYear: "اختر المستوى الدراسي...",
      leaderInfoTitle: "بيانات قائد الفريق",
      membersInfoTitle: "بيانات أعضاء الفريق",
      member: "العضو",
      leader: "القائد",
      fullName: "الاسم واللقب",
      email: "البريد الإلكتروني",
      phone: "رقم الهاتف",
      addMember: "إضافة عضو جديد",
      removeMember: "حذف العضو",
      companionTitle: "المرافق / السائق / المشرف الأكاديمي (اختياري)",
      companionCheckbox: "لدينا سائق أو أستاذ مشرف مرافق للفريق",
      companionName: "اسم المرافق كاملاً",
      companionRole: "صفة أو دور المرافق",
      submitReg: "تأكيد التسجيل",
      submitting: "جارٍ تأكيد التسجيل...",
      successTitle: "تم تسجيلك بنجاح!",
      successDesc: "تم استلام استمارة التسجيل الخاصة بك بنجاح. يرجى متابعة بريدك الإلكتروني لمعرفة التفاصيل والتعليمات اللاحقة.",
    },
    toast: {
      regOpenTitle: "التسجيلات مفتوحة الآن!",
      regOpenDesc: "انضم إلى النادي العلمي E.R.I.S.E. وكن جزءاً من مجتمعنا الريادي في الابتكار والروبوتات والاستدامة.",
      registerNow: "سجّل الآن",
      later: "لاحقاً",
    },
    common: {
      allRightsReserved: "جميع الحقوق محفوظة.",
      quickLinks: "روابط سريعة",
      contactUs: "اتصل بنا",
      connectWithUs: "تواصل معنا",
      loading: "جارٍ التحميل...",
      close: "إغلاق",
      error: "خطأ",
      success: "نجاح",
      address: "المدرسة الوطنية العليا للطاقات المتجددة والبيئة والتنمية المستدامة، باتنة، الجزائر",
      schoolName: "المدرسة الوطنية العليا للطاقات المتجددة والبيئة والتنمية المستدامة",
    },
  },
};
