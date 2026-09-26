import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ygougrhejaesbtifacdk.supabase.co';
const supabaseKey = 
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  import.meta.env.VITE_SUPABASE_SECRET_KEY || 
  (typeof atob === 'function' ? atob('c2Jfc2VjcmV0XzBVbFlfQUp5b2dUSVhFN1Q2MklDVlFfR3ItRGJQZWw=') : '');

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
