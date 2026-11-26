import { z } from 'zod';
import { applySecurityCors } from './_lib/auth.js';
import { appendRowToSheet, getGoogleConfigStatus, sendGmailAsErise } from './_lib/googleWorkspace.js';
import { renderEmailFromBlocks } from './_lib/emailRenderer.js';

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const valid = (rateLimitMap.get(ip) || []).filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  if (valid.length >= MAX_REQUESTS_PER_WINDOW) return true;
  valid.push(now);
  rateLimitMap.set(ip, valid);
  return false;
}

const BodySchema = z.object({
  full_name: z.string().max(180).optional(),
  fullName: z.string().max(180).optional(),
  name: z.string().max(180).optional(),
  email: z.string().email().optional(),
  student_id: z.string().max(60).optional(),
  studentId: z.string().max(60).optional(),
  edu_number: z.string().max(60).optional(),
  phone: z.string().max(40).optional(),
  study_year: z.string().max(80).optional(),
  study_year_label: z.string().max(120).optional(),
  branch: z.string().max(80).nullable().optional(),
  specialization: z.string().max(160).nullable().optional(),
  departments: z.union([z.array(z.string()), z.string()]).optional(),
  department: z.string().max(120).optional(),
  eventTitle: z.string().max(240).optional(),
  isEvent: z.boolean().optional(),
});

export default async function handler(req: any, res: any) {
  applySecurityCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const parsed = BodySchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid registration notification payload' });
  }

  const b = parsed.data;
  const fullName = (b.full_name || b.fullName || b.name || '').trim();
  const email = (b.email || '').trim().toLowerCase();
  const phone = (b.phone || 'Not provided').trim();
  const studentId = (b.student_id || b.studentId || b.edu_number || 'N/A').trim();
  const studyYear = (b.study_year_label || b.study_year || 'N/A').trim();
  const specialty = (b.specialization || b.branch || 'N/A').trim();
  const deptsText = Array.isArray(b.departments)
    ? b.departments.join(', ')
    : (b.departments || b.department || 'General');
  const isEvent = Boolean(b.isEvent || b.eventTitle);
  const adminEmail = process.env.ADMIN_EMAIL || 'erise.club@hns-re2sd.dz';

  if (!fullName || !email) {
    return res.status(400).json({ error: 'Missing required fullName or email' });
  }

  const userMail = renderEmailFromBlocks({
    subject: isEvent
      ? `E.R.I.S.E. Club — Registration Received (${b.eventTitle})`
      : `E.R.I.S.E. Club — Membership Application Received`,
    blocks: [
      {
        id: 'uh1',
        type: 'heading',
        text: isEvent ? 'Event Registration Confirmation' : 'Application Received!',
        color: '#0d5c63',
      },
      {
        id: 'up1',
        type: 'paragraph',
        text: isEvent
          ? 'Hello {{fullName}},\n\nThank you for registering for {{eventTitle}}. Our team has logged your entry and will follow up with session updates.'
          : 'Hello {{fullName}},\n\nYour membership application to E.R.I.S.E. Scientific Club ({{department}}) has been received. Our HR & department board will review your profile and notify you about interview scheduling.',
      },
      {
        id: 'uc1',
        type: 'event_card',
        title: 'Submitted Details',
        showDateTime: true,
        showLocation: true,
        showNotes: true,
      },
    ],
    variables: {
      fullName,
      department: deptsText,
      eventTitle: b.eventTitle || `Club Membership (${deptsText})`,
      dateTime: new Date().toLocaleDateString('en-GB', { dateStyle: 'medium' }),
      location: 'HNSRE Campus, Batna',
      notes: `Student ID: ${studentId} | Year: ${studyYear} | Specialty: ${specialty}`,
    },
  });

  const adminMail = renderEmailFromBlocks({
    subject: isEvent
      ? `[Event Registration] ${fullName} — ${b.eventTitle}`
      : `[Club Recruitment] ${fullName} (${deptsText})`,
    blocks: [
      { id: 'ah1', type: 'heading', text: isEvent ? 'New Event Registration' : 'New Recruitment Application', color: '#0d5c63' },
      {
        id: 'ap1',
        type: 'paragraph',
        text: `Name: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nStudent ID: ${studentId}\nYear: ${studyYear}\nSpecialty: ${specialty}\nDepartments / Event: ${isEvent ? b.eventTitle : deptsText}`,
      },
    ],
    variables: { fullName, department: deptsText },
  });

  const warnings: string[] = [];

  try {
    const googleStatus = getGoogleConfigStatus();

    if (googleStatus.gmailConfigured) {
      await sendGmailAsErise({
        to: email,
        subject: userMail.subject,
        html: userMail.html,
        text: userMail.text,
      }).catch(e => warnings.push(`Applicant email skipped: ${e.message}`));

      await sendGmailAsErise({
        to: adminEmail,
        subject: adminMail.subject,
        html: adminMail.html,
        text: adminMail.text,
        replyTo: email,
      }).catch(e => warnings.push(`Admin email skipped: ${e.message}`));
    } else if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.SENDER_EMAIL || 'E.R.I.S.E. Scientific Club <recruitment@erise-scientific-club.site>',
          to: [email],
          reply_to: adminEmail,
          subject: userMail.subject,
          html: userMail.html,
          text: userMail.text,
        }),
      }).catch(e => warnings.push(`Resend skipped: ${e.message}`));
    }

    if (!isEvent && googleStatus.sheetsConfigured) {
      await appendRowToSheet(
        'Club_Recruitment',
        ['Timestamp', 'Full Name', 'Email', 'Phone', 'Student ID', 'Study Year', 'Specialty', 'Departments', 'Status'],
        [new Date().toISOString(), fullName, email, phone, studentId, studyYear, specialty, deptsText, 'pending']
      ).catch(e => warnings.push(`Sheet append skipped: ${e.message}`));
    }

    return res.status(200).json({ success: true, warnings });
  } catch (err: any) {
    console.error('[api/send-registration-email]', err);
    return res.status(500).json({ error: err?.message || 'Notification error' });
  }
}
