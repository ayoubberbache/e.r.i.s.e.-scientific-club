const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function uploadFile(localPathStr) {
  const localPath = path.join(__dirname, 'public', localPathStr);
  const destPath = localPathStr.replace(/^\//, '');

  if (!fs.existsSync(localPath)) {
    console.log(`Not found: ${localPath}`);
    return;
  }

  const fileBuffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

  console.log(`Uploading ${localPathStr} to ${destPath}...`);
  const { error } = await supabase.storage.from('public_images').upload(destPath, fileBuffer, {
    contentType,
    upsert: true
  });

  if (error) {
    console.error(`Failed to upload ${localPathStr}:`, error.message);
  } else {
    console.log(`Successfully uploaded ${localPathStr}`);
  }
}

async function run() {
  await uploadFile('/team-assets/our team.jpg');
  await uploadFile('/team-assets/Events.jpg');
}

run();
