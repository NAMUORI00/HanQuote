import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_DIR = path.resolve('data');
const DATA_FILE = path.join(DATA_DIR, 'quotes.json');
const SITE_DATA_DIR = path.resolve('site', 'data');

async function main() {
  console.log('Reading quotes.json...');
  const list = await readJsonArray(DATA_FILE);
  console.log(`Total quotes before deduplication: ${list.length}`);

  const seen = new Map(); // hash -> first occurrence
  const unique = [];
  let duplicateCount = 0;

  for (const quote of list) {
    const norm = normalizeText(quote.text_original);
    const hash = sha256(norm);

    if (seen.has(hash)) {
      // Duplicate found
      duplicateCount++;
      console.log(`Duplicate found: "${quote.text_original.slice(0, 50)}..." (hash: ${hash.slice(0, 8)})`);
      continue;
    }

    // First occurrence - keep it
    seen.set(hash, quote);

    // Update hash field to ensure consistency
    const updatedQuote = {
      ...quote,
      hash: `sha256:${hash}`
    };
    unique.push(updatedQuote);
  }

  console.log(`\nDeduplication complete:`);
  console.log(`  Before: ${list.length} quotes`);
  console.log(`  After: ${unique.length} quotes`);
  console.log(`  Removed: ${duplicateCount} duplicates`);

  if (duplicateCount > 0) {
    // Write deduplicated data
    await atomicWrite(DATA_FILE, JSON.stringify(unique, null, 2) + '\n');

    // Mirror to site/data
    await ensureDir(SITE_DATA_DIR);
    const siteDataPath = path.join(SITE_DATA_DIR, 'quotes.json');
    await atomicWrite(siteDataPath, JSON.stringify(unique, null, 2) + '\n');

    console.log('\nDeduplicated data written successfully!');
  } else {
    console.log('\nNo duplicates found. Data is already clean!');
  }
}

function normalizeText(s) {
  return (s || '')
    .replace(/[\s\n\r\t]+/g, ' ')
    .trim()
    .toLowerCase();
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

async function readJsonArray(p) {
  try {
    const buf = await fs.readFile(p);
    const data = JSON.parse(String(buf));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Failed to read file:', e.message);
    return [];
  }
}

async function atomicWrite(dest, content) {
  const dir = path.dirname(dest);
  await ensureDir(dir);
  const tmp = path.join(dir, `.tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`);
  await fs.writeFile(tmp, content);
  await fs.rename(tmp, dest);
}

async function ensureDir(d) {
  await fs.mkdir(d, { recursive: true });
}

// Run
main().catch(err => {
  console.error('Error:', err);
  process.exitCode = 1;
});