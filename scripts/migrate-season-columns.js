require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  await c.query(`ALTER TABLE "Item" DROP COLUMN IF EXISTS "priceCaadi";`);

  await c.query(`
    ALTER TABLE "Item"
      ADD COLUMN IF NOT EXISTS "priceGu" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "priceXagaa" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "priceDayr" DOUBLE PRECISION;
  `);

  await c.query(`ALTER TABLE "Item" DROP COLUMN IF EXISTS "priceJiilaal";`);
  await c.query(`ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "priceJiilaal" DOUBLE PRECISION;`);

  console.log('Migration complete.');
  await c.end();
}

main().catch(console.error);
