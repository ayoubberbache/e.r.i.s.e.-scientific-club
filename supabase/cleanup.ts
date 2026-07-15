import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

async function cleanup() {
  const tables = [
    { name: 'events', uniqueField: 'title' },
    { name: 'leaders', uniqueField: 'name' },
    { name: 'achievements', uniqueField: 'title' }
  ];

  for (const table of tables) {
    console.log(`Cleaning up ${table.name}...`);
    const { data, error } = await supabase.from(table.name).select('*').order('id', { ascending: true });
    if (error) {
      console.error(`Error fetching from ${table.name}:`, error);
      continue;
    }

    const seen = new Set();
    const toDelete = [];

    for (const row of data) {
      const val = row[table.uniqueField];
      if (seen.has(val)) {
        toDelete.push(row.id);
      } else {
        seen.add(val);
      }
    }

    if (toDelete.length > 0) {
      console.log(`Deleting ${toDelete.length} duplicates from ${table.name}...`);
      // Supabase .in() is limited to a certain number of elements, but we have very few so it's fine.
      const { error: delError } = await supabase.from(table.name).delete().in('id', toDelete);
      if (delError) {
        console.error(`Error deleting from ${table.name}:`, delError);
      } else {
        console.log(`Successfully deleted duplicates from ${table.name}.`);
      }
    } else {
      console.log(`No duplicates found in ${table.name}.`);
    }
  }
}

cleanup().then(() => console.log('Cleanup complete!'));
