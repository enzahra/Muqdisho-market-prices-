require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(`
    SELECT i.name, i."currentPrice", i."priceCaadi", i."priceJiilaal", cat.slug
    FROM "Item" i
    JOIN "Category" cat ON i."categoryId" = cat.id
    WHERE cat.slug IN ('geel', 'lo', 'ari')
    ORDER BY cat.slug, i.name
    LIMIT 20
  `);
  console.log('Sample items:', r.rows.length);
  r.rows.forEach((row) => console.log(row));
  const zero = await c.query(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN "priceCaadi" IS NULL OR "priceCaadi" = 0 THEN 1 ELSE 0 END) as zero_caadi,
           SUM(CASE WHEN "priceJiilaal" IS NULL OR "priceJiilaal" = 0 THEN 1 ELSE 0 END) as zero_jiilaal
    FROM "Item" i
    JOIN "Category" cat ON i."categoryId" = cat.id
    WHERE cat.slug IN ('geel', 'lo', 'ari')
  `);
  console.log('Stats:', zero.rows[0]);
  await c.end();
}

main().catch(console.error);
