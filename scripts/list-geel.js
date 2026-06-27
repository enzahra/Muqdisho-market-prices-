require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(`
    SELECT i.name, i."currentPrice", i."priceCaadi", i."priceJiilaal", cat.slug
    FROM "Item" i
    JOIN "Category" cat ON i."categoryId" = cat.id
    WHERE cat.slug = 'geel'
    ORDER BY i.name
  `);
  r.rows.forEach((row) => console.log(row));
  await c.end();
}

main().catch(console.error);
