import { createClient } from '@supabase/supabase-js';

// Default to the project's production Supabase URL and anon key if env vars are missing at build time
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://ygougrhejaesbtifacdk.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_MIl6WWMSsnArxxjzOTB4hw_FK1sBh3z';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
