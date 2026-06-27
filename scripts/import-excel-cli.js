/**
 * Import Excel directly to DB + JSON (same logic as upload API).
 * Usage: node scripts/import-excel-cli.js "path/to/file.xlsx"
 */
require('dotenv').config();
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { Client } = require('pg');
const XLSX = require('xlsx');

const DATA_FILE = path.join(__dirname, '../data/livestock-prices.json');

function normalizeKey(key) {
  return String(key).toLowerCase().trim().replace(/[''`]/g, '').replace(/[^a-z0-9]/g, '');
}

const HEADER_ALIASES = {
  category: ['xoolaha', 'category', 'qaybta'],
  name: ['nuuca', 'nooca', 'name', 'magac'],
  grade: ['heerka', 'heer', 'grade'],
  season: ['xilliga', 'season'],
  price: ['qiimahausd', 'qiimaha', 'price'],
  gu: ['gu'], xagaa: ['xagaa'], dayr: ['dayr'], jiilaal: ['jiilaal'],
};

function headerMatches(nk, aliases) {
  return aliases.some((a) => nk === a || nk.startsWith(a) || nk.includes(a));
}

function findColumn(headers, aliases) {
  const n = headers.map((h) => normalizeKey(h));
  for (let i = 0; i < n.length; i++) if (headerMatches(n[i], aliases)) return i;
  return -1;
}

function parsePriceValue(value) {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number' && value > 0) return value;
  const nums = String(value).match(/[\d,]+(?:\.\d+)?/g);
  if (!nums) return undefined;
  const parsed = nums.map((x) => Number(x.replace(/,/g, ''))).filter((n) => n > 0);
  return parsed.length ? Math.max(...parsed) : undefined;
}

function normalizeCategory(v) {
  const s = String(v).toLowerCase().trim().replace(/[''`]/g, '');
  if (!s) return null;
  if (s.includes('geel')) return 'geel';
  if (s.includes('ari')) return 'ari';
  if (s.includes('lo')) return 'lo';
  return null;
}

function normalizeGrade(v) {
  const s = String(v).toLowerCase().trim();
  if (s.includes('birimo') || s.includes('barimo')) return 'birimo';
  if (s.includes('sugunto') || s.includes('sukunto')) return 'sugunto';
  return null;
}

function normalizeSeason(v) {
  const s = normalizeKey(v);
  if (s.startsWith('gu')) return 'gu';
  if (s.includes('xagaa')) return 'xagaa';
  if (s.includes('dayr')) return 'dayr';
  if (s.includes('jiilaal') || s.includes('jilaal')) return 'jiilaal';
  return null;
}

function slugify(name, suffix = '') {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return suffix ? `${base}-${suffix}` : base;
}

function activePrice(seasonal) {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return seasonal.gu ?? seasonal.xagaa ?? seasonal.dayr ?? seasonal.jiilaal ?? 0;
  if (month >= 6 && month <= 9) return seasonal.xagaa ?? seasonal.gu ?? seasonal.dayr ?? seasonal.jiilaal ?? 0;
  if (month >= 10 && month <= 11) return seasonal.dayr ?? seasonal.gu ?? seasonal.xagaa ?? seasonal.jiilaal ?? 0;
  return seasonal.jiilaal ?? seasonal.dayr ?? seasonal.xagaa ?? seasonal.gu ?? 0;
}

