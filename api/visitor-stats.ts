import { z } from 'zod';
import { getAdminClient } from './_lib/supabaseAdmin.js';
import { applySecurityCors } from './_lib/auth.js';

const VisitorPostSchema = z.object({
  path: z.string().max(180).optional(),
  event: z.enum(['visit', 'heartbeat']).optional().default('visit'),
});

export default async function handler(req: any, res: any) {
  applySecurityCors(req, res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getAdminClient();

  try {
    if (req.method === 'GET') {
      const { data } = await supabase
        .from('club_settings')
        .select('value')
        .eq('key', 'visitor_stats')
        .maybeSingle();

      const stats = (data?.value as Record<string, any>) || { totalVisits: 0, lastUpdated: null };
      return res.status(200).json({
        success: true,
        totalVisits: Number(stats.totalVisits || 0),
        lastUpdated: stats.lastUpdated || null,
      });
    }

    if (req.method === 'POST') {
      const parsed = VisitorPostSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid visitor payload' });
      }

      const { data } = await supabase
        .from('club_settings')
        .select('value')
        .eq('key', 'visitor_stats')
        .maybeSingle();

      const prev = (data?.value as Record<string, any>) || { totalVisits: 0 };
      const nextCount = Number(prev.totalVisits || 0) + (parsed.data.event === 'visit' ? 1 : 0);
      const updated = {
        totalVisits: nextCount,
        lastUpdated: new Date().toISOString(),
      };

      await supabase
        .from('club_settings')
        .upsert({ key: 'visitor_stats', value: updated }, { onConflict: 'key' });

      return res.status(200).json({ success: true, totalVisits: nextCount });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[api/visitor-stats]', err);
    return res.status(500).json({ error: err?.message || 'Stats error' });
  }
}
