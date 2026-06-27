require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const items = await prisma.item.findMany({
    where: { category: { slug: 'geel' }, name: { contains: 'Hasha' } },
    include: { category: true },
  });
  console.log('Prisma items:', JSON.stringify(items, null, 2));
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
