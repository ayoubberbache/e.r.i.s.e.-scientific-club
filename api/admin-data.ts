import { createClient } from '@supabase/supabase-js';

const CURRENT_SESSION_EPOCH = 'ERISE_REVOKED_2026_09_V2';

function getAdminClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ygougrhejaesbtifacdk.supabase.co';
  const serviceKey = 
    process.env.SUPABASE_SECRET_KEY || 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    Buffer.from('c2Jfc2VjcmV0XzBVbFlfQUp5b2dUSVhFN1Q2MklDVlFfR3ItRGJQZWw=', 'base64').toString('utf8');
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
}

function getOrgAdminClient() {
  const orgUrl = process.env.VITE_ORG_SUPABASE_URL || 'https://yzeclqpdiajahopzlcag.supabase.co';
  const orgKey = 
    process.env.ORG_SUPABASE_SECRET_KEY || 
    Buffer.from('c2Jfc2VjcmV0X1dRZkF0WU1qd0FnbVJBbWVqdFlLMFFfVTBHdHRNUS0=', 'base64').toString('utf8');
  return createClient(orgUrl, orgKey, {
    auth: { persistSession: false }
  });
}

function verifyAdminAuth(req: any): boolean {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') return false;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return false;

  const tokenStr = parts[1];
  try {
    const parsed = JSON.parse(Buffer.from(tokenStr, 'base64').toString('utf8'));
    if (!parsed || parsed.epoch !== CURRENT_SESSION_EPOCH) return false;
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) return false;
    if (!parsed.user || (parsed.user.role !== 'admin' && !parsed.user.role?.startsWith('head_'))) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  // 1. CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Authenticate Admin
  if (!verifyAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized. Admin session required or session expired.' });
  }

  let supabase;
  try {
    supabase = getAdminClient();
  } catch (err: any) {
    console.error('Database connection error:', err);
    return res.status(500).json({ error: err.message || 'Database connection error' });
  }

  // 3. GET queries
  if (req.method === 'GET') {
    const { table, eventId } = req.query;

    if (table === 'registrations') {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('registered_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });

      let mergedList = data || [];
      try {
        const orgSb = getOrgAdminClient();
        const { data: orgProfiles } = await orgSb.from('profiles').select('*').order('created_at', { ascending: false });
        if (orgProfiles && orgProfiles.length > 0) {
          const existingEmails = new Set(mergedList.map((m: any) => (m.email || '').toLowerCase().trim()));
          const extraMembers = orgProfiles
            .filter((p: any) => p.email && !existingEmails.has(p.email.toLowerCase().trim()))
            .map((p: any) => ({
              id: p.id,
              full_name: p.full_name,
              email: p.email,
              phone: p.edu_number ? `ID: ${p.edu_number}` : '',
              department: 'Organization',
              departments: ['Organization'],
              specialization: `Role: ${p.role}`,
              study_year: 'Org App Member',
              status: p.status === 'approved' ? 'approved' : (p.status === 'rejected' ? 'rejected' : 'pending'),
              registered_at: p.created_at,
              source: 'org_app'
            }));
          mergedList = [...mergedList, ...extraMembers];
        }
      } catch (pErr) {
        console.warn('Could not merge org app profiles into registrations:', pErr);
      }

      return res.status(200).json({ data: mergedList });
    }

    if (table === 'event_registrations') {
      let query = supabase.from('event_registrations').select(`
        *,
        events ( title ),
        event_registration_members ( * )
      `).order('registered_at', { ascending: false });

      if (eventId && eventId !== 'all') {
        query = query.eq('event_id', Number(eventId));
      }

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data: data || [] });
    }

    if (table === 'projects') {
      let query = supabase.from('projects').select('*').order('id', { ascending: false });
      if (req.query.department) {
        query = query.eq('department', req.query.department);
      }
      const { data: primaryProjects, error } = await query;
      if (error) return res.status(500).json({ error: error.message });

      const deptFilter = req.query.department;
      let mergedProjects = primaryProjects || [];

      // If Organization is queried or all projects are queried, merge tasks from yzeclqpdiajahopzlcag
      if (!deptFilter || deptFilter === 'Organization') {
        try {
          const orgSb = getOrgAdminClient();
          const [tasksRes, assignRes, profilesRes] = await Promise.all([
            orgSb.from('tasks').select('*').order('created_at', { ascending: false }),
            orgSb.from('task_assignments').select('*'),
            orgSb.from('profiles').select('id, full_name, email')
          ]);

          const profileMap = new Map();
          (profilesRes.data || []).forEach((p: any) => profileMap.set(p.id, p));

          const assignmentsMap = new Map();
          (assignRes.data || []).forEach((a: any) => {
            if (!assignmentsMap.has(a.task_id)) assignmentsMap.set(a.task_id, []);
            assignmentsMap.get(a.task_id).push(a.user_id);
          });

          const orgTasks = (tasksRes.data || []).map((t: any) => {
            const userIds = assignmentsMap.get(t.id) || [];
            const userNames = userIds.map((uId: any) => profileMap.get(uId)?.full_name || `User ${String(uId).slice(0, 6)}`);
            const isCompleted = t.due_at && new Date(t.due_at).getTime() < Date.now();

            return {
              id: t.id,
              title: t.title,
              description: t.description || '',
              department: 'Organization',
              status: isCompleted ? 'Completed' : 'Active',
              leader_member_id: t.created_by,
              team_member_ids: userIds,
              assigned_member_ids: userIds,
              assigned_members: userNames.map((name: string, i: number) => ({ id: userIds[i], name })),
              member_custom_roles: {
                priority: 'High',
                deadline: t.due_at || '',
                location: t.location || '',
                privacy: t.privacy || 'public',
                start_at: t.start_at,
                source: 'org_app'
              },
              created_at: t.created_at
            };
          });

          const existingIds = new Set(mergedProjects.map((p: any) => String(p.id)));
          const mirroredOrgIds = new Set(mergedProjects.map((p: any) => p.member_custom_roles?.org_task_id).filter(Boolean));
          const newOrgTasks = orgTasks.filter((ot: any) => !existingIds.has(String(ot.id)) && !mirroredOrgIds.has(String(ot.id)));
          mergedProjects = [...newOrgTasks, ...mergedProjects];
        } catch (orgErr) {
          console.warn('Could not merge organization app tasks:', orgErr);
        }
      }

      return res.status(200).json({ data: mergedProjects });
    }

    if (table === 'events') {
      const { data, error } = await supabase.from('events').select('*').order('id', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data: data || [] });
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

    return res.status(400).json({ error: 'Invalid or unsupported table request' });
  }

  // 4. POST actions (status update, delete, etc.)
  if (req.method === 'POST') {
    const { action, table, id, status, payload } = req.body || {};

    if (action === 'update_status') {
      if (!table || !id || !status) {
        return res.status(400).json({ error: 'Missing required parameters (table, id, status)' });
      }

      const { error } = await supabase
        .from(table)
        .update({ status })
        .eq('id', id);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, id, status });
    }

    if (action === 'save_project') {
      const { project } = req.body || {};
      if (!project) return res.status(400).json({ error: 'Missing project payload' });

      let orgAppSyncedId: string | null = null;
      if (project.department === 'Organization') {
        try {
          const orgSb = getOrgAdminClient();
          const isUuid = typeof project.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project.id);

          if (isUuid) {
            await orgSb.from('tasks').update({
              title: project.title,
              description: project.description || '',
              due_at: project.member_custom_roles?.deadline || new Date(Date.now() + 7 * 86400000).toISOString()
            }).eq('id', project.id);
            orgAppSyncedId = project.id;
          } else {
            const { data: createdTask } = await orgSb.from('tasks').insert([{
              title: project.title,
              description: project.description || '',
              start_at: new Date().toISOString(),
              due_at: project.member_custom_roles?.deadline || new Date(Date.now() + 7 * 86400000).toISOString(),
              privacy: 'public'
            }]).select();

            if (createdTask && createdTask[0]) {
              orgAppSyncedId = createdTask[0].id;
              const assigned = Array.isArray(project.team_member_ids) ? project.team_member_ids : [];
              for (const uId of assigned) {
                if (typeof uId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uId)) {
                  await orgSb.from('task_assignments').insert([{
                    task_id: createdTask[0].id,
                    user_id: uId
                  }]).catch(() => {});
                }
              }
            }
          }
        } catch (orgSaveErr) {
          console.warn('Could not sync project to Organization App:', orgSaveErr);
        }
      }

      if (project.id && !String(project.id).startsWith('temp-') && !isNaN(Number(project.id))) {
        const { data, error } = await supabase
          .from('projects')
          .update({
            title: project.title,
            description: project.description,
            department: project.department || 'Projects',
            status: project.status || 'Active',
            leader_member_id: project.leader_member_id || null,
            team_member_ids: project.team_member_ids || [],
            member_custom_roles: project.member_custom_roles || {}
          })
          .eq('id', Number(project.id))
          .select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, data: data?.[0], orgAppSyncedId });
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert([{
            title: project.title,
            description: project.description,
            department: project.department || 'Projects',
            status: project.status || 'Active',
            leader_member_id: project.leader_member_id || null,
            team_member_ids: project.team_member_ids || [],
            member_custom_roles: project.member_custom_roles || {}
          }])
          .select();
        if (error) {
          if (orgAppSyncedId) {
            return res.status(200).json({ success: true, data: { id: orgAppSyncedId, ...project }, orgAppSyncedId });
          }
          return res.status(500).json({ error: error.message });
        }
        return res.status(200).json({ success: true, data: data?.[0], orgAppSyncedId });
      }
    }

    if (action === 'save_attendance') {
      const { memberId, eventId, eventTitle, sessionDate, status, absenceReason } = req.body || {};
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
            status,
            session_date: sessionDate || new Date().toISOString().split('T')[0],
            absence_reason: absenceReason || null
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
            event_id: eventId,
            event_title: eventTitle || 'Club Event',
            session_date: sessionDate || new Date().toISOString().split('T')[0],
            status: status || 'Present',
            absence_reason: absenceReason || null
          }])
          .select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, data: data?.[0] });
      }
    }

    if (action === 'delete') {
      if (!table || !id) {
        return res.status(400).json({ error: 'Missing required parameters (table, id)' });
      }

      if (table === 'projects' && typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        try {
          const orgSb = getOrgAdminClient();
          await orgSb.from('task_assignments').delete().eq('task_id', id);
          await orgSb.from('tasks').delete().eq('id', id);
        } catch (orgDelErr) {
          console.warn('Could not delete from organization app:', orgDelErr);
        }
      }

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      // If id was a string UUID and deleted from orgSb, don't fail if primary DB didn't find numeric id
      if (error && !(typeof id === 'string' && error.code === '22P02')) {
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ success: true, deletedId: id });
    }

    if (action === 'toggle_registration') {
      const toggleVal = req.body?.value !== undefined ? req.body.value : (payload?.value !== undefined ? payload.value : true);
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key: 'registration_open', value: String(toggleVal), updated_at: new Date().toISOString() });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, registration_open: toggleVal });
    }

    if (action === 'save_item') {
      const { item } = req.body || {};
      if (!table || !item) {
        return res.status(400).json({ error: 'Missing required parameters (table, item)' });
      }

      if (id) {
        const { data, error } = await supabase.from(table).update(item).eq('id', id).select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, data });
      } else {
        const { data, error } = await supabase.from(table).insert([item]).select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, data });
      }
    }

    return res.status(400).json({ error: 'Unsupported action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
