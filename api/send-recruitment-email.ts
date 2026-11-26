import { z } from 'zod';
import { getAdminClient } from './_lib/supabaseAdmin.js';
import { applySecurityCors, logAuditEvent, verifyAdminAuth } from './_lib/auth.js';
import {
  getGoogleConfigStatus,
  listSentGmailMessages,
  sendGmailAsErise,
} from './_lib/googleWorkspace.js';
import { EmailBlock, renderEmailFromBlocks } from './_lib/emailRenderer.js';

const RecipientSchema = z.object({
  id: z.union([z.number().int(), z.string()]).optional(),
  email: z.string().email(),
  name: z.string().max(180).optional(),
  departments: z.any().optional(),
});

const SendEmailSchema = z.object({
  emailType: z.string().max(80).optional(),
  type: z.string().max(80).optional(),
  toEmail: z.string().email().optional(),
  fullName: z.string().max(180).optional(),
  department: z.string().max(120).optional(),
  departments: z.any().optional(),
  registrationId: z.union([z.number().int(), z.string()]).optional(),
  templateId: z.string().max(120).optional(),
  recipients: z.array(RecipientSchema).max(60).optional(),
  customSubject: z.string().max(240).optional(),
  customMessage: z.string().max(10000).optional(),
  interviewDate: z.string().max(120).optional(),
  interviewTime: z.string().max(120).optional(),
  dateTime: z.string().max(160).optional(),
  location: z.string().max(200).optional(),
  interviewLocation: z.string().max(200).optional(),
  eventTitle: z.string().max(200).optional(),
  eventDateTime: z.string().max(200).optional(),
  eventLocation: z.string().max(200).optional(),
  eventNotes: z.string().max(3000).optional(),
  notes: z.string().max(3000).optional(),
});

