const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env.local') });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function run() {
  const publicDir = path.join(__dirname, 'public');
  const dirsToUpload = ['team-assets', 'events-assets', 'achievements-assets'];
  
  for (const dirName of dirsToUpload) {
    const dirPath = path.join(publicDir, dirName);
    const files = getFiles(dirPath);
    
    // Get existing files in the bucket for this directory
    const { data: existingData } = await supabase.storage.from('public_images').list(dirName, { limit: 100 });
    const existingSet = new Set(existingData ? existingData.map(f => f.name) : []);

    for (const localPath of files) {
      if (!localPath.match(/\.(jpg|jpeg|png|gif|svg)$/i)) continue;
      const destPath = path.relative(publicDir, localPath).replace(/\\/g, '/');
      const filename = path.basename(destPath);
      
      if (existingSet.has(filename)) {
        console.log(`Skipping ${destPath}, already exists.`);
        continue;
      }

      const fileBuffer = fs.readFileSync(localPath);
      const ext = path.extname(localPath).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg';

      console.log(`Uploading ${destPath} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);
      const { error } = await supabase.storage.from('public_images').upload(destPath, fileBuffer, {
        contentType,
        upsert: true
      });
      
      if (error) {
        console.error(`Failed ${destPath}:`, error.message);
      } else {
        console.log(`Done ${destPath}`);
      }
    }
  }
}

run().then(() => console.log('All missing files uploaded.'));
