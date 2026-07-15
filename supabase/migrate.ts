import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Use secret key for admin privileges

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Secret Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// We'll read the data from the source file dynamically to avoid TS compilation issues in Node
const dataFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'siteData.ts'), 'utf-8');

// A quick and dirty way to extract the arrays since we can't easily require a ts file with ES modules in a simple script sometimes
// We'll use ts-node to run this, so we can just import it!
import { LEADERS, EVENTS, ACHIEVEMENTS } from '../src/data/siteData.ts';

async function uploadImage(localPathStr: string): Promise<string> {
  // localPathStr is like "/team-assets/Ayoub.jpg"
  if (!localPathStr.startsWith('/')) return localPathStr; // Already a full URL or invalid

  const localPath = path.join(__dirname, '..', 'public', localPathStr);
  const destPath = localPathStr.substring(1); // remove leading slash, e.g. "team-assets/Ayoub.jpg"

  if (!fs.existsSync(localPath)) {
    console.warn(`File not found locally: ${localPath}`);
    return localPathStr;
  }

  const fileBuffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg';

  console.log(`Uploading ${localPathStr}...`);
  const { data, error } = await supabase.storage
    .from('public_images')
    .upload(destPath, fileBuffer, {
      contentType: contentType,
      upsert: true
    });

  if (error) {
    console.error(`Failed to upload ${localPathStr}:`, error.message);
    return localPathStr;
  }

  const { data: publicData } = supabase.storage.from('public_images').getPublicUrl(destPath);
  return publicData.publicUrl;
}

async function migrate() {
  console.log('Starting migration...');

  // 1. Ensure bucket exists
  console.log('Ensuring public_images bucket exists...');
  await supabase.storage.createBucket('public_images', { public: true }).catch(() => {});

  // 2. Migrate Leaders
  console.log('\n--- Migrating Leaders ---');
  for (const leader of LEADERS) {
    const onlineImage = await uploadImage(leader.image);
    const { error } = await supabase.from('leaders').insert([{
      name: leader.name,
      role: leader.role,
      image: onlineImage,
      specialty: leader.specialty,
      socials: leader.socials
    }]);
    if (error) console.error(`Error inserting leader ${leader.name}:`, error.message);
    else console.log(`Inserted leader: ${leader.name}`);
  }

  // 3. Migrate Events
  console.log('\n--- Migrating Events ---');
  for (const event of EVENTS) {
    const onlineImage = await uploadImage(event.image);
    const { error } = await supabase.from('events').insert([{
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      status: event.status || 'upcoming',
      image: onlineImage
    }]);
    if (error) console.error(`Error inserting event ${event.title}:`, error.message);
    else console.log(`Inserted event: ${event.title}`);
  }

  // 4. Migrate Achievements
  console.log('\n--- Migrating Achievements ---');
  for (const ach of ACHIEVEMENTS) {
    const onlineImage = await uploadImage(ach.image);
    const { error } = await supabase.from('achievements').insert([{
      title: ach.title,
      description: ach.description,
      year: ach.year,
      category: ach.category,
      image: onlineImage
    }]);
    if (error) console.error(`Error inserting achievement ${ach.title}:`, error.message);
    else console.log(`Inserted achievement: ${ach.title}`);
  }

  console.log('\nMigration complete! 🎉');
}

migrate().catch(console.error);
