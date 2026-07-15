const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.local') });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: events } = await supabase.from('events').select('title, image');
  console.log("Events:", events);
  const { data: achs } = await supabase.from('achievements').select('title, image');
  console.log("Achs:", achs);
}
run();
