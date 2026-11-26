import { z } from 'zod';
import { getAdminClient } from './_lib/supabaseAdmin.js';
import { applySecurityCors } from './_lib/auth.js';
import { appendRowToSheet, getGoogleConfigStatus, sendGmailAsErise } from './_lib/googleWorkspace.js';
import { renderEmailFromBlocks } from './_lib/emailRenderer.js';

const MemberPayloadSchema = z.object({
  is_leader: z.boolean().optional().default(true),
  full_name: z.string().min(2).max(160),
  email: z.string().email(),
  phone: z.string().min(6).max(40),
});

const LegacyPayloadSchema = z.object({
  regPayload: z.object({
    event_id: z.union([z.number().int().positive(), z.string().min(1)]),
    registration_type: z.string().max(40).optional().default('individual'),
    team_name: z.string().max(160).nullable().optional(),
    institution: z.string().max(240).nullable().optional(),
    study_year: z.string().max(120).nullable().optional(),
    has_companion: z.boolean().optional().default(false),
    companion_name: z.string().max(160).nullable().optional(),
    companion_role: z.string().max(120).nullable().optional(),
    status: z.string().max(40).optional().default('pending'),
  }),
  memberPayloads: z.array(MemberPayloadSchema).min(1).max(12),
});

export default async function handler(req: any, res: any) {
  applySecurityCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const parsed = LegacyPayloadSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid event registration payload', details: parsed.error.flatten() });
  }

  const { regPayload, memberPayloads } = parsed.data;
  const supabase = getAdminClient();

  try {
    const eventIdNum = Number(regPayload.event_id);
    if (!Number.isFinite(eventIdNum) || eventIdNum <= 0) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    const { data: eventRow, error: eventErr } = await supabase
      .from('events')
      .select('id, title, date, time, location, registration_enabled, event_category, email_template_id')
      .eq('id', eventIdNum)
      .maybeSingle();

    if (eventErr) {
      console.error('[api/submit-event-registration] events lookup error:', eventErr);
      return res.status(500).json({ error: eventErr.message || 'Database error loading event' });
    }
    if (!eventRow) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (eventRow.registration_enabled === false) {
      return res.status(403).json({ error: 'Registration for this event is closed' });
    }

    // Check duplicate email for this event
    const leader = memberPayloads.find(m => m.is_leader) || memberPayloads[0];
    const { data: existingRegs } = await supabase
      .from('event_registrations')
      .select('id, event_registration_members!inner(email)')
      .eq('event_id', eventRow.id);

    const normalizedLeaderEmail = leader.email.trim().toLowerCase();
    const alreadyRegistered = (existingRegs || []).some((r: any) =>
      Array.isArray(r.event_registration_members) &&
      r.event_registration_members.some((m: any) => String(m.email || '').toLowerCase() === normalizedLeaderEmail)
    );

    if (alreadyRegistered) {
      return res.status(409).json({ error: 'This email is already registered for this event' });
    }

    const { data: regData, error: regError } = await supabase
      .from('event_registrations')
      .insert([{
        event_id: eventRow.id,
        registration_type: regPayload.registration_type || 'individual',
        team_name: regPayload.team_name || null,
        institution: regPayload.institution || null,
        study_year: regPayload.study_year || null,
        has_companion: Boolean(regPayload.has_companion),
        companion_name: regPayload.companion_name || null,
        companion_role: regPayload.companion_role || null,
        status: 'pending',
      }])
      .select('id')
      .single();

    if (regError) throw regError;

    const registrationId = regData.id;
    const finalMembers = memberPayloads.map(m => ({
      registration_id: registrationId,
      is_leader: m.is_leader,
      full_name: m.full_name.trim(),
      email: m.email.trim().toLowerCase(),
      phone: m.phone.trim(),
    }));

    const { error: membersError } = await supabase
      .from('event_registration_members')
      .insert(finalMembers);

    if (membersError) throw membersError;

    // Send branded confirmation email using event's linked template (if any) via erise.club@hns-re2sd.dz
    let emailSent = false;
    const googleStatus = getGoogleConfigStatus();
    let rendered;

    if (eventRow.email_template_id) {
      const { data: tpl } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', eventRow.email_template_id)
        .maybeSingle();

      if (tpl) {
        const tplDetails = (tpl.theme_config as any)?.eventDetails || {};
        const tplDateTime = [tplDetails.day, tplDetails.time].filter(Boolean).join(', ');
        rendered = renderEmailFromBlocks({
          subject: tpl.subject,
          blocks: Array.isArray(tpl.blocks) ? tpl.blocks : [],
          themeConfig: tpl.theme_config || {},
          variables: {
            name: leader.full_name,
            fullName: leader.full_name,
            eventTitle: eventRow.title || tplDetails.eventTitle,
            dateTime: eventRow.date || tplDateTime || 'TBA',
            location: eventRow.location || tplDetails.place || 'HNSRE Campus, Batna',
            notes: tplDetails.notes || (regPayload.team_name ? `Reference: ${regPayload.team_name}` : ''),
          },
        });
      }
    }

    if (!rendered) {
      rendered = renderEmailFromBlocks({
        subject: `Registration Received — ${eventRow.title}`,
        blocks: [
          { id: 'eh1', type: 'heading', text: 'Registration Received!', color: '#0d5c63' },
          {
            id: 'ep1',
            type: 'paragraph',
            text: 'Hello {{fullName}},\n\nThank you for registering for {{eventTitle}}. Here is your registration summary:',
          },
          { id: 'ec1', type: 'event_card', title: 'Event Summary', showDateTime: true, showLocation: true, showNotes: true },
        ],
        variables: {
          fullName: leader.full_name,
          eventTitle: eventRow.title,
          dateTime: eventRow.date || 'TBA',
          location: eventRow.location || 'HNSRE Campus, Batna',
          notes: regPayload.team_name ? `Team / Student ID: ${regPayload.team_name}` : '',
        },
      });
    }

    if (googleStatus.gmailConfigured) {
      await sendGmailAsErise({
        to: normalizedLeaderEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      }).then(() => { emailSent = true; }).catch(err => console.error('Event email send warning:', err));
    } else if (process.env.RESEND_API_KEY) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.SENDER_EMAIL || 'E.R.I.S.E. Scientific Club <recruitment@erise-scientific-club.site>',
          to: [normalizedLeaderEmail],
          reply_to: process.env.REPLY_TO_EMAIL || 'erise.club@hns-re2sd.dz',
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        }),
      });
      emailSent = r.ok;
    }

    if (googleStatus.sheetsConfigured) {
      await appendRowToSheet(
        'Event_Registrations',
        ['Timestamp', 'Registration ID', 'Event', 'Type', 'Team / Ref', 'Leader Name', 'Leader Email', 'Phone', 'Institution', 'Study Year', 'Members Count', 'Status'],
        [
          new Date().toISOString(),
          String(registrationId),
          eventRow.title,
          regPayload.registration_type || 'individual',
          regPayload.team_name || '',
          leader.full_name,
          normalizedLeaderEmail,
          leader.phone,
          regPayload.institution || '',
          regPayload.study_year || '',
          String(finalMembers.length),
          'pending',
        ]
      ).catch(() => {});
    }

    return res.status(200).json({ success: true, id: registrationId, emailSent });
  } catch (err: any) {
    console.error('[api/submit-event-registration]', err);
    return res.status(500).json({ error: err?.message || 'Failed to submit event registration' });
  }
}
