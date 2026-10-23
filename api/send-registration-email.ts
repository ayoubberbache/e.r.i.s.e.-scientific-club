// In-memory rate limiting map (IP -> timestamps array)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const MAX_REQUESTS_PER_WINDOW = 10; // Up to 10 emails per IP per 15 minutes

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

// Escape HTML characters to prevent HTML injection in emails
function escapeHtml(unsafe: any): string {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(req: any, res: any) {
  // 1. CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. DDoS & Spam Protection — IP Rate Limiting
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set in environment. Skipping email sending in local dev.');
    return res.status(200).json({ 
      success: true, 
      warning: 'Email notification skipped: RESEND_API_KEY is not set.' 
    });
  }

  // 3. Flexible Payload Extraction (Supports both snake_case and camelCase)
  const body = req.body || {};
  const full_name = body.full_name || body.fullName || body.name || '';
  const student_id = body.student_id || body.studentId || body.edu_number || body.eduNumber || 'N/A';
  const email = body.email || '';
  const phone = body.phone || body.phoneNumber || 'Not provided';
  const study_year = body.study_year || body.studyYear || 'N/A';
  const study_year_label = body.study_year_label || body.studyYearLabel || null;
  const branch = body.branch || null;
  const specialization = body.specialization || null;
  const departments = body.departments || body.department || [];
  const eventTitle = body.eventTitle || body.event_title || '';
  const isEvent = Boolean(body.isEvent || eventTitle);

  if (!full_name && !email) {
    return res.status(400).json({ error: 'Missing required full name or email' });
  }

  // 4. Sanitize strings for email HTML rendering
  const cleanName = escapeHtml(String(full_name).trim() || 'Applicant');
  const cleanStudentId = escapeHtml(String(student_id).trim() || 'Not specified');
  const cleanEmail = escapeHtml(String(email).trim());
  const cleanPhone = escapeHtml(String(phone).trim());
  const cleanSpec = specialization ? escapeHtml(String(specialization).trim()) : null;
  const cleanEvent = escapeHtml(String(eventTitle).trim());
  
  const cleanDepts = Array.isArray(departments) 
    ? departments.map(d => escapeHtml(String(d))).join(', ')
    : typeof departments === 'string'
      ? escapeHtml(departments)
      : 'None selected';

  const specLine = cleanSpec
    ? `<tr><td style="padding:10px 16px;font-weight:600;color:#5a7a8a;width:150px;">Specialization</td><td style="padding:10px 16px;color:#0a1628;">${cleanSpec}</td></tr>`
    : '';

  const subjectTitle = isEvent
    ? `🎯 Event Registration: ${cleanName} — ${cleanEvent || 'Club Event'}`
    : `🎓 New Club Registration: ${cleanName} (ID: ${cleanStudentId}) — Year ${study_year}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4fafc;font-family:'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d5c63 0%,#08383c 100%);border-radius:16px 16px 0 0;padding:32px 24px;text-align:center;">
      <span style="display:inline-block;background:rgba(0,229,255,0.15);color:#5ef0ff;border:1px solid rgba(0,229,255,0.3);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 12px;border-radius:20px;margin-bottom:12px;">
        ${isEvent ? 'Event Registration' : 'New Intake Registration'}
      </span>
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">
        ${isEvent ? '🎯 New Event Registration' : '🎓 New Club Member Registration'}
      </h1>
      <p style="margin:8px 0 0;color:#a0d8db;font-size:13px;">
        Engineers for Renewable Energy, Innovation & Environmental Sustainability
      </p>
    </div>
    
    <!-- Body -->
    <div style="background:#ffffff;border:1px solid #d4ebf0;border-top:none;border-radius:0 0 16px 16px;padding:28px 24px;box-shadow:0 8px 24px rgba(13,92,99,0.06);">
      <p style="margin:0 0 18px;color:#1e3a4d;font-size:15px;line-height:1.5;">
        A student has submitted an application on the E.R.I.S.E. website:
      </p>
      
      <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #e0f2f5;">
        <tr style="background:#e8f7fa;">
          <td style="padding:12px 16px;font-weight:600;color:#5a7a8a;width:150px;">Full Name</td>
          <td style="padding:12px 16px;color:#0a1628;font-weight:800;font-size:16px;">${cleanName}</td>
        </tr>
        ${cleanStudentId !== 'N/A' && cleanStudentId !== 'Not specified' ? `
        <tr style="background:#f0fafc;">
          <td style="padding:10px 16px;font-weight:600;color:#0d5c63;width:150px;">Student Edu Number</td>
          <td style="padding:10px 16px;color:#0d5c63;font-weight:800;font-size:15px;font-family:monospace;letter-spacing:1px;">
            ${cleanStudentId} (12 Digits)
          </td>
        </tr>` : ''}
        <tr>
          <td style="padding:10px 16px;font-weight:600;color:#5a7a8a;width:150px;">Email</td>
          <td style="padding:10px 16px;color:#0a1628;"><a href="mailto:${cleanEmail}" style="color:#0d5c63;font-weight:600;text-decoration:none;">${cleanEmail}</a></td>
        </tr>
        <tr style="background:#fbfdfe;">
          <td style="padding:10px 16px;font-weight:600;color:#5a7a8a;width:150px;">Phone Number</td>
          <td style="padding:10px 16px;color:#0a1628;"><a href="tel:${cleanPhone}" style="color:#0a1628;text-decoration:none;font-weight:600;">${cleanPhone}</a></td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-weight:600;color:#5a7a8a;width:150px;">Year of Study</td>
          <td style="padding:10px 16px;color:#0a1628;font-weight:600;">
            ${study_year_label ? escapeHtml(String(study_year_label)) : (study_year !== 'N/A' ? `Year ${study_year}` : 'Not provided')}
            ${branch ? ` <span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#e0f2f5;color:#0d5c63;font-size:12px;font-weight:bold;margin-left:6px;">${escapeHtml(String(branch))}</span>` : ''}
          </td>
        </tr>
        ${specLine}
        ${isEvent && cleanEvent ? `
        <tr style="background:#e8f7fa;">
          <td style="padding:10px 16px;font-weight:600;color:#5a7a8a;width:150px;">Event Title</td>
          <td style="padding:10px 16px;color:#0d5c63;font-weight:700;">${cleanEvent}</td>
        </tr>` : ''}
        <tr style="background:#fbfdfe;">
          <td style="padding:10px 16px;font-weight:600;color:#5a7a8a;width:150px;">Departments</td>
          <td style="padding:10px 16px;color:#0a1628;font-weight:600;">${cleanDepts}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-weight:600;color:#5a7a8a;width:150px;">Submission Time</td>
          <td style="padding:10px 16px;color:#5a7a8a;font-size:13px;">${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Algiers', dateStyle: 'full', timeStyle: 'short' })} (Algeria)</td>
        </tr>
      </table>

      <!-- Admin Action CTA -->
      <div style="margin-top:26px;padding:20px;background:#e8f7fa;border-radius:12px;text-align:center;">
        <p style="margin:0 0 12px;color:#0d5c63;font-size:14px;font-weight:600;">
          Review this application and manage candidates in the Admin Dashboard:
        </p>
        <a href="https://erise-scientific-club.site/admin" style="display:inline-block;background:#0d5c63;color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:13px;">
          Open Admin Dashboard →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px 0 0;">
      <p style="margin:0;color:#5a7a8a;font-size:12px;">
        © ${new Date().getFullYear()} E.R.I.S.E. Scientific Club — Higher National School of Renewable Energies, Batna
      </p>
    </div>
  </div>
</body>
</html>`;

  const ADMIN_RECIPIENT = process.env.ADMIN_NOTIFICATION_EMAIL || 'ayoubberbache79@gmail.com';
  const customSender = process.env.SENDER_EMAIL || 'E.R.I.S.E. Scientific Club <recruitment@erise-scientific-club.site>';
  const fallbackSender = 'E.R.I.S.E. Club <onboarding@resend.dev>';

  // Helper function to send email with a given sender
  async function attemptSend(senderAddress: string) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderAddress,
        to: [ADMIN_RECIPIENT],
        reply_to: cleanEmail || undefined,
        subject: subjectTitle,
        html: htmlContent,
      }),
    });
    const resData = await res.json();
    return { ok: res.ok, status: res.status, data: resData };
  }

  try {
    // 1. Try sending with the configured custom sender (domain verified)
    let sendResult = await attemptSend(customSender);

    // 2. If rejected due to domain verification or sender restriction, fallback automatically to onboarding@resend.dev
    if (!sendResult.ok) {
      console.warn(`Primary sender (${customSender}) returned error:`, sendResult.data, 'Retrying with fallback onboarding sender...');
      sendResult = await attemptSend(fallbackSender);
    }

    if (!sendResult.ok) {
      console.error('All Resend sender attempts failed:', sendResult.data);
      return res.status(sendResult.status || 500).json({ 
        error: 'Failed to send notification email', 
        details: sendResult.data 
      });
    }

    return res.status(200).json({ success: true, id: sendResult.data.id });
  } catch (error: any) {
    console.error('Resend delivery exception:', error);
    return res.status(500).json({ error: 'Internal server error while sending email', message: error.message });
  }
}
