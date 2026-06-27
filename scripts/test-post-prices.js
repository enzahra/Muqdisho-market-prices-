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

  // Login
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'super@admin.com',
      password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!',
      forAdmin: true,
    }),
  });
  const setCookie = loginRes.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0];
  console.log('Login status:', loginRes.status, cookie ? 'got cookie' : 'NO COOKIE');

  const postRes = await fetch('http://localhost:3000/api/prices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      itemId: item.id,
      priceCaadi: 1550,
      priceJiilaal: 1250,
      updatedBy: 'super@admin.com',
    }),
  });
  const text = await postRes.text();
  console.log('POST status:', postRes.status);
  console.log('POST body:', text);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
