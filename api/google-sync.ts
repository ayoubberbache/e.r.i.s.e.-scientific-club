import { getAdminClient } from './_lib/supabaseAdmin.js';
import { applySecurityCors, logAuditEvent, verifyAdminAuth } from './_lib/auth.js';
import {
  getGoogleConfigStatus,
  listSentGmailMessages,
  replaceSheetTab,
  sendGmailAsErise,
} from './_lib/googleWorkspace.js';

export default async function handler(req: any, res: any) {
  applySecurityCors(req, res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const session = verifyAdminAuth(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized. Valid admin session required.' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: getGoogleConfigStatus() });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, testRecipient } = req.body || {};
  const supabase = getAdminClient();

  try {
    if (action === 'test_gmail') {
      const to = String(testRecipient || session.user.email || 'erise.club@hns-re2sd.dz').trim();
      const result = await sendGmailAsErise({
        to,
        subject: 'E.R.I.S.E. Google Workspace Automation Check',
        html: `<div style="font-family:Arial,sans-serif;padding:24px;background:#f8fcfd;border:1px solid #cfe5e9;border-radius:10px;">
          <h2 style="color:#0d5c63;margin:0 0 8px;">Google Workspace Automation Active</h2>
          <p style="color:#244153;font-size:14px;">This test confirms that <strong>erise.club@hns-re2sd.dz</strong> is authenticated and dispatching emails via Google Cloud Gmail API.</p>
          <p style="color:#5a7a8a;font-size:12px;">Triggered by ${session.user.name} at ${new Date().toISOString()}</p>
        </div>`,
        text: `Google Workspace Automation Active. Sent from erise.club@hns-re2sd.dz by ${session.user.name}.`,
      });
      await logAuditEvent(supabase, session, 'test_gmail', 'club_settings', undefined, { to });
      return res.status(200).json({ success: true, ...result });
    }

    if (action === 'sync_sheets') {
      const [regsRes, evRegsRes, ratingsRes, tasksRes] = await Promise.all([
        supabase.from('registrations').select('*').order('registered_at', { ascending: false }),
        supabase.from('event_registrations').select('*, events(title), event_registration_members(*)').order('registered_at', { ascending: false }),
        supabase.from('member_ratings').select('*'),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      ]);

      const regs = regsRes.data || [];
      const evRegs = evRegsRes.data || [];
      const ratings = ratingsRes.data || [];
      const tasks = tasksRes.data || [];

      const regHeaders = ['ID', 'Full Name', 'Student ID', 'Email', 'Phone', 'Study Year', 'Specialization', 'Departments', 'Status', 'Meeting Email Sent', 'Acceptance Email Sent', 'Registered At'];
      const regRows = regs.map((r: any) => [
        r.id,
        r.full_name,
        r.student_id || '',
        r.email,
        r.phone || '',
        r.study_year || '',
        r.specialization || '',
        Array.isArray(r.departments) ? r.departments.join(', ') : '',
        r.status || 'pending',
        r.meeting_email_sent ? 'YES' : 'NO',
        r.acceptance_email_sent ? 'YES' : 'NO',
        r.registered_at || '',
      ]);

      const evHeaders = ['Reg ID', 'Event Title', 'Type', 'Team Name', 'Leader/Member', 'Email', 'Phone', 'Institution', 'Study Year', 'Status', 'Registered At'];
      const evRows: any[][] = [];
      evRegs.forEach((er: any) => {
        const members = Array.isArray(er.event_registration_members) && er.event_registration_members.length > 0
          ? er.event_registration_members
          : [{ full_name: er.team_name || 'Registrant', email: '', phone: '', is_leader: true }];
        members.forEach((m: any) => {
          evRows.push([
            er.id,
            er.events?.title || `Event #${er.event_id}`,
            er.registration_type || 'individual',
            er.team_name || 'Individual',
            `${m.full_name}${m.is_leader ? ' (Leader)' : ''}`,
            m.email || '',
            m.phone || '',
            er.institution || '',
            er.study_year || '',
            er.status || 'pending',
            er.registered_at || '',
          ]);
        });
      });

      const ratingHeaders = ['Member ID', 'Overall Rating (%)', 'Presence Score', 'Head Score', 'Behavior Score', 'Discipline Score', 'Notes', 'Last Evaluated'];
      const ratingRows = ratings.map((mr: any) => [
        mr.member_id,
        mr.overall_rating,
        mr.presence_score || 0,
        mr.head_rating_score || 0,
        mr.behavior_score || 0,
        mr.discipline_score || 0,
        mr.notes || '',
        mr.last_evaluated_at || mr.updated_at || '',
      ]);

      const taskHeaders = ['Task ID', 'Title', 'Department', 'Status', 'Priority', 'Due At', 'Completed At'];
      const taskRows = tasks.map((t: any) => [
        t.id,
        t.title,
        t.department || 'Organization',
        t.status || 'pending',
        t.priority || 'medium',
        t.due_at || '',
        t.completed_at || '',
      ]);

      const [r1, r2, r3, r4] = await Promise.all([
        replaceSheetTab('Club_Recruitment', regHeaders, regRows),
        replaceSheetTab('Event_Registrations', evHeaders, evRows),
        replaceSheetTab('HR_Evaluations', ratingHeaders, ratingRows),
        replaceSheetTab('ToDo_Tasks', taskHeaders, taskRows),
      ]);

      await supabase
        .from('registrations')
        .update({ google_sheet_synced: true, google_sheet_synced_at: new Date().toISOString() })
        .is('google_sheet_synced', false);

      await logAuditEvent(supabase, session, 'sync_google_sheets', 'registrations', undefined, {
        recruitmentRows: r1.updatedRows,
        eventRows: r2.updatedRows,
        ratingRows: r3.updatedRows,
        taskRows: r4.updatedRows,
      });

      return res.status(200).json({
        success: true,
        synced: {
          Club_Recruitment: r1.updatedRows,
          Event_Registrations: r2.updatedRows,
          HR_Evaluations: r3.updatedRows,
          ToDo_Tasks: r4.updatedRows,
        },
      });
    }

    if (action === 'sync_gmail_logs') {
      const sent = await listSentGmailMessages(80);
      let meetingFound = 0;
      let acceptanceFound = 0;

      for (const msg of sent) {
        const subj = msg.subject.toLowerCase();
        const isMeeting = subj.includes('interview') || subj.includes('meeting');
        const isAcceptance = subj.includes('welcome') || subj.includes('acceptance');
        if (!isMeeting && !isAcceptance) continue;

        const emailMatch = msg.to.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (!emailMatch) continue;
        const cleanEmail = emailMatch[0].toLowerCase();

        const updateData: Record<string, any> = {};
        if (isMeeting) {
          meetingFound++;
          updateData.meeting_email_sent = true;
          updateData.meeting_email_sent_at = new Date(msg.date).toISOString();
        }
        if (isAcceptance) {
          acceptanceFound++;
          updateData.acceptance_email_sent = true;
          updateData.acceptance_email_sent_at = new Date(msg.date).toISOString();
        }
        await supabase.from('registrations').update(updateData).ilike('email', cleanEmail);
      }

      return res.status(200).json({
        success: true,
        scanned: sent.length,
        meetingFound,
        acceptanceFound,
      });
    }

    return res.status(400).json({ error: 'Unsupported action' });
  } catch (err: any) {
    console.error('Google sync error:', err);
    return res.status(500).json({ error: err.message || 'Google Workspace automation failed' });
  }
}
