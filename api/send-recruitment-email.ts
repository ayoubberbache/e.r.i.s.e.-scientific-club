// Rate Limiting Map
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per IP per window

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return false;
}

function escapeHtml(unsafe: any): string {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Hosted Public Images on website domain (CDN enabled)
const LOGO_URL = "https://erise-scientific-club.site/logo-cyan-full.png";
const ACCEPTANCE_MASCOT_URL = "https://erise-scientific-club.site/gmail-pics/Acceptance.png";
const MEETING_MASCOT_URL = "https://erise-scientific-club.site/gmail-pics/Meeting.png";
const EVENT_MASCOT_URL = "https://erise-scientific-club.site/gmail-pics/Event-invitation.png";

const MAIN_TELEGRAM_LINK = "https://t.me/+ju8GDh4k9VdkYzQ0";
const MAIN_DISCORD_LINK = "https://discord.gg/Gz9yEfrFdS";

interface DepartmentConfig {
  name: string;
  telegram?: string;
  discord?: string;
  todoApp?: string;
  specialNote?: string;
}

const DEPARTMENT_CONFIGS: Record<string, DepartmentConfig> = {
  "projects": {
    name: "Projects",
    telegram: "https://t.me/+0ZBYbHRdKvpjZDU0",
    discord: "https://discord.gg/Gz9yEfrFdS",
  },
  "organization": {
    name: "Organization",
    telegram: "https://t.me/+lL1uqjsRBNpiNWVk",
    discord: "https://discord.gg/Gz9yEfrFdS",
    todoApp: "https://erise-todo.vercel.app/",
    specialNote: "Every Organization member is required to sign up in the E.R.I.S.E. To-Do App (https://erise-todo.vercel.app/).",
  },
  "media": {
    name: "Media",
    telegram: "https://t.me/+8yYJwqTQAWo0YTg0",
    discord: "https://discord.gg/YJSUAvj2kg",
  },
};

function normalizeDeptKey(dept: string): string {
  const clean = dept.trim().toLowerCase();
  if (clean.includes('proj')) return 'projects';
  if (clean.includes('org') || clean.includes('organ')) return 'organization';
  if (clean.includes('med')) return 'media';
  return clean;
}

// ==========================================
// PLAIN TEXT GENERATORS (Anti-Spam Multi-part)
// ==========================================

function generateAcceptanceText(name: string, departmentsRaw: any): string {
  let deptList: string[] = [];
  if (Array.isArray(departmentsRaw)) {
    deptList = departmentsRaw.map(d => String(d).trim()).filter(d => d.length > 0);
  } else if (typeof departmentsRaw === 'string') {
    deptList = departmentsRaw.split(',').map(d => d.trim()).filter(d => d.length > 0);
  } else if (departmentsRaw) {
    deptList = [String(departmentsRaw).trim()];
  }
  const depts = deptList.length > 0 ? deptList.join(', ') : 'E.R.I.S.E. Team';

  let deptSectionsText = '';
  let hasOrg = false;

  deptList.forEach(dept => {
    const key = normalizeDeptKey(dept);
    const config = DEPARTMENT_CONFIGS[key];
    if (config) {
      deptSectionsText += `\n--- [${config.name} Department Access] ---\n`;
      if (config.telegram) deptSectionsText += `• ${config.name} Telegram: ${config.telegram}\n`;
      if (config.discord) deptSectionsText += `• ${config.name} Discord: ${config.discord}\n`;
      if (config.todoApp) deptSectionsText += `• E.R.I.S.E. To-Do App: ${config.todoApp}\n`;
      if (config.specialNote) {
        hasOrg = true;
        deptSectionsText += `• MANDATORY ACTION: ${config.specialNote}\n`;
      }
    }
  });

  return `Congratulations ${name}!

You have been officially accepted into E.R.I.S.E. Scientific Club!

Assigned Department(s): ${depts}

=========================================
1. ALL-MEMBER ESSENTIAL LINKS (FOR EVERYONE)
=========================================
• Main Telegram Channel: ${MAIN_TELEGRAM_LINK}
• Main Discord Community: ${MAIN_DISCORD_LINK}
  (Note: Joining Discord is required to assign your official role so that when meetings are held, you will meet in your department's specific room).
${deptSectionsText}
=========================================
NEXT STEPS
=========================================
1. Join the Main Telegram Channel and Discord Server (your department roles and meeting rooms will be assigned on Discord).
${hasOrg ? '2. Create an account / sign up on the E.R.I.S.E. To-Do App (required for all Organization members).\n3. Connect with your department leads and teammates in your first meeting.' : '2. Connect with your department leads and teammates in your first meeting.'}

We are thrilled to welcome you on board!

Best regards,
E.R.I.S.E. Recruitment Team
Higher National School of Renewable Energies, Environment and Sustainable Development — Batna, Algeria

---
To manage your notification preferences or contact us, visit https://erise-scientific-club.site/contact`;
}

function generateMeetingText(name: string, location: string, dateTime: string): string {
  return `Hello ${name},

You're invited for a recruitment interview with E.R.I.S.E. Scientific Club!

Interview Details:
- Date & Time: ${dateTime}
- Location: ${location}

Interview Tips:
- Please arrive 5-10 minutes before your scheduled slot.
- Feel free to share your technical projects, interests, and motivation.

We look forward to meeting you!

Best regards,
E.R.I.S.E. Recruitment Team
Higher National School of Renewable Energies, Environment and Sustainable Development — Batna, Algeria

---
To manage your notification preferences, visit https://erise-scientific-club.site/contact`;
}

function generateEventInvitationText(teamOrName: string, eventTitle: string, location: string, dateTime: string, notes?: string): string {
  return `Congratulations ${teamOrName}!

You / your team have been officially selected & invited to participate in ${eventTitle} organized by E.R.I.S.E. Scientific Club.

Event Details:
- Event Name: ${eventTitle}
- Date & Time: ${dateTime}
- Venue / Location: ${location}
${notes ? `- Important Note: ${notes}\n` : ''}
Event Guidelines:
- Please arrive 15 minutes before the scheduled start time for check-in.
- Bring your student ID card and any requested event materials.

See you at the event!

Best regards,
E.R.I.S.E. Events Team
Higher National School of Renewable Energies, Environment and Sustainable Development — Batna, Algeria

---
To manage your notification preferences, visit https://erise-scientific-club.site/contact`;
}

// ==========================================
// HTML TEMPLATES (Optimized Text-to-Image & Footers)
// ==========================================

function generateAcceptanceHtml(name: string, departmentsRaw: any): string {
  let deptList: string[] = [];
  if (Array.isArray(departmentsRaw)) {
    deptList = departmentsRaw.map(d => String(d).trim()).filter(d => d.length > 0);
  } else if (typeof departmentsRaw === 'string') {
    deptList = departmentsRaw.split(',').map(d => d.trim()).filter(d => d.length > 0);
  } else if (departmentsRaw) {
    deptList = [String(departmentsRaw).trim()];
  }
  deptList = deptList.slice(0, 4);

  const deptBadgesHtml = deptList.map(dept => `
    <span style="background-color: #1A315B; color: #FFFFFF; padding: 6px 14px; border-radius: 8px; display: inline-block; margin: 3px; font-size: 13px; font-weight: 700;">
      ${escapeHtml(dept)} Department
    </span>
  `).join('');

  // Department-specific blocks
  let deptSpecificCardsHtml = '';
  deptList.forEach(dept => {
    const key = normalizeDeptKey(dept);
    const config = DEPARTMENT_CONFIGS[key];
    if (config) {
      let buttons = '';
      if (config.telegram) {
        buttons += `
          <a href="${config.telegram}" target="_blank" style="background-color: #1C8ADB; color: #FFFFFF; text-decoration: none; padding: 11px 16px; border-radius: 10px; display: block; margin: 6px auto; max-width: 290px; font-weight: 700; font-size: 13px; text-align: center;">
            Join ${escapeHtml(config.name)} Telegram
          </a>
        `;
      }
      if (config.discord) {
        buttons += `
          <a href="${config.discord}" target="_blank" style="background-color: #5865F2; color: #FFFFFF; text-decoration: none; padding: 11px 16px; border-radius: 10px; display: block; margin: 6px auto; max-width: 290px; font-weight: 700; font-size: 13px; text-align: center;">
            Join ${escapeHtml(config.name)} Discord
          </a>
        `;
      }
      if (config.todoApp) {
        buttons += `
          <a href="${config.todoApp}" target="_blank" style="background-color: #0D9488; color: #FFFFFF; text-decoration: none; padding: 11px 16px; border-radius: 10px; display: block; margin: 6px auto; max-width: 290px; font-weight: 700; font-size: 13px; text-align: center;">
            Open E.R.I.S.E. To-Do App
          </a>
        `;
      }

      let noteHtml = '';
      if (config.specialNote) {
        noteHtml = `
          <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 10px 12px; margin-top: 10px; text-align: left;">
            <p style="color: #92400E; font-size: 12px; font-weight: 700; margin: 0; line-height: 16px;">
              ⚠️ <strong>Mandatory Step:</strong> Every Organization member is required to sign up in the <a href="https://erise-todo.vercel.app/" target="_blank" style="color: #B45309; text-decoration: underline;">E.R.I.S.E. To-Do App</a>.
            </p>
          </div>
        `;
      }

      deptSpecificCardsHtml += `
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; margin-top: 12px;">
          <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #1A315B; font-weight: 800; text-align: center;">
            ${escapeHtml(config.name)} Department Channels
          </p>
          ${buttons}
          ${noteHtml}
        </div>
      `;
    }
  });

  const cleanName = escapeHtml(name);

  return `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml" lang="en" style="background-color: #0F172A;">
  <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style type="text/css">
          body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          table { border-collapse: collapse; }
          img { border: 0; height: auto; outline: none; text-decoration: none; display: block; }
      </style>
  </head>
  <body bgcolor="#0F172A" style="margin: 0 !important; padding: 0 !important; background-color: #0F172A;">
  <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0F172A">
      <tr>
          <td align="center" style="padding: 20px 10px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#1E293B" style="max-width: 500px; background-color: #1E293B; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
                  
                  <!-- HEADER LOGO & TEXT -->
                  <tr>
                      <td bgcolor="#1E293B" style="padding: 28px 20px 16px 20px; background-color: #1E293B; text-align: center;">
                          <img src="${LOGO_URL}" alt="E.R.I.S.E. Logo" width="120" style="margin: 0 auto 12px auto; width: 120px; height: auto;" />
                          <h1 style="color: #FFFFFF; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: 0.5px;">E.R.I.S.E. Scientific Club</h1>
                          <p style="color: #94A3B8; font-size: 12px; font-weight: 600; margin: 4px 0 0 0;">Official Recruitment Decision</p>
                      </td>
                  </tr>

                  <!-- HERO MASCOT -->
                  <tr>
                      <td align="center" bgcolor="#1E293B" style="padding: 0; margin: 0; background-color: #1E293B; width: 100%;">
                          <img src="${ACCEPTANCE_MASCOT_URL}" alt="Welcome to E.R.I.S.E." width="100%" style="width: 100%; max-width: 500px; height: auto; display: block; margin: 0 auto;" />
                      </td>
                  </tr>

                  <!-- WELCOME CARD (Seamless match with bottom clouds #8CC9CA) -->
                  <tr>
                      <td bgcolor="#8CC9CA" style="padding: 24px 20px; background-color: #8CC9CA; text-align: center;">
                          
                          <span style="background-color: rgba(26,49,91,0.15); color: #1A315B; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">Official Acceptance</span>

                          <h2 style="color: #1A315B; font-size: 22px; font-weight: 800; margin: 12px 0 8px 0; line-height: 28px;">
                              Congratulations, ${cleanName}!
                          </h2>

                          <p style="color: #1A315B; font-size: 14px; line-height: 21px; margin: 0 0 16px 0; font-weight: 500;">
                              You are officially accepted into <strong>E.R.I.S.E. Scientific Club</strong>! We are thrilled to welcome your energy, ambition, and creativity to the team.
                          </p>

                          <!-- DEPARTMENTS CONTAINER -->
                          <div style="margin: 14px 0;">
                              <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #1A315B; font-weight: 800;">Assigned Department(s)</p>
                              <div>${deptBadgesHtml}</div>
                          </div>

                      </td>
                  </tr>

                  <!-- ACTION CHANNELS (WHITE CARD) -->
                  <tr>
                      <td style="padding: 24px 20px; background-color: #FFFFFF;">
                          
                          <!-- General Community (Everyone) -->
                          <div style="text-align: center; margin-bottom: 16px;">
                              <h3 style="color: #0F172A; font-size: 14px; font-weight: 800; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                                  1. General Community (All Members)
                              </h3>
                              <p style="color: #64748B; font-size: 12px; margin: 0 0 12px 0;">
                                  Every accepted member must join our main community spaces:
                              </p>

                              <a href="${MAIN_TELEGRAM_LINK}" target="_blank" style="background-color: #24A1DE; color: #FFFFFF; text-decoration: none; padding: 12px 18px; border-radius: 10px; display: block; margin: 0 auto 8px auto; max-width: 290px; font-weight: 700; font-size: 13px; text-align: center;">
                                  Join Main Telegram Channel
                              </a>

                              <a href="${MAIN_DISCORD_LINK}" target="_blank" style="background-color: #5865F2; color: #FFFFFF; text-decoration: none; padding: 12px 18px; border-radius: 10px; display: block; margin: 0 auto; max-width: 290px; font-weight: 700; font-size: 13px; text-align: center;">
                                  Join Main Discord Community
                              </a>

                              <p style="color: #64748B; font-size: 11px; line-height: 16px; margin: 8px auto 0 auto; max-width: 320px; text-align: center;">
                                  💡 <em>Joining Discord is required to assign roles to everyone in the club so each department has access to its specific meeting room.</em>
                              </p>
                          </div>

                          <!-- Department Specific -->
                          ${deptSpecificCardsHtml ? `
                            <div style="margin-top: 18px;">
                                <h3 style="color: #0F172A; font-size: 14px; font-weight: 800; margin: 0 0 4px 0; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">
                                    2. Department Tools & Channels
                                </h3>
                                ${deptSpecificCardsHtml}
                            </div>
                          ` : ''}

                      </td>
                  </tr>

                  <!-- WHAT'S NEXT -->
                  <tr>
                      <td style="padding: 20px 20px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;">
                          <h4 style="color: #0F172A; font-size: 13px; font-weight: 800; text-align: center; margin: 0 0 12px 0; letter-spacing: 0.5px; text-transform: uppercase;">Next Steps</h4>

                          <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 8px;">
                              <tr>
                                  <td valign="middle" style="padding: 10px 14px;">
                                      <p style="color: #0F172A; font-size: 12px; font-weight: 700; margin: 0 0 2px 0;">1. Connect on Telegram & Discord</p>
                                      <p style="color: #64748B; font-size: 11px; margin: 0; line-height: 15px;">Join the server to receive your club role and access your dedicated department meeting rooms.</p>
                                  </td>
                              </tr>
                          </table>

                          <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px;">
                              <tr>
                                  <td valign="middle" style="padding: 10px 14px;">
                                      <p style="color: #0F172A; font-size: 12px; font-weight: 700; margin: 0 0 2px 0;">2. First Onboarding Session</p>
                                      <p style="color: #64748B; font-size: 11px; margin: 0; line-height: 15px;">Meet your team lead and learn about the annual project roadmaps.</p>
                                  </td>
                              </tr>
                          </table>
                      </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                      <td bgcolor="#0F172A" style="padding: 20px 16px; background-color: #0F172A; text-align: center;">
                          <img src="${LOGO_URL}" alt="E.R.I.S.E. Footer Logo" width="90" style="margin: 0 auto 10px auto; width: 90px;" />
                          <p style="color: #E2E8F0; font-size: 11px; font-weight: 700; margin: 4px 0 0 0; line-height: 15px;">
                              Higher National School of Renewable Energies, Environment and Sustainable Development — Batna, Algeria
                          </p>
                          <p style="color: #64748B; font-size: 10px; margin: 10px 0 0 0; line-height: 14px;">
                              You received this transactional email because of your membership application with E.R.I.S.E. Scientific Club.<br/>
                              <a href="https://erise-scientific-club.site/contact" style="color: #38BDF8; text-decoration: underline;">Contact Club Administration</a>
                          </p>
                      </td>
                  </tr>

              </table>
          </td>
      </tr>
  </table>
  </body>
  </html>`;
}

function generateMeetingHtml(name: string, location: string, dateTime: string): string {
  const cleanName = escapeHtml(name);
  const cleanLoc = escapeHtml(location);
  const cleanDT = escapeHtml(dateTime);

  return `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml" lang="en" style="background-color: #1F2937;">
  <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style type="text/css">
          body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #1F2937; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          table { border-collapse: collapse; }
          img { border: 0; height: auto; outline: none; text-decoration: none; display: block; }
      </style>
  </head>
  <body bgcolor="#1F2937" style="margin: 0 !important; padding: 0 !important; background-color: #1F2937;">
  <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#1F2937">
      <tr>
          <td align="center" style="padding: 12px 0;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#1A2432" style="max-width: 480px; background-color: #1A2432; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
                  
                  <!-- HEADER LOGO -->
                  <tr>
                      <td bgcolor="#1A2432" style="padding: 24px 16px 16px 16px; background-color: #1A2432; text-align: center;">
                          <img src="${LOGO_URL}" alt="E.R.I.S.E. Logo" width="130" style="margin: 0 auto 10px auto; width: 130px; height: auto;" />
                          <h1 style="color: #FFFFFF; font-size: 18px; font-weight: 800; margin: 8px 0 0 0; letter-spacing: 1px;">E.R.I.S.E. Scientific Club</h1>
                          <p style="color: #9CA3AF; font-size: 12px; font-weight: 600; margin: 4px 0 0 0;">Recruitment Interview Invitation</p>
                      </td>
                  </tr>

                  <!-- HERO DESK MASCOT -->
                  <tr>
                      <td align="center" bgcolor="#1A2432" style="padding: 0; margin: 0; background-color: #1A2432; width: 100%;">
                          <img src="${MEETING_MASCOT_URL}" alt="E.R.I.S.E. Interview Session" width="100%" style="width: 100%; max-width: 480px; height: auto; display: block; margin: 0 auto;" />
                      </td>
                  </tr>

                  <!-- MEETING CARD -->
                  <tr>
                      <td bgcolor="#8CC9CA" style="padding: 24px 18px; background-color: #8CC9CA; border-radius: 0; text-align: center;">
                          
                          <span style="background-color: rgba(26,49,91,0.15); color: #1A315B; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">Interview Schedule</span>

                          <h2 style="color: #1A315B; font-size: 22px; font-weight: 800; margin: 12px 0 8px 0; line-height: 28px;">
                              You're Invited, ${cleanName}!
                          </h2>

                          <p style="color: #FFFFFF; font-size: 14px; line-height: 21px; margin: 0 0 16px 0; font-weight: 500;">
                              We reviewed your application and would love to meet you in person for a quick conversation!
                          </p>

                          <!-- DETAILS CONTAINER -->
                          <div style="background-color: #1A315B; border-radius: 12px; padding: 16px; margin: 16px 0; text-align: left;">
                              <p style="margin: 0 0 2px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #8CC9CA; font-weight: 700;">Date &amp; Time</p>
                              <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #FFFFFF;">${cleanDT}</p>

                              <p style="margin: 0 0 2px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #8CC9CA; font-weight: 700;">Location</p>
                              <p style="margin: 0; font-size: 15px; font-weight: 700; color: #FFFFFF;">${cleanLoc}</p>
                          </div>

                      </td>
                  </tr>

                  <!-- TIPS -->
                  <tr>
                      <td style="padding: 24px 16px 16px 16px; background-color: #FFFFFF;">
                          <h3 style="color: #1A315B; font-size: 15px; font-weight: 800; text-align: center; margin: 0 0 16px 0; letter-spacing: 0.5px; text-transform: uppercase;">Interview Tips</h3>

                          <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F8FCFC" style="background-color: #F8FCFC; border: 1px solid #E2F0F1; border-radius: 12px; margin-bottom: 10px;">
                              <tr>
                                  <td valign="middle" style="padding: 12px;">
                                      <h4 style="color: #1A315B; font-size: 13px; font-weight: 700; margin: 0 0 2px 0;">1. Be Punctual</h4>
                                      <p style="color: #556677; font-size: 11px; margin: 0; line-height: 15px;">Please arrive 5–10 minutes before your scheduled slot.</p>
                                  </td>
                              </tr>
                          </table>

                          <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F8FCFC" style="background-color: #F8FCFC; border: 1px solid #E2F0F1; border-radius: 12px;">
                              <tr>
                                  <td valign="middle" style="padding: 12px;">
                                      <h4 style="color: #1A315B; font-size: 13px; font-weight: 700; margin: 0 0 2px 0;">2. Share Your Passion</h4>
                                      <p style="color: #556677; font-size: 11px; margin: 0; line-height: 15px;">Tell us about your interests, technical projects, or skills!</p>
                                  </td>
                              </tr>
                          </table>
                      </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                      <td bgcolor="#1A2432" style="padding: 20px 16px; background-color: #1A2432; border-top: 1px solid #2D3748; text-align: center;">
                          <img src="${LOGO_URL}" alt="E.R.I.S.E. Footer Logo" width="100" style="margin: 0 auto 10px auto; width: 100px;" />
                          <p style="color: #E5E7EB; font-size: 11px; font-weight: 700; margin: 4px 0 0 0; line-height: 15px;">
                              Higher National School of Renewable Energies, Environment and Sustainable Development — Batna, Algeria
                          </p>
                          <p style="color: #6B7280; font-size: 10px; margin: 12px 0 0 0; line-height: 14px;">
                              You received this transactional notification regarding your interview schedule.<br/>
                              <a href="https://erise-scientific-club.site/contact" style="color: #8CC9CA; text-decoration: underline;">Manage notification preferences</a>
                          </p>
                      </td>
                  </tr>

              </table>
          </td>
      </tr>
  </table>
  </body>
  </html>`;
}

function generateEventInvitationHtml(teamOrName: string, eventTitle: string, location: string, dateTime: string, notes?: string): string {
  const cleanName = escapeHtml(teamOrName);
  const cleanTitle = escapeHtml(eventTitle);
  const cleanLoc = escapeHtml(location);
  const cleanDT = escapeHtml(dateTime);
  const cleanNotes = notes ? escapeHtml(notes) : null;

  return `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml" lang="en" style="background-color: #1F2937;">
  <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style type="text/css">
          body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #1F2937; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          table { border-collapse: collapse; }
          img { border: 0; height: auto; outline: none; text-decoration: none; display: block; }
      </style>
  </head>
  <body bgcolor="#1F2937" style="margin: 0 !important; padding: 0 !important; background-color: #1F2937;">
  <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#1F2937">
      <tr>
          <td align="center" style="padding: 12px 0;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#1A2432" style="max-width: 480px; background-color: #1A2432; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
                  
                  <!-- HEADER LOGO -->
                  <tr>
                      <td bgcolor="#1A2432" style="padding: 24px 16px 16px 16px; background-color: #1A2432; text-align: center;">
                          <img src="${LOGO_URL}" alt="E.R.I.S.E. Logo" width="130" style="margin: 0 auto 10px auto; width: 130px; height: auto;" />
                          <h1 style="color: #FFFFFF; font-size: 18px; font-weight: 800; margin: 8px 0 0 0; letter-spacing: 1px;">E.R.I.S.E. Scientific Club</h1>
                          <p style="color: #9CA3AF; font-size: 12px; font-weight: 600; margin: 4px 0 0 0;">Official Event Pass &amp; Invitation</p>
                      </td>
                  </tr>

                  <!-- HERO MASCOT -->
                  <tr>
                      <td align="center" bgcolor="#1A2432" style="padding: 0; margin: 0; background-color: #1A2432; width: 100%;">
                          <img src="${EVENT_MASCOT_URL}" alt="E.R.I.S.E. Event Session" width="100%" style="width: 100%; max-width: 480px; height: auto; display: block; margin: 0 auto;" />
                      </td>
                  </tr>

                  <!-- INVITATION & SELECTION CARD -->
                  <tr>
                      <td bgcolor="#8CC9CA" style="padding: 24px 18px; background-color: #8CC9CA; border-radius: 0; text-align: center;">
                          
                          <span style="background-color: rgba(26,49,91,0.15); color: #1A315B; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">Selection Pass Confirmed</span>

                          <h2 style="color: #1A315B; font-size: 22px; font-weight: 800; margin: 12px 0 8px 0; line-height: 28px;">
                              Congratulations, ${cleanName}!
                          </h2>

                          <p style="color: #FFFFFF; font-size: 14px; line-height: 21px; margin: 0 0 16px 0; font-weight: 500;">
                              You / your team have been officially <strong>selected &amp; invited</strong> to join <strong>${cleanTitle}</strong> organized by E.R.I.S.E. Scientific Club!
                          </p>

                          <!-- DETAILS CONTAINER -->
                          <div style="background-color: #1A315B; border-radius: 12px; padding: 16px; margin: 16px 0; text-align: left;">
                              <p style="margin: 0 0 2px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #8CC9CA; font-weight: 700;">Event Name</p>
                              <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #FFFFFF;">${cleanTitle}</p>

                              <p style="margin: 0 0 2px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #8CC9CA; font-weight: 700;">Date &amp; Time</p>
                              <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #FFFFFF;">${cleanDT}</p>

                              <p style="margin: 0 0 2px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #8CC9CA; font-weight: 700;">Venue / Location</p>
                              <p style="margin: 0; font-size: 15px; font-weight: 700; color: #FFFFFF;">${cleanLoc}</p>

                              ${cleanNotes ? `
                                <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(140,201,202,0.3);">
                                  <p style="margin: 0 0 2px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #8CC9CA; font-weight: 700;">Important Note</p>
                                  <p style="margin: 0; font-size: 13px; font-weight: 500; color: #E2F0F1;">${cleanNotes}</p>
                                </div>
                              ` : ''}
                          </div>

                      </td>
                  </tr>

                  <!-- GUIDELINES -->
                  <tr>
                      <td style="padding: 24px 16px 16px 16px; background-color: #FFFFFF;">
                          <h3 style="color: #1A315B; font-size: 15px; font-weight: 800; text-align: center; margin: 0 0 16px 0; letter-spacing: 0.5px; text-transform: uppercase;">Event Guidelines</h3>

                          <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F8FCFC" style="background-color: #F8FCFC; border: 1px solid #E2F0F1; border-radius: 12px; margin-bottom: 10px;">
                              <tr>
                                  <td valign="middle" style="padding: 12px;">
                                      <h4 style="color: #1A315B; font-size: 13px; font-weight: 700; margin: 0 0 2px 0;">1. Arrival &amp; Check-In</h4>
                                      <p style="color: #556677; font-size: 11px; margin: 0; line-height: 15px;">Please arrive 15 minutes before the scheduled time for check-in.</p>
                                  </td>
                              </tr>
                          </table>

                          <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F8FCFC" style="background-color: #F8FCFC; border: 1px solid #E2F0F1; border-radius: 12px;">
                              <tr>
                                  <td valign="middle" style="padding: 12px;">
                                      <h4 style="color: #1A315B; font-size: 13px; font-weight: 700; margin: 0 0 2px 0;">2. Student ID &amp; Preparation</h4>
                                      <p style="color: #556677; font-size: 11px; margin: 0; line-height: 15px;">Bring your student ID card and any required materials.</p>
                                  </td>
                              </tr>
                          </table>
                      </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                      <td bgcolor="#1A2432" style="padding: 20px 16px; background-color: #1A2432; border-top: 1px solid #2D3748; text-align: center;">
                          <img src="${LOGO_URL}" alt="E.R.I.S.E. Footer Logo" width="100" style="margin: 0 auto 10px auto; width: 100px;" />
                          <p style="color: #E5E7EB; font-size: 11px; font-weight: 700; margin: 4px 0 0 0; line-height: 15px;">
                              Higher National School of Renewable Energies, Environment and Sustainable Development — Batna, Algeria
                          </p>
                          <p style="color: #6B7280; font-size: 10px; margin: 12px 0 0 0; line-height: 14px;">
                              You received this event pass notification regarding your event registration.<br/>
                              <a href="https://erise-scientific-club.site/contact" style="color: #8CC9CA; text-decoration: underline;">Manage notification preferences</a>
                          </p>
                      </td>
                  </tr>

              </table>
          </td>
      </tr>
  </table>
  </body>
  </html>`;
}

// ==========================================
// 6. SERVERLESS API ROUTE HANDLER
// ==========================================
export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate Limiting
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many email requests. Please wait a bit.' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Resend API key is not configured' });
  }

  const { type, email, name, departments, location, dateTime, eventTitle, notes } = req.body || {};

  if (!email || !name || !type) {
    return res.status(400).json({ error: 'Missing required parameters (type, email, name)' });
  }

  let subject = '';
  let htmlContent = '';
  let textContent = '';

  if (type === 'acceptance') {
    subject = 'Welcome to E.R.I.S.E. Scientific Club!';
    htmlContent = generateAcceptanceHtml(name, departments);
    textContent = generateAcceptanceText(name, departments);
  } else if (type === 'meeting') {
    if (!location || !dateTime) {
      return res.status(400).json({ error: 'Meeting email requires location and dateTime' });
    }
    subject = 'Interview Invitation — E.R.I.S.E. Scientific Club';
    htmlContent = generateMeetingHtml(name, location, dateTime);
    textContent = generateMeetingText(name, location, dateTime);
  } else if (type === 'event_invitation' || type === 'event_acceptance') {
    if (!eventTitle || !location || !dateTime) {
      return res.status(400).json({ error: 'Event email requires eventTitle, location, and dateTime' });
    }
    subject = `Invitation & Selection Confirmed: ${eventTitle} — E.R.I.S.E. Scientific Club`;
    htmlContent = generateEventInvitationHtml(name, eventTitle, location, dateTime, notes);
    textContent = generateEventInvitationText(name, eventTitle, location, dateTime, notes);
  } else {
    return res.status(400).json({ error: 'Invalid email type' });
  }

  // Authentic Humanized Sender & Trusted Reply-To
  const SENDER_EMAIL = process.env.SENDER_EMAIL || 'E.R.I.S.E. Recruitment Team <recruitment@erise-scientific-club.site>';
  const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || 'erise.club@gmail.com';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        reply_to: REPLY_TO_EMAIL,
        to: [email],
        subject: subject,
        html: htmlContent,
        text: textContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API Error:', data);
      return res.status(response.status).json({ error: 'Failed to send email via Resend', details: data });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('Send Email Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