async function sendViaResendFallback(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ id: string; provider: 'resend' }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Neither Google Workspace Gmail API (erise.club@hns-re2sd.dz) nor RESEND_API_KEY is configured.');
  }

  const fromEmail = process.env.SENDER_EMAIL || 'E.R.I.S.E. Scientific Club <recruitment@erise-scientific-club.site>';
  const replyTo = process.env.REPLY_TO_EMAIL || 'erise.club@hns-re2sd.dz';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [params.to],
      reply_to: replyTo,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Resend HTTP ${res.status}`);
  return { id: data.id || `resend_${Date.now()}`, provider: 'resend' };
}

async function sendWithPrimaryProvider(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ id: string; provider: 'gmail' | 'resend'; sender: string }> {
  const googleStatus = getGoogleConfigStatus();
  if (googleStatus.gmailConfigured) {
    const result = await sendGmailAsErise(params);
    return { id: result.id, provider: 'gmail', sender: result.sender };
  }

  const resendRes = await sendViaResendFallback(params);
  return {
    id: resendRes.id,
    provider: 'resend',
    sender: process.env.SENDER_EMAIL || 'onboarding@resend.dev',
  };
}

function buildBuiltinEmail(params: {
  emailType: string;
  fullName: string;
  department: string;
  customSubject?: string;
  customMessage?: string;
  dateTime?: string;
  location?: string;
  eventTitle?: string;
  eventNotes?: string;
}): { subject: string; blocks: EmailBlock[]; variables: Record<string, string> } {
  const waLink = 'https://chat.whatsapp.com/I8vT4H3E27w3aM0V3kQ7wO';
  const variables: Record<string, string> = {
    name: params.fullName || 'Member',
    fullName: params.fullName || 'Member',
    department: params.department || 'General',
    departments: params.department || 'General',
    eventTitle: params.eventTitle || 'E.R.I.S.E. Club Activity',
    dateTime: params.dateTime || 'TBA',
    location: params.location || 'HNSRE Campus, Batna',
    notes: params.eventNotes || params.customMessage || '',
    customMessage: params.customMessage || '',
  };

  const normType = params.emailType === 'meeting' ? 'interview_invite' : params.emailType;

  if (normType === 'interview_invite') {
    return {
      subject: params.customSubject || `E.R.I.S.E. Scientific Club — Interview Invitation ({{department}})`,
      variables,
      blocks: [
        { id: 'b1', type: 'heading', text: 'Interview Invitation — {{department}}', color: '#0d5c63' },
        { id: 'b2', type: 'paragraph', text: 'Dear {{name}},\n\nThank you for applying to E.R.I.S.E. Scientific Club. We would like to invite you for an interview.' },
        { id: 'b3', type: 'event_card', title: 'Interview Schedule', showDateTime: true, showLocation: true, showNotes: true },
      ],
    };
  }

  if (normType === 'accepted' || normType === 'acceptance' || normType === 'welcome_member') {
    return {
      subject: params.customSubject || `Welcome to E.R.I.S.E. Scientific Club ({{department}})`,
      variables,
      blocks: [
        { id: 'b1', type: 'heading', text: 'Welcome to E.R.I.S.E. Scientific Club!', color: '#0d5c63' },
        { id: 'b2', type: 'paragraph', text: 'Congratulations {{name}}!\n\nYour application to the {{department}} Department at E.R.I.S.E. Scientific Club has been officially accepted.' },
        { id: 'b3', type: 'button', text: 'Join Club Community', url: waLink, align: 'center' },
      ],
    };
  }

  if (normType === 'rejected' || normType === 'interview_rejected') {
    return {
      subject: params.customSubject || 'E.R.I.S.E. Scientific Club — Application Update',
      variables,
      blocks: [
        { id: 'b1', type: 'heading', text: 'Application Update', color: '#0d5c63' },
        { id: 'b2', type: 'paragraph', text: 'Dear {{name}},\n\nThank you for applying to E.R.I.S.E. Scientific Club. We are unable to offer a spot in {{department}} this cycle, and we encourage you to join our upcoming public workshops.' },
      ],
    };
  }

  return {
    subject: params.customSubject || `E.R.I.S.E. Scientific Club — {{eventTitle}}`,
    variables,
    blocks: [
      { id: 'b1', type: 'heading', text: '{{eventTitle}}', color: '#0d5c63' },
      { id: 'b2', type: 'paragraph', text: 'Hello {{name}},\n\n{{customMessage}}' },
      { id: 'b3', type: 'event_card', title: 'Session Information', showDateTime: true, showLocation: true, showNotes: true },
    ],
  };
}

export default async function handler(req: any, res: any) {
  applySecurityCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = verifyAdminAuth(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: valid signed admin session required' });
  }

  const parsed = SendEmailSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
  }

  const input = parsed.data;
  const effectiveType = input.emailType || input.type || 'acceptance';
  const supabase = getAdminClient();

  try {
    if (effectiveType === 'get_logs') {
      const { data: settingsRow } = await supabase
        .from('club_settings')
        .select('value')
        .eq('key', 'email_logs')
        .maybeSingle();

      return res.status(200).json({
        success: true,
        logs: Array.isArray(settingsRow?.value) ? settingsRow.value : [],
        googleStatus: getGoogleConfigStatus(),
      });
    }

    if (effectiveType === 'sync_resend' || effectiveType === 'sync_gmail') {
      const googleStatus = getGoogleConfigStatus();
      if (!googleStatus.gmailConfigured) {
        return res.status(200).json({ success: true, synced: 0, message: 'Gmail API not configured yet' });
      }
      const gmailLogs = await listSentGmailMessages(50);
      return res.status(200).json({ success: true, synced: gmailLogs.length, logs: gmailLogs });
    }

    const targets: Array<{ id?: number | string; email: string; name: string; dept: string }> =
      Array.isArray(input.recipients) && input.recipients.length > 0
        ? input.recipients.map(r => ({
            id: r.id,
            email: r.email.trim().toLowerCase(),
            name: r.name || 'Member',
            dept: Array.isArray(r.departments)
              ? r.departments.join(', ')
              : String(r.departments || input.department || 'General'),
          }))
        : input.toEmail
          ? [{
              id: input.registrationId,
              email: input.toEmail.trim().toLowerCase(),
              name: input.fullName || 'Member',
              dept: Array.isArray(input.departments)
                ? input.departments.join(', ')
                : (input.department || 'General'),
            }]
          : [];

    if (targets.length === 0) {
      return res.status(400).json({ error: 'At least one recipient email is required' });
    }

    let tpl: any = null;
    if (input.templateId) {
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', input.templateId)
        .maybeSingle();
      tpl = data;
    }

    const results: any[] = [];
    const { data: settingsRow } = await supabase
      .from('club_settings')
      .select('value')
      .eq('key', 'email_logs')
      .maybeSingle();
    const prevLogs: any[] = Array.isArray(settingsRow?.value) ? settingsRow.value : [];
    const newLogs: any[] = [];

    for (const target of targets) {
      const combinedDateTime =
        input.dateTime ||
        input.eventDateTime ||
        [input.interviewDate, input.interviewTime].filter(Boolean).join(' ') ||
        'TBA';
      const combinedLocation = input.location || input.eventLocation || input.interviewLocation || 'HNSRE Campus, Batna';
      const combinedNotes = input.notes || input.eventNotes || input.customMessage || '';

      let rendered;
      if (tpl) {
        rendered = renderEmailFromBlocks({
          subject: input.customSubject || tpl.subject,
          blocks: Array.isArray(tpl.blocks) ? tpl.blocks : [],
          themeConfig: tpl.theme_config || {},
          variables: {
            name: target.name,
            fullName: target.name,
            department: target.dept,
            departments: target.dept,
            eventTitle: input.eventTitle || tpl.name || 'E.R.I.S.E. Event',
            dateTime: combinedDateTime,
            location: combinedLocation,
            notes: combinedNotes,
          },
        });
      } else {
        const builtin = buildBuiltinEmail({
          emailType: effectiveType,
          fullName: target.name,
          department: target.dept,
          customSubject: input.customSubject,
          customMessage: input.customMessage,
          dateTime: combinedDateTime,
          location: combinedLocation,
          eventTitle: input.eventTitle,
          eventNotes: combinedNotes,
        });
        rendered = renderEmailFromBlocks({
          subject: builtin.subject,
          blocks: builtin.blocks,
          variables: builtin.variables,
        });
      }

      const sendRes = await sendWithPrimaryProvider({
        to: target.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      if (target.id !== undefined && target.id !== '') {
        const regUpdates: Record<string, any> = {};
        if (effectiveType === 'meeting' || effectiveType === 'interview_invite') {
          regUpdates.meeting_email_sent = true;
          regUpdates.meeting_email_sent_at = new Date().toISOString();
          regUpdates.interview_status = 'invited';
        } else if (effectiveType === 'acceptance' || effectiveType === 'accepted' || effectiveType === 'welcome_member') {
          regUpdates.status = 'approved';
          regUpdates.acceptance_email_sent = true;
          regUpdates.acceptance_email_sent_at = new Date().toISOString();
          regUpdates.interview_status = 'passed';
        } else if (effectiveType === 'rejected' || effectiveType === 'interview_rejected') {
          regUpdates.status = 'rejected';
          regUpdates.interview_status = 'rejected';
        }
        if (Object.keys(regUpdates).length > 0) {
          await supabase.from('registrations').update(regUpdates).eq('id', target.id);
        }
      }

      const logEntry = {
        id: sendRes.id,
        to: target.email,
        fullName: target.name,
        subject: rendered.subject,
        emailType: effectiveType,
        templateId: input.templateId || null,
        provider: sendRes.provider,
        sender: sendRes.sender,
        sentBy: session.user.username,
        status: 'sent',
        created_at: new Date().toISOString(),
      };
      newLogs.push(logEntry);
      results.push({ email: target.email, id: sendRes.id, provider: sendRes.provider });
    }

    await supabase
      .from('club_settings')
      .upsert({ key: 'email_logs', value: [...newLogs, ...prevLogs].slice(0, 250) }, { onConflict: 'key' });

    await logAuditEvent(supabase, session, `send_email_${effectiveType}`, 'email_logs', undefined, {
      count: results.length,
    });

    return res.status(200).json({
      success: true,
      sent: results.length,
      results,
    });
  } catch (err: any) {
    console.error('[api/send-recruitment-email]', err);
    return res.status(500).json({ error: err?.message || 'Failed to send email' });
  }
}
