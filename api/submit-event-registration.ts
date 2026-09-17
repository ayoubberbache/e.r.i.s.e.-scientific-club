import { createClient } from '@supabase/supabase-js';

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

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let supabase;
  try {
    supabase = getAdminClient();
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Database connection error' });
  }

  const { regPayload, memberPayloads } = req.body || {};

  if (!regPayload || !regPayload.event_id) {
    return res.status(400).json({ error: 'Invalid or missing registration payload' });
  }

  try {
    // 1. Insert into event_registrations
    const { data: regData, error: regError } = await supabase
      .from('event_registrations')
      .insert([regPayload])
      .select('id')
      .single();

    if (regError) throw regError;

    const registrationId = regData.id;

    // 2. Insert into event_registration_members if present
    if (Array.isArray(memberPayloads) && memberPayloads.length > 0) {
      const finalMembers = memberPayloads.map((m: any) => ({
        ...m,
        registration_id: registrationId
      }));

      const { error: membersError } = await supabase
        .from('event_registration_members')
        .insert(finalMembers);

      if (membersError) throw membersError;
    }

    return res.status(200).json({ success: true, id: registrationId });
  } catch (err: any) {
    console.error('Error in event registration handler:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit event registration' });
  }
}
