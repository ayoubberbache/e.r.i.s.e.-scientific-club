import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ygougrhejaesbtifacdk.supabase.co';
const supabaseKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'sb_publishable_MIl6WWMSsnArxxjzOTB4hw_FK1sBh3z';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
