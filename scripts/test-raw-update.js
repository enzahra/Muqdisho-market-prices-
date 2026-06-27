require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const item = await prisma.item.findFirst({
    where: { name: 'Hasha (Birimo)', category: { slug: 'geel' } },
  });
  if (!item) throw new Error('item not found');

  try {
    await prisma.$executeRaw`
      UPDATE "Item"
      SET
        "priceCaadi" = ${1555},
        "priceJiilaal" = ${1222},
        "currentPrice" = ${1222},
        "updatedAt" = NOW()
      WHERE id = ${item.id}
    `;
    console.log('Raw update OK');
  } catch (e) {
    console.error('Raw update FAILED:', e);
  }

  const rows = await prisma.$queryRaw`
    SELECT "priceCaadi", "priceJiilaal", "currentPrice" FROM "Item" WHERE id = ${item.id}
  `;
  console.log(rows[0]);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
