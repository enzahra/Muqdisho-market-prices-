require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const item = await prisma.item.findFirst({
    where: { name: 'Hasha (Birimo)', category: { slug: 'geel' } },
    include: { category: true },
  });
  if (!item) {
    console.log('No item found');
    return;
  }
  console.log('Item id:', item.id);

  try {
    const updated = await prisma.item.update({
      where: { id: item.id },
      data: {
        priceCaadi: 1500,
        priceJiilaal: 1200,
        currentPrice: 1200,
      },
    });
    console.log('Update OK:', updated.priceCaadi, updated.priceJiilaal);
  } catch (e) {
    console.error('Update FAILED:', e.message);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
