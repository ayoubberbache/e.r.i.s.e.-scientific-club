// In-memory rate limiting map (IP -> timestamps array)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 emails per IP per 15 minutes

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
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  // 3. Payload Validation
  const { full_name, email, phone, study_year, specialization, departments } = req.body || {};

  if (!full_name || !email || !phone || !study_year) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (
    typeof full_name !== 'string' || full_name.length > 100 ||
    typeof email !== 'string' || email.length > 150 ||
    typeof phone !== 'string' || phone.length > 30 ||
    typeof study_year !== 'number' || study_year < 1 || study_year > 5
  ) {
    return res.status(400).json({ error: 'Invalid field length or format' });
  }

  // 4. Sanitize strings for email HTML rendering
  const cleanName = escapeHtml(full_name.trim());
  const cleanEmail = escapeHtml(email.trim());
  const cleanPhone = escapeHtml(phone.trim());
  const cleanSpec = specialization ? escapeHtml(String(specialization).trim()) : null;
  const cleanDepts = Array.isArray(departments) 
    ? departments.map(d => escapeHtml(String(d))).join(', ')
    : 'None selected';

  const specLine = cleanSpec
    ? `<tr><td style="padding:8px 16px;font-weight:600;color:#5a7a8a;width:140px;">Specialization</td><td style="padding:8px 16px;color:#0a1628;">${cleanSpec}</td></tr>`
    : '';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8fcfd;font-family:'Inter','Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d5c63 0%,#0a4a50 100%);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">🎓 New Club Registration</h1>
      <p style="margin:8px 0 0;color:#a0d8db;font-size:14px;">E.R.I.S.E. Scientific Club</p>
    </div>
    
    <!-- Body -->
    <div style="background:#ffffff;border:1px solid #e0f2f5;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
      <p style="margin:0 0 16px;color:#1e3a4d;font-size:15px;">A new student has registered to join the club:</p>
      
      <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #e0f2f5;">
        <tr style="background:#e8f7fa;">
          <td style="padding:12px 16px;font-weight:600;color:#5a7a8a;width:140px;">Full Name</td>
          <td style="padding:12px 16px;color:#0a1628;font-weight:700;font-size:16px;">${cleanName}</td>
        </tr>
        <tr>
          <td style="padding:8px 16px;font-weight:600;color:#5a7a8a;width:140px;">Email</td>
          <td style="padding:8px 16px;color:#0a1628;"><a href="mailto:${cleanEmail}" style="color:#0d5c63;">${cleanEmail}</a></td>
        </tr>
        <tr style="background:#f8fcfd;">
          <td style="padding:8px 16px;font-weight:600;color:#5a7a8a;width:140px;">Phone</td>
          <td style="padding:8px 16px;color:#0a1628;">${cleanPhone}</td>
        </tr>
        <tr>
          <td style="padding:8px 16px;font-weight:600;color:#5a7a8a;width:140px;">Study Year</td>
          <td style="padding:8px 16px;color:#0a1628;">Year ${study_year}</td>
        </tr>
        ${specLine}
        <tr style="background:#f8fcfd;">
          <td style="padding:8px 16px;font-weight:600;color:#5a7a8a;width:140px;">Departments</td>
          <td style="padding:8px 16px;color:#0a1628;">${cleanDepts}</td>
        </tr>
        <tr>
          <td style="padding:8px 16px;font-weight:600;color:#5a7a8a;width:140px;">Registered At</td>
          <td style="padding:8px 16px;color:#0a1628;">${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Algiers', dateStyle: 'full', timeStyle: 'short' })}</td>
        </tr>
      </table>

      <div style="margin-top:24px;padding:16px;background:#e8f7fa;border-radius:12px;text-align:center;">
        <p style="margin:0;color:#0d5c63;font-size:13px;">You can manage all registrations from the <strong>Admin Dashboard</strong>.</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0 0;">
      <p style="margin:0;color:#5a7a8a;font-size:12px;">© ${new Date().getFullYear()} E.R.I.S.E. Scientific Club — Batna, Algeria</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'E.R.I.S.E. Club <onboarding@resend.dev>',
        to: ['ayoubberbache79@gmail.com'],
        subject: `🎓 New Registration: ${cleanName} — Year ${study_year}`,
        html: htmlContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return res.status(response.status).json({ error: 'Failed to send email', details: data });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('Email sending error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
