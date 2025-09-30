import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_DIR = path.resolve('data');
const DATA_FILE = path.join(DATA_DIR, 'quotes.json');
const SITE_DATA_DIR = path.resolve('site', 'data');
let seedsCache = null;

// Load .env (best-effort, no dependency) before reading env vars
await loadDotenv();
const MAX_QUOTES_PER_RUN = parseInt(process.env.MAX_QUOTES_PER_RUN || '1', 10);
const OFFLINE_MODE = truthy(process.env.OFFLINE_MODE);
const DRY_RUN = truthy(process.env.DRY_RUN);

async function main() {
  await ensureDirs();
  const list = await readJsonArray(DATA_FILE);

  // Build a set of existing hashes for fast duplicate checking
  const existingHashes = new Set();
  for (const q of list) {
    if (q.hash) {
      existingHashes.add(q.hash.replace(/^sha256:/, ''));
    }
  }

  const items = await fetchQuotes(MAX_QUOTES_PER_RUN, existingHashes);
  if (items.length === 0) {
    console.log('No quotes fetched. Exiting.');
    return;
  }

  let appended = 0;
  for (const item of items) {
    const norm = normalizeText(item.text_original);
    const hash = sha256(norm);

    const now = new Date();
    const id = `${now.toISOString().slice(0,10)}_${hash.slice(0,10)}`;
    const record = {
      id,
      text_original: item.text_original,
      author: item.author ?? null,
      source_name: item.source_name ?? null,
      source_url: item.source_url ?? null,
      language: item.language || 'en',
      tags: Array.isArray(item.tags) ? item.tags : [],
      fetched_at: now.toISOString(),
      hash: `sha256:${hash}`
    };
    list.push(record);
    appended++;
  }

  if (appended > 0) {
    if (DRY_RUN) {
      console.log(`[DRY_RUN] Would write ${appended} item(s). Total would be ${list.length}`);
    } else {
      await atomicWrite(DATA_FILE, JSON.stringify(list, null, 2) + '\n');
      // mirror into site/data for Pages artifact deployment
      await ensureDir(SITE_DATA_DIR);
      const siteDataPath = path.join(SITE_DATA_DIR, 'quotes.json');
      await atomicWrite(siteDataPath, JSON.stringify(list, null, 2) + '\n');
      console.log(`Appended ${appended} new item(s). Total=${list.length}`);
    }
  } else {
    console.log('No new items appended.');
  }
}

async function fetchQuotes(n, existingHashes = new Set()) {
  const results = [];
  const seeds = await loadSeeds();
  const MAX_RETRIES = 10; // Maximum retries to find unique quotes

  for (let i = 0; i < n; i++) {
    let q = null;
    let retries = 0;

    // Keep trying until we get a unique quote or hit max retries
    while (retries < MAX_RETRIES) {
      if (OFFLINE_MODE) {
        q = selectSeed(seeds, i + retries);
      } else {
        q = await fetchFromQuotable();
        if (!q) q = selectSeed(seeds, i + retries);
      }

      if (!q && seeds.length > 0) {
        q = selectSeed(seeds, Math.floor(Math.random() * seeds.length));
      }

      if (!q) {
        console.warn('No fallback quote available.');
        break;
      }

      // Check if this quote is duplicate
      const norm = normalizeText(q.text_original);
      const hash = sha256(norm);

      if (!existingHashes.has(hash)) {
        // Found unique quote
        existingHashes.add(hash);
        results.push(q);
        break;
      }

      console.log(`Retry ${retries + 1}/${MAX_RETRIES}: Duplicate found, fetching another...`);
      retries++;

      // Small delay to avoid rate limiting
      if (!OFFLINE_MODE) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    if (retries >= MAX_RETRIES) {
      console.warn(`Failed to find unique quote after ${MAX_RETRIES} retries.`);
    }
  }
  return results;
}

async function fetchFromQuotable() {
  try {
    // Try new random endpoint that returns array
    let url = 'https://api.quotable.io/quotes/random?limit=1';
    let resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (resp.ok) {
      const arr = await resp.json();
      const it = Array.isArray(arr) ? arr[0] : null;
      if (it?.content) {
        return {
          text_original: it.content,
          author: it.author || null,
          source_name: 'Quotable',
          source_url: `https://api.quotable.io/quotes/${it._id ?? ''}`,
          language: 'en',
          tags: it.tags || []
        };
      }
    }

    // Fallback: legacy endpoint
    url = 'https://api.quotable.io/random';
    resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error(`quotable http ${resp.status}`);
    const it = await resp.json();
    return {
      text_original: it.content,
      author: it.author || null,
      source_name: 'Quotable',
      source_url: `https://api.quotable.io/quotes/${it._id ?? ''}`,
      language: 'en',
      tags: it.tags || []
    };
  } catch (err) {
    console.warn('fetchFromQuotable failed:', err?.message || err);
    return null;
  }
}

function selectSeed(seeds, index = 0) {
  if (!Array.isArray(seeds) || seeds.length === 0) return null;
  const normalizedIndex = ((index % seeds.length) + seeds.length) % seeds.length;
  const raw = seeds[normalizedIndex];
  return toQuoteObject(raw);
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

async function ensureDirs() {
  await ensureDir(DATA_DIR);
}

// Run if invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}

function truthy(v) {
  return ['1', 'true', 'yes', 'on'].includes(String(v || '').toLowerCase());
}

async function loadDotenv() {
  try {
    const envPath = path.resolve('.env');
    const txt = await fs.readFile(envPath, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = val;
    }
  } catch {}
}

async function loadSeeds() {
  if (Array.isArray(seedsCache)) return seedsCache;
  try {
    const p = path.resolve('data', 'seeds.json');
    const buf = await fs.readFile(p);
    const arr = JSON.parse(String(buf));
    seedsCache = Array.isArray(arr) ? arr.filter(it => it && typeof it.text_original === 'string') : [];
  } catch {
    seedsCache = [];
  }
  return seedsCache;
}

function toQuoteObject(raw) {
  if (!raw || typeof raw.text_original !== 'string' || raw.text_original.trim() === '') return null;
  return {
    text_original: raw.text_original,
    author: raw.author ?? null,
    source_name: raw.source_name ?? 'Seed',
    source_url: raw.source_url ?? null,
    language: raw.language ?? 'en',
    tags: Array.isArray(raw.tags) ? raw.tags : []
  };
}
