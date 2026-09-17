import { createClient } from '@supabase/supabase-js';

const COUNTRY_NAMES: Record<string, string> = {
  DZ: 'Algeria',
  FR: 'France',
  TN: 'Tunisia',
  MA: 'Morocco',
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  DE: 'Germany',
  TR: 'Turkey',
  ES: 'Spain',
  IT: 'Italy',
  SA: 'Saudi Arabia',
  AE: 'United Arab Emirates',
  EG: 'Egypt',
  QA: 'Qatar',
  CH: 'Switzerland',
  BE: 'Belgium',
  NL: 'Netherlands',
  CN: 'China',
  JP: 'Japan',
  KR: 'South Korea',
  IN: 'India',
  BR: 'Brazil',
  RU: 'Russia',
};

function getCountryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  try {
    const offset = 127397;
    const chars = [...code.toUpperCase()].map(c => c.charCodeAt(0) + offset);
    return String.fromCodePoint(...chars);
  } catch (e) {
    return '🌐';
  }
}

function getCountryName(code: string): string {
  if (COUNTRY_NAMES[code]) return COUNTRY_NAMES[code];
  try {
    if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
      const dn = new Intl.DisplayNames(['en'], { type: 'region' });
      return dn.of(code) || code;
    }
  } catch (e) {}
  return code;
}

function getAdminClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ygougrhejaesbtifacdk.supabase.co';
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SECRET_KEY is not configured');
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
}

// In-memory set for tracking active sessions within a TTL window
const activeSessions = new Map<string, number>();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes session window

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let supabase;
  try {
    supabase = getAdminClient();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }

  // 1. Identify Country
  let countryCode = (
    req.headers['x-vercel-ip-country'] ||
    req.headers['cf-ipcountry'] ||
    ''
  ).toString().toUpperCase().trim();

  if (!countryCode || countryCode.length !== 2) {
    countryCode = 'DZ';
  }

  const clientIp = (
    req.headers['x-forwarded-for'] ||
    req.socket?.remoteAddress ||
    'anonymous'
  ).toString().split(',')[0].trim();

  // 2. Fetch existing session stats from site_settings
  let total = 0;
  let countryMap: Record<string, number> = {};

  try {
    const { data: row } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'visitor_stats')
      .single();

    if (row && row.value) {
      try {
        const parsed = JSON.parse(row.value);
        total = Number(parsed.total) || 0;
        countryMap = parsed.countries || {};
      } catch (e) {}
    }
  } catch (err) {}

  // 3. Handle POST: Register a new unique browsing session
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    const sessionId = (body?.sessionId || clientIp).toString();
    const now = Date.now();

    // Clean up expired sessions periodically
    if (activeSessions.size > 5000) {
      for (const [key, timestamp] of activeSessions.entries()) {
        if (now - timestamp > SESSION_TTL_MS) {
          activeSessions.delete(key);
        }
      }
    }

    const lastSeen = activeSessions.get(sessionId);

    // Only count as a new session if not seen in the active window
    if (!lastSeen || now - lastSeen > SESSION_TTL_MS) {
      activeSessions.set(sessionId, now);

      total += 1;
      countryMap[countryCode] = (countryMap[countryCode] || 0) + 1;

      // Upsert back to database
      const updatedValue = JSON.stringify({
        total,
        countries: countryMap,
        lastUpdated: new Date().toISOString(),
      });

      await supabase
        .from('site_settings')
        .upsert({
          key: 'visitor_stats',
          value: updatedValue,
          updated_at: new Date().toISOString(),
        });
    }
  }

  // Dynamically pull and format every country that has visited
  const countryList = Object.entries(countryMap)
    .filter(([_, count]) => Number(count) > 0)
    .map(([code, count]) => ({
      code: code.toUpperCase(),
      name: getCountryName(code),
      flag: getCountryFlag(code),
      flagUrl: `https://flagcdn.com/w40/${code.toLowerCase()}.png`,
      count: Number(count),
    }))
    .sort((a, b) => b.count - a.count);

  return res.status(200).json({
    total,
    sessions: total,
    countries: countryList,
    currentCountry: countryCode,
  });
}
