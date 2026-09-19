import { createClient } from '@supabase/supabase-js';

const CURRENT_SESSION_EPOCH = 'ERISE_REVOKED_2026_09_V2';

function getAdminClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ygougrhejaesbtifacdk.supabase.co';
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SECRET_KEY environment variable is not configured');
  }
  return createClient(supabaseUrl, serviceKey, {
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
      return res.status(200).json({ data: data || [] });
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
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data: data || [] });
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
        return res.status(200).json({ success: true, data: data?.[0] });
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
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, data: data?.[0] });
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

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) return res.status(500).json({ error: error.message });
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
