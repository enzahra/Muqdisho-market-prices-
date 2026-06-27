const { Client } = require('pg');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dataset = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/livestock-prices.json'), 'utf8')
);

function activePrice(seasonal) {
  const JIILAAL = [12, 1, 2];
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return seasonal.gu ?? seasonal.xagaa ?? seasonal.dayr ?? seasonal.jiilaal ?? 0;
  if (month >= 6 && month <= 9) return seasonal.xagaa ?? seasonal.gu ?? seasonal.dayr ?? seasonal.jiilaal ?? 0;
  if (month >= 10 && month <= 11) return seasonal.dayr ?? seasonal.gu ?? seasonal.xagaa ?? seasonal.jiilaal ?? 0;
  if (JIILAAL.includes(month) || month === 12) return seasonal.jiilaal ?? seasonal.dayr ?? seasonal.xagaa ?? seasonal.gu ?? 0;
  return seasonal.jiilaal ?? 0;
}

function slugify(name, suffix = '') {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return suffix ? `${base}-${suffix}` : base;
}

async function clearCategoryItems(c, slug) {
  await c.query(`
    DELETE FROM "PriceRecord"
    WHERE "itemId" IN (
      SELECT i.id FROM "Item" i
      JOIN "Category" cat ON i."categoryId" = cat.id
      WHERE cat.slug = $1
    )
  `, [slug]);
  await c.query(`
    DELETE FROM "Item"
    WHERE "categoryId" IN (SELECT id FROM "Category" WHERE slug = $1)
  `, [slug]);
}

async function upsertItem(c, catId, fullItemName, itemSlug, seasonal) {
  const priceGu = seasonal.gu ?? null;
  const priceXagaa = seasonal.xagaa ?? null;
  const priceDayr = seasonal.dayr ?? null;
  const priceJiilaal = seasonal.jiilaal ?? null;
  const currentPrice = activePrice(seasonal);
  const itemId = crypto.randomUUID();

  await c.query(`
    INSERT INTO "Item" (id, name, slug, "categoryId", "currentPrice", "priceGu", "priceXagaa", "priceDayr", "priceJiilaal", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    ON CONFLICT (slug, "categoryId") DO UPDATE SET
      name = $2,
      "currentPrice" = $5,
      "priceGu" = $6,
      "priceXagaa" = $7,
      "priceDayr" = $8,
      "priceJiilaal" = $9,
      "updatedAt" = NOW()
  `, [itemId, fullItemName, itemSlug, catId, currentPrice, priceGu, priceXagaa, priceDayr, priceJiilaal]);
}

async function main() {
  console.log('Seeding livestock from data/livestock-prices.json...');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  await c.connect();

  for (const cat of dataset.categories) {
    console.log(`Resetting ${cat.slug}...`);
    await clearCategoryItems(c, cat.slug);

    const catId = crypto.randomUUID();
    await c.query(`
      INSERT INTO "Category" (id, slug, name, description, "createdAt")
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (slug) DO UPDATE SET name = $3, description = $4
    `, [catId, cat.slug, cat.name, `Qiimaha rasmiga ah ee ${cat.name}`]);

    const resCat = await c.query('SELECT id FROM "Category" WHERE slug = $1', [cat.slug]);
    const actualCatId = resCat.rows[0].id;

    for (const item of cat.items) {
      if (item.birimo) {
        await upsertItem(
          c, actualCatId, `${item.name} (Birimo)`, slugify(item.name, 'birimo'), item.birimo
        );
      }
      if (item.sugunto) {
        await upsertItem(
          c, actualCatId, `${item.name} (Sugunto)`, slugify(item.name, 'sugunto'), item.sugunto
        );
      }
      if (!item.birimo && !item.sugunto && item.seasonal) {
        await upsertItem(c, actualCatId, item.name, slugify(item.name), item.seasonal);
      }
    }
  }

  console.log('Livestock seed completed successfully!');
  await c.end();
}

main().catch(console.error);
