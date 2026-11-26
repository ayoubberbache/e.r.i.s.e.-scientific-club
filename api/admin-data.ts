import { z } from 'zod';
import { getAdminClient } from './_lib/supabaseAdmin.js';
import { applySecurityCors, logAuditEvent, verifyAdminAuth } from './_lib/auth.js';

const READ_TABLES = new Set([
  'registrations',
  'event_registrations',
  'events',
  'leaders',
  'achievements',
  'star_members',
  'projects',
  'attendance_logs',
  'member_ratings',
  'email_templates',
  'audit_logs',
  'tasks',
  'todo_profiles',
]);

const WRITE_TABLES = new Set([
  'registrations',
  'event_registrations',
  'events',
  'leaders',
  'achievements',
  'star_members',
  'projects',
  'attendance_logs',
  'email_templates',
  'site_settings',
]);

const VALID_DEPTS = ['Projects', 'Organization', 'Media'] as const;

export default async function handler(req: any, res: any) {
  applySecurityCors(req, res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const session = verifyAdminAuth(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized. Valid signed admin session required.' });
  }

  let supabase;
  try {
    supabase = getAdminClient();
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Database connection error' });
  }

  // ── GET QUERIES ─────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const table = String(req.query?.table || '');
    const eventId = req.query?.eventId ? String(req.query.eventId) : undefined;

    if (!READ_TABLES.has(table)) {
      return res.status(400).json({ error: 'Invalid or unsupported table request' });
    }

    if (table === 'registrations') {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('registered_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });

      let emailTrackingMap: Record<string, any> = {};
      try {
        const { data: trackRow } = await supabase
          .from('club_settings')
          .select('value')
          .eq('key', 'sent_recruitment_emails')
          .maybeSingle();
        if (trackRow?.value && typeof trackRow.value === 'object') {
          emailTrackingMap = trackRow.value;
        }
      } catch {}

      const enriched = (data || []).map((m: any) => {
        const emailKey = (m.email || '').toLowerCase().trim();
        const tracked = emailTrackingMap[emailKey] || {};
        return {
          ...m,
          meeting_email_sent: Boolean(m.meeting_email_sent || tracked.meeting_email_sent),
          meeting_email_sent_at: m.meeting_email_sent_at || tracked.meeting_email_sent_at || null,
          acceptance_email_sent: Boolean(m.acceptance_email_sent || tracked.acceptance_email_sent),
          acceptance_email_sent_at: m.acceptance_email_sent_at || tracked.acceptance_email_sent_at || null,
          email_history: tracked.history || [],
        };
      });

      return res.status(200).json({ data: enriched });
    }

    if (table === 'event_registrations') {
      let query = supabase
        .from('event_registrations')
        .select('*, events ( title, event_category ), event_registration_members ( * )')
        .order('registered_at', { ascending: false });

      if (eventId && eventId !== 'all') {
        query = query.eq('event_id', Number(eventId));
      }

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data: data || [] });
    }

    if (table === 'projects') {
      let query = supabase.from('projects').select('*').order('id', { ascending: false });
      if (req.query?.department) {
        query = query.eq('department', String(req.query.department));
      }
      const { data: primaryProjects, error } = await query;
      if (error) return res.status(500).json({ error: error.message });

      let mergedProjects = primaryProjects || [];

      // Merge unified To-Do tasks for Organization or overall views
      if (!req.query?.department || req.query.department === 'Organization') {
        try {
          const [tasksRes, assignRes, profilesRes] = await Promise.all([
            supabase.from('tasks').select('*').order('created_at', { ascending: false }),
            supabase.from('task_assignments').select('*'),
            supabase.from('todo_profiles').select('id, registration_id, full_name, email'),
          ]);

          const profileMap = new Map<string, any>();
          (profilesRes.data || []).forEach((p: any) => profileMap.set(p.id, p));

          const assignMap = new Map<string, string[]>();
          (assignRes.data || []).forEach((a: any) => {
            if (!assignMap.has(a.task_id)) assignMap.set(a.task_id, []);
            assignMap.get(a.task_id)!.push(a.user_id);
          });

          const orgTasks = (tasksRes.data || []).map((t: any) => {
            const userIds = assignMap.get(t.id) || [];
            const members = userIds.map((uId: string) => {
              const prof = profileMap.get(uId);
              return {
                id: prof?.registration_id || uId,
                name: prof?.full_name || `Member`,
              };
            });
            const statusLabel =
              t.status === 'completed' ? 'Completed' : t.status === 'in_progress' ? 'In Progress' : 'Pending';

            return {
              id: t.id,
              title: t.title,
              description: t.description || '',
              department: t.department || 'Organization',
              status: statusLabel,
              todo_status: t.status || 'pending',
              leader_member_id: t.created_by,
              team_member_ids: members.map(m => m.id),
              assigned_member_ids: members.map(m => m.id),
              assigned_members: members,
              member_custom_roles: {
                priority: (t.priority || 'medium').toUpperCase(),
                deadline: t.due_at || '',
                location: t.location || '',
                privacy: t.privacy || 'public',
                start_at: t.start_at,
                completed_at: t.completed_at,
                source: 'todo_app',
              },
              created_at: t.created_at,
            };
          });

          const existingIds = new Set(mergedProjects.map((p: any) => String(p.id)));
          const newTasks = orgTasks.filter((ot: any) => !existingIds.has(String(ot.id)));
          mergedProjects = [...newTasks, ...mergedProjects];
        } catch (err) {
          console.warn('Could not merge unified To-Do tasks:', err);
        }
      }

      return res.status(200).json({ data: mergedProjects });
    }

    if (table === 'attendance_logs') {
      let query = supabase.from('attendance_logs').select('*').order('id', { ascending: false });
      if (eventId && eventId !== 'all') {
        query = query.eq('event_id', Number(eventId));
      }
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data: data || [] });
    }

    const orderCol = table === 'audit_logs' ? 'created_at' : 'id';
    const { data, error } = await supabase.from(table).select('*').order(orderCol, { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data: data || [] });
  }

  // ── POST ACTIONS ────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body || {};
    const { action, table, id, status } = body;

    if (action === 'update_departments') {
      const schema = z.object({
        id: z.union([z.number(), z.string()]),
        departments: z.array(z.enum(VALID_DEPTS)).min(1),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Select at least one valid department (Projects, Organization, Media)' });
      }

      const { data, error } = await supabase
        .from('registrations')
        .update({ departments: parsed.data.departments })
        .eq('id', parsed.data.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      // Trigger syncs todo_profiles.departments automatically, also update directly if matched by registration_id
      try {
        await supabase
          .from('todo_profiles')
          .update({ departments: parsed.data.departments })
          .eq('registration_id', parsed.data.id);
      } catch {}

      await logAuditEvent(supabase, session, 'update_departments', 'registrations', parsed.data.id, {
        departments: parsed.data.departments,
      });

      return res.status(200).json({ success: true, data });
    }

    if (action === 'update_status') {
      if (!table || !WRITE_TABLES.has(table) || !id || !status) {
        return res.status(400).json({ error: 'Invalid table, id, or status' });
      }
      const { error } = await supabase.from(table).update({ status }).eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      await logAuditEvent(supabase, session, 'update_status', table, id, { status });
      return res.status(200).json({ success: true, id, status });
    }

    if (action === 'bulk_update_status') {
      const { ids } = body;
      if (!table || !WRITE_TABLES.has(table) || !Array.isArray(ids) || !ids.length || !status) {
        return res.status(400).json({ error: 'Invalid bulk_update_status parameters' });
      }
      const numericIds = ids.map((x: any) => Number(x)).filter((n: number) => !isNaN(n));
      if (numericIds.length > 0) {
        const { error } = await supabase.from(table).update({ status }).in('id', numericIds);
        if (error) return res.status(500).json({ error: error.message });
      }
      await logAuditEvent(supabase, session, 'bulk_update_status', table, undefined, { count: numericIds.length, status });
      return res.status(200).json({ success: true, count: numericIds.length, status });
    }

    if (action === 'update_registration' || action === 'update_member') {
      const { student_id, full_name, email, phone, study_year, specialization, departments, status: nextStatus } = body;
      if (!id) return res.status(400).json({ error: 'Missing registration id' });
      const updateData: Record<string, any> = {};
      if (student_id !== undefined) updateData.student_id = student_id;
      if (full_name !== undefined) updateData.full_name = full_name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (study_year !== undefined) updateData.study_year = study_year;
      if (specialization !== undefined) updateData.specialization = specialization;
      if (Array.isArray(departments)) {
        updateData.departments = departments.filter((d: string) => VALID_DEPTS.includes(d as any));
      }
      if (nextStatus !== undefined) updateData.status = nextStatus;

      const { data, error } = await supabase.from('registrations').update(updateData).eq('id', id).select();
      if (error) return res.status(500).json({ error: error.message });
      await logAuditEvent(supabase, session, 'update_registration', 'registrations', id, updateData);
      return res.status(200).json({ success: true, data: data?.[0] });
    }

    if (action === 'toggle_email_status') {
      const { email, emailType, sent } = body;
      if (!emailType || (!email && !id)) {
        return res.status(400).json({ error: 'Missing email/id or emailType' });
      }
      const cleanEmail = String(email || '').toLowerCase().trim();
      const isSent = Boolean(sent !== false);
      const now = isSent ? new Date().toISOString() : null;

      const { data: trackRow } = await supabase
        .from('club_settings')
        .select('value')
        .eq('key', 'sent_recruitment_emails')
        .maybeSingle();

      const currentMap = trackRow?.value && typeof trackRow.value === 'object' ? trackRow.value : {};
      const record = currentMap[cleanEmail] || {};
      if (emailType === 'meeting') {
        record.meeting_email_sent = isSent;
        record.meeting_email_sent_at = now;
      } else if (emailType === 'acceptance') {
        record.acceptance_email_sent = isSent;
        record.acceptance_email_sent_at = now;
      }
      currentMap[cleanEmail] = record;

      await supabase.from('club_settings').upsert({
        key: 'sent_recruitment_emails',
        value: currentMap,
        updated_at: new Date().toISOString(),
      });

      const updateData: Record<string, any> = {};
      if (emailType === 'meeting') {
        updateData.meeting_email_sent = isSent;
        updateData.meeting_email_sent_at = now;
      } else if (emailType === 'acceptance') {
        updateData.acceptance_email_sent = isSent;
        updateData.acceptance_email_sent_at = now;
      }

      if (id) await supabase.from('registrations').update(updateData).eq('id', id);
      else if (cleanEmail) await supabase.from('registrations').update(updateData).ilike('email', cleanEmail);

      return res.status(200).json({ success: true, email: cleanEmail, emailType, sent: isSent });
    }

    if (action === 'import_email_logs') {
      const { logs } = body;
      if (!Array.isArray(logs) || !logs.length) {
        return res.status(400).json({ error: 'Missing or empty logs array' });
      }
      const { data: trackRow } = await supabase
        .from('club_settings')
        .select('value')
        .eq('key', 'sent_recruitment_emails')
        .maybeSingle();

      const currentMap = trackRow?.value && typeof trackRow.value === 'object' ? trackRow.value : {};
      let updatedCount = 0;

      for (const entry of logs) {
        const cleanEmail = String(entry.email || '').toLowerCase().trim();
        if (!cleanEmail) continue;
        const sentAt = entry.sent_at || new Date().toISOString();
        const record = currentMap[cleanEmail] || {};
        const updateData: Record<string, any> = {};

        if (entry.type === 'meeting') {
          record.meeting_email_sent = true;
          record.meeting_email_sent_at = sentAt;
          updateData.meeting_email_sent = true;
          updateData.meeting_email_sent_at = sentAt;
        } else if (entry.type === 'acceptance') {
          record.acceptance_email_sent = true;
          record.acceptance_email_sent_at = sentAt;
          updateData.acceptance_email_sent = true;
          updateData.acceptance_email_sent_at = sentAt;
        }
        currentMap[cleanEmail] = record;
        updatedCount++;
        await supabase.from('registrations').update(updateData).ilike('email', cleanEmail);
      }

      await supabase.from('club_settings').upsert({
        key: 'sent_recruitment_emails',
        value: currentMap,
        updated_at: new Date().toISOString(),
      });

      return res.status(200).json({ success: true, imported: updatedCount });
    }

    if (action === 'update_task_status') {
      const taskSchema = z.object({
        id: z.string().min(1),
        status: z.enum(['pending', 'in_progress', 'completed', 'Pending', 'In Progress', 'Completed']),
      });
      const parsedTask = taskSchema.safeParse(body);
      if (!parsedTask.success) {
        return res.status(400).json({ error: 'Invalid task status update payload' });
      }
      const normStatus =
        parsedTask.data.status === 'completed' || parsedTask.data.status === 'Completed'
          ? 'completed'
          : parsedTask.data.status === 'in_progress' || parsedTask.data.status === 'In Progress'
            ? 'in_progress'
            : 'pending';
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsedTask.data.id);
      if (isUuid) {
        const { error } = await supabase
          .from('tasks')
          .update({
            status: normStatus,
            completed_at: normStatus === 'completed' ? new Date().toISOString() : null,
            completed_by: normStatus === 'completed' ? session.user.username : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', parsedTask.data.id);
        if (error) return res.status(500).json({ error: error.message });
      } else if (!isNaN(Number(parsedTask.data.id))) {
        const projStatus =
          normStatus === 'completed' ? 'Completed' : normStatus === 'in_progress' ? 'In Progress' : 'Pending';
        await supabase.from('projects').update({ status: projStatus }).eq('id', Number(parsedTask.data.id));
      }
      await logAuditEvent(supabase, session, 'update_task_status', 'tasks', parsedTask.data.id, { status: normStatus });
      return res.status(200).json({ success: true, id: parsedTask.data.id, status: normStatus });
    }

    if (action === 'save_project') {
      const { project } = body;
      if (!project || !project.title) return res.status(400).json({ error: 'Missing project payload' });

      // If Organization task with UUID, update unified `tasks` table directly
      const isUuid = typeof project.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project.id);
      if (project.department === 'Organization') {
        const mappedStatus =
          project.status === 'Completed' ? 'completed' : project.status === 'Pending' ? 'pending' : 'in_progress';
        if (isUuid) {
          await supabase.from('tasks').update({
            title: project.title,
            description: project.description || '',
            status: mappedStatus,
            due_at: project.member_custom_roles?.deadline || new Date(Date.now() + 7 * 86400000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', project.id);
          return res.status(200).json({ success: true, data: project });
        }
      }

      const payloadData = {
        title: String(project.title).trim(),
        description: String(project.description || ''),
        department: project.department || 'Projects',
        category: project.category || 'Engineering & Innovation',
        status: project.status || 'Active',
        leader_member_id: project.leader_member_id ? String(project.leader_member_id) : null,
        team_member_ids: Array.isArray(project.team_member_ids) ? project.team_member_ids : [],
        member_custom_roles: project.member_custom_roles || {},
        updated_at: new Date().toISOString(),
      };

      if (project.id && !String(project.id).startsWith('temp-') && !isNaN(Number(project.id))) {
        const { data, error } = await supabase
          .from('projects')
          .update(payloadData)
          .eq('id', Number(project.id))
          .select();
        if (error) return res.status(500).json({ error: error.message });
        await logAuditEvent(supabase, session, 'update_project', 'projects', project.id);
        return res.status(200).json({ success: true, data: data?.[0] });
      } else {
        const { data, error } = await supabase.from('projects').insert([payloadData]).select();
        if (error) return res.status(500).json({ error: error.message });
        await logAuditEvent(supabase, session, 'create_project', 'projects', data?.[0]?.id);
        return res.status(200).json({ success: true, data: data?.[0] });
      }
    }

    if (action === 'save_attendance') {
      const { memberId, memberName, eventId, eventTitle, sessionDate, status: attStatus, absenceReason } = body;
      if (!memberId || !eventId) return res.status(400).json({ error: 'Missing memberId or eventId' });

      const { data: existing } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('member_id', memberId)
        .eq('event_id', eventId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('attendance_logs')
          .update({
            status: attStatus || 'Present',
            member_name: memberName || undefined,
            session_date: sessionDate || new Date().toISOString().split('T')[0],
            absence_reason: absenceReason || null,
          })
          .eq('id', existing.id)
          .select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, data: data?.[0] });
      } else {
        const { data, error } = await supabase
          .from('attendance_logs')
          .insert([{
            member_id: memberId,
            member_name: memberName || null,
            event_id: eventId,
            event_title: eventTitle || 'Club Event',
            session_date: sessionDate || new Date().toISOString().split('T')[0],
            status: attStatus || 'Present',
            absence_reason: absenceReason || null,
          }])
          .select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, data: data?.[0] });
      }
    }

    if (action === 'save_evaluation') {
      const { memberId, presenceScore, headRatingScore, departmentHeadRatings, behaviorScore, disciplineScore, overallRating, notes } = body;
      if (!memberId) return res.status(400).json({ error: 'Missing memberId' });

      const { data, error } = await supabase
        .from('member_ratings')
        .upsert({
          member_id: String(memberId),
          presence_score: Number(presenceScore || 0),
          head_rating_score: Number(headRatingScore || 0),
          department_head_ratings: departmentHeadRatings || {},
          behavior_score: Number(behaviorScore || 0),
          discipline_score: Number(disciplineScore || 0),
          overall_rating: Number(overallRating ?? 50),
          notes: String(notes || ''),
          last_evaluated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      await logAuditEvent(supabase, session, 'save_evaluation', 'member_ratings', memberId, { overallRating });
      return res.status(200).json({ success: true, data });
    }

    if (action === 'delete') {
      if (!table || !WRITE_TABLES.has(table) || !id) {
        return res.status(400).json({ error: 'Invalid delete parameters' });
      }
      if (table === 'projects' && typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        await supabase.from('task_assignments').delete().eq('task_id', id);
        await supabase.from('tasks').delete().eq('id', id);
      }
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error && !(typeof id === 'string' && error.code === '22P02')) {
        return res.status(500).json({ error: error.message });
      }
      await logAuditEvent(supabase, session, 'delete', table, id);
      return res.status(200).json({ success: true, deletedId: id });
    }

    if (action === 'bulk_delete') {
      const { ids } = body;
      if (!table || !WRITE_TABLES.has(table) || !Array.isArray(ids) || !ids.length) {
        return res.status(400).json({ error: 'Invalid bulk_delete parameters' });
      }
      const numericIds = ids.map((x: any) => Number(x)).filter((n: number) => !isNaN(n));
      if (numericIds.length > 0) {
        const { error } = await supabase.from(table).delete().in('id', numericIds);
        if (error) return res.status(500).json({ error: error.message });
      }
      await logAuditEvent(supabase, session, 'bulk_delete', table, undefined, { count: numericIds.length });
      return res.status(200).json({ success: true, deletedCount: numericIds.length });
    }

    if (action === 'toggle_registration') {
      const toggleVal = body.value !== undefined ? Boolean(body.value) : true;
      const { error } = await supabase.from('site_settings').upsert({
        key: 'registration_open',
        value: String(toggleVal),
        updated_at: new Date().toISOString(),
      });
      if (error) return res.status(500).json({ error: error.message });
      await logAuditEvent(supabase, session, 'toggle_registration', 'site_settings', 'registration_open', { value: toggleVal });
      return res.status(200).json({ success: true, registration_open: toggleVal });
    }

    if (action === 'save_item') {
      const { item } = body;
      if (!table || !WRITE_TABLES.has(table) || !item || typeof item !== 'object') {
        return res.status(400).json({ error: 'Invalid save_item parameters' });
      }
      if (id) {
        const { data, error } = await supabase.from(table).update(item).eq('id', id).select();
        if (error) return res.status(500).json({ error: error.message });
        await logAuditEvent(supabase, session, 'update_item', table, id);
        return res.status(200).json({ success: true, data });
      } else {
        const { data, error } = await supabase.from(table).insert([item]).select();
        if (error) return res.status(500).json({ error: error.message });
        await logAuditEvent(supabase, session, 'create_item', table, data?.[0]?.id);
        return res.status(200).json({ success: true, data });
      }
    }

    return res.status(400).json({ error: 'Unsupported action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
