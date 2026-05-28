const { Client } = require('pg');

async function main() {
  console.log('Starting livestock seed with pg...');
  const c = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123@localhost:5432/muqdisho_market'
  });
  await c.connect();

  const categories = [
    {
      slug: "geel",
      name: "Geel (Camels)",
      items: ["Hasha", "Ratiga", "Qaalinka", "Qaalimada"]
    },
    {
      slug: "lo",
      name: "Lo'da (Cattle)",
      items: ["Sac", "Dibiga", "Weysha", "Weyl (Lab)"]
    },
    {
      slug: "ari",
      name: "Ariga (Goat/Sheep)",
      items: ["Orgi (Lab)", "Ri' (Dheddig)", "Waxar"]
    }

  ];

  const marketTypes = ["Birimo", "Sugunto"];

  for (const cat of categories) {
    // Insert or Update Category
    const catId = require('crypto').randomUUID();
    await c.query(`
      INSERT INTO "Category" (id, slug, name, description, "createdAt")
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (slug) DO UPDATE SET name = $3, description = $4
      RETURNING id
    `, [catId, cat.slug, cat.name, `Qiimaha rasmiga ah ee ${cat.name}`]);
    
    // Get the actual ID (either the new one or existing one)
    const resCat = await c.query('SELECT id FROM "Category" WHERE slug = $1', [cat.slug]);
    const actualCatId = resCat.rows[0].id;

    for (const itemName of cat.items) {
      for (const marketType of marketTypes) {
        const fullItemName = `${itemName} (${marketType})`;
        const itemSlug = `${itemName.toLowerCase()}-${marketType.toLowerCase()}`;
        const itemId = require('crypto').randomUUID();

        await c.query(`
          INSERT INTO "Item" (id, name, slug, "categoryId", "currentPrice", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, 0, NOW(), NOW())
          ON CONFLICT (slug, "categoryId") DO UPDATE SET name = $2
        `, [itemId, fullItemName, itemSlug, actualCatId]);
      }
    }
  }

  console.log('Livestock seed completed successfully!');
  await c.end();
}

main().catch(console.error);

