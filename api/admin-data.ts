import { createClient } from '@supabase/supabase-js';

const CURRENT_SESSION_EPOCH = 'ERISE_REVOKED_2026_09_V2';

function getAdminClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ygougrhejaesbtifacdk.supabase.co';
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
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
      const { value } = payload || {};
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key: 'registration_open', value: String(value), updated_at: new Date().toISOString() });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, registration_open: value });
    }

    return res.status(400).json({ error: 'Unsupported action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
