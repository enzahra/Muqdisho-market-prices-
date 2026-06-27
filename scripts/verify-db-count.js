require('dotenv').config();
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(`
    SELECT cat.slug, COUNT(i.id)::int AS items
    FROM "Item" i
    JOIN "Category" cat ON i."categoryId" = cat.id
    WHERE cat.slug IN ('geel','lo','ari')
    GROUP BY cat.slug ORDER BY cat.slug
  `);
  console.log('DB items:', r.rows);
  await c.end();
})();
