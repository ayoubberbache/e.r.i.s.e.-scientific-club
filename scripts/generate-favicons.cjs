/**
 * generate-favicons.cjs
 *
 * Reads the source E-logo (public/logo-cyan.png), trims its whitespace,
 * then generates multiple favicon sizes with minimal transparent padding
 * so the icon fills ~80% of the output area.
 *
 * Also generates a favicon.ico (contains 16×16 and 32×32 layers).
 *
 * Usage:  node scripts/generate-favicons.cjs
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PUBLIC = path.resolve(__dirname, '..', 'public');
const SOURCE = path.join(PUBLIC, 'logo-cyan.png');

/** Favicon targets: [filename, size] */
const TARGETS = [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['apple-touch-icon.png', 180],
  ['favicon-192x192.png', 192],
  ['favicon-512x512.png', 512],
];

/**
 * Generates a single favicon PNG.
 *
 * 1. Trims transparent/white padding from the source.
 * 2. Computes the inner content size (~80% of target) leaving ~10% padding per side.
 * 3. Resizes the trimmed logo into the inner content area.
 * 4. Composites it centered onto a transparent canvas of the target size.
 */
async function generateFavicon(trimmedBuffer, targetSize, outputPath) {
  // ~10% padding on each side → content occupies ~80%
  const paddingFraction = 0.10;
  const contentSize = Math.round(targetSize * (1 - 2 * paddingFraction));

  // Resize the trimmed logo to fit within the content area (contain = preserve aspect ratio)
  const resized = await sharp(trimmedBuffer)
    .resize(contentSize, contentSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Create transparent canvas and composite the resized logo in the center
  const offset = Math.round((targetSize - contentSize) / 2);

  await sharp({
    create: {
      width: targetSize,
      height: targetSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left: offset, top: offset }])
    .png()
    .toFile(outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`  ✓ ${path.basename(outputPath)} (${targetSize}×${targetSize}) — ${stats.size} bytes`);
}

/**
 * Generates a minimal favicon.ico containing 16×16 and 32×32 PNG layers.
 * ICO format: header + directory entries + PNG payloads.
 */
async function generateIco(trimmedBuffer, outputPath) {
  const sizes = [16, 32];
  const pngBuffers = [];

  for (const size of sizes) {
    const paddingFraction = 0.10;
    const contentSize = Math.round(size * (1 - 2 * paddingFraction));
    const offset = Math.round((size - contentSize) / 2);

    const resized = await sharp(trimmedBuffer)
      .resize(contentSize, contentSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const pngBuf = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resized, left: offset, top: offset }])
      .png()
      .toBuffer();

    pngBuffers.push({ size, data: pngBuf });
  }

  // ICO binary format
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;

  let dataOffset = headerSize + dirSize;
  const dirEntries = [];

  for (const { size, data } of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size < 256 ? size : 0, 0);   // width  (0 = 256)
    entry.writeUInt8(size < 256 ? size : 0, 1);   // height (0 = 256)
    entry.writeUInt8(0, 2);                         // color palette
    entry.writeUInt8(0, 3);                         // reserved
    entry.writeUInt16LE(1, 4);                      // color planes
    entry.writeUInt16LE(32, 6);                     // bits per pixel
    entry.writeUInt32LE(data.length, 8);            // data size
    entry.writeUInt32LE(dataOffset, 12);            // data offset
    dirEntries.push(entry);
    dataOffset += data.length;
  }

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);           // reserved
  header.writeUInt16LE(1, 2);           // type: 1 = ICO
  header.writeUInt16LE(numImages, 4);   // number of images

  const ico = Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map((p) => p.data),
  ]);

  fs.writeFileSync(outputPath, ico);
  console.log(`  ✓ favicon.ico (16+32 layers) — ${ico.length} bytes`);
}

async function main() {
  console.log('🔧 Generating favicons from:', SOURCE);
  console.log();

  // Step 1: Trim whitespace from source
  const trimmedBuffer = await sharp(SOURCE)
    .trim()          // auto-detect and crop surrounding whitespace
    .png()
    .toBuffer();

  const trimmedMeta = await sharp(trimmedBuffer).metadata();
  console.log(`  Source trimmed to ${trimmedMeta.width}×${trimmedMeta.height}`);
  console.log();

  // Step 2: Generate all PNG favicons
  for (const [filename, size] of TARGETS) {
    const outputPath = path.join(PUBLIC, filename);
    await generateFavicon(trimmedBuffer, size, outputPath);
  }

  // Step 3: Generate favicon.ico
  const icoPath = path.join(PUBLIC, 'favicon.ico');
  await generateIco(trimmedBuffer, icoPath);

  console.log();
  console.log('✅ All favicons generated successfully!');
}

main().catch((err) => {
  console.error('❌ Error generating favicons:', err);
  process.exit(1);
});