function parseExcel(buffer) {
  const sheet = XLSX.read(buffer, { type: 'buffer' }).Sheets.Sheet1;
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headers = aoa[0].map(String);
  const cols = {
    category: findColumn(headers, HEADER_ALIASES.category),
    name: findColumn(headers, HEADER_ALIASES.name),
    grade: findColumn(headers, HEADER_ALIASES.grade),
    season: findColumn(headers, HEADER_ALIASES.season),
    price: findColumn(headers, HEADER_ALIASES.price),
  };

  const categoryMap = { geel: new Map(), lo: new Map(), ari: new Map() };
  let lastCat = null;

  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row.some((c) => String(c).trim())) continue;

    const catRaw = String(row[cols.category] || '').trim();
    const cat = normalizeCategory(catRaw) || (catRaw ? null : lastCat);
    if (normalizeCategory(catRaw)) lastCat = normalizeCategory(catRaw);

    const name = String(row[cols.name] || '').trim();
    const grade = normalizeGrade(row[cols.grade]);
    const season = normalizeSeason(row[cols.season]);
    const price = parsePriceValue(row[cols.price]);
    const category = cat || lastCat;

    if (!category || !name || !grade || !season || price == null) continue;

    if (!categoryMap[category].has(name)) categoryMap[category].set(name, { name });
    const item = categoryMap[category].get(name);
    const key = grade === 'birimo' ? 'birimo' : 'sugunto';
    if (!item[key]) item[key] = {};
    item[key][season] = price;
  }

  const CATEGORY_NAMES = { geel: 'Geel (Camels)', lo: "Lo'da (Cattle)", ari: 'Ariga (Goat/Sheep)' };
  const categories = ['geel', 'lo', 'ari']
    .filter((s) => categoryMap[s].size > 0)
    .map((slug) => ({
      slug,
      name: CATEGORY_NAMES[slug],
      items: [...categoryMap[slug].values()],
    }));

  if (!categories.length) throw new Error('No data parsed from Excel');
  return { meta: { source: 'Excel upload', uploadedAt: new Date().toISOString() }, categories };
}

async function applyToDb(c, dataset) {
  for (const cat of dataset.categories) {
    await c.query(`DELETE FROM "PriceRecord" WHERE "itemId" IN (SELECT i.id FROM "Item" i JOIN "Category" cat ON i."categoryId"=cat.id WHERE cat.slug=$1)`, [cat.slug]);
    await c.query(`DELETE FROM "Item" WHERE "categoryId" IN (SELECT id FROM "Category" WHERE slug=$1)`, [cat.slug]);

    await c.query(
      `INSERT INTO "Category" (id, slug, name, description, "createdAt") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT (slug) DO UPDATE SET name=$3, description=$4`,
      [crypto.randomUUID(), cat.slug, cat.name, `Qiimaha rasmiga ah ee ${cat.name}`]
    );
    const { rows } = await c.query('SELECT id FROM "Category" WHERE slug=$1', [cat.slug]);
    const catId = rows[0].id;

    for (const item of cat.items) {
      for (const [label, seasonal] of [['Birimo', item.birimo], ['Sugunto', item.sugunto]]) {
        if (!seasonal) continue;
        const fullName = `${item.name} (${label})`;
        const slug = slugify(item.name, label.toLowerCase());
        const cp = activePrice(seasonal);
        await c.query(
          `INSERT INTO "Item" (id,name,slug,"categoryId","currentPrice","priceGu","priceXagaa","priceDayr","priceJiilaal","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
           ON CONFLICT (slug,"categoryId") DO UPDATE SET name=$2,"currentPrice"=$5,"priceGu"=$6,"priceXagaa"=$7,"priceDayr"=$8,"priceJiilaal"=$9,"updatedAt"=NOW()`,
          [crypto.randomUUID(), fullName, slug, catId, cp, seasonal.gu ?? null, seasonal.xagaa ?? null, seasonal.dayr ?? null, seasonal.jiilaal ?? null]
        );
      }
    }
  }
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new Error('Provide Excel path');
  const buffer = fs.readFileSync(filePath);
  const dataset = parseExcel(buffer);

  console.log('Parsed:');
  for (const cat of dataset.categories) {
    console.log(`  ${cat.slug}: ${cat.items.length} breeds — ${cat.items.map((i) => i.name).join(', ')}`);
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(dataset, null, 2) + '\n');
  console.log('Saved', DATA_FILE);

  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await applyToDb(c, dataset);
  await c.end();
  console.log('Database updated.');
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
