/**
 * Seeds water & electricity with year-based rate items (Neon / production fix).
 * Run: npm run db:seed-utilities
 */
require("dotenv").config({ path: ".env", override: true });
const { randomUUID } = require("crypto");
const { Client } = require("pg");

const YEAR = String(new Date().getFullYear());

const WATER_COMPANIES = [
  { name: "Towfiiq", year: "2025", price: 1.4 },
  { name: "Wabax", year: "2019", price: 1.5 },
];

const ELECTRICITY_COMPANIES = [
  { name: "Beco" },
  { name: "Muqdisho Power" },
  { name: "Blue Sky" },
];

const ELECTRICITY_RATES = [
  { label: "Home Guri", price: 0.42 },
  { label: "Shirkad  Laamo badan", price: 0.35 },
  { label: "Shirkad  Hal laan", price: 0.3 },
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function waterItemName(company, year) {
  return `${company} (${year})`;
}

function electricityItemName(company, year, label) {
  return `${company} (${year}) · ${label}`;
}

async function upsertItem(client, categoryId, name, slug, price) {
  const existing = await client.query(
    `SELECT id FROM "Item" WHERE slug = $1 AND "categoryId" = $2`,
    [slug, categoryId]
  );

  if (existing.rows[0]) {
    await client.query(
      `UPDATE "Item" SET name = $1, "currentPrice" = $2, "updatedAt" = NOW() WHERE id = $3`,
      [name, price, existing.rows[0].id]
    );
    return existing.rows[0].id;
  }

  const id = randomUUID();
  await client.query(
    `INSERT INTO "Item" (id, name, slug, "categoryId", "currentPrice", "sortOrder", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 0, NOW(), NOW())`,
    [id, name, slug, categoryId, price]
  );
  return id;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL ma jiro .env file-ka gudahiisa.");
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    const waterCat = (
      await client.query(`SELECT id FROM "Category" WHERE slug = 'water'`)
    ).rows[0];
    const elecCat = (
      await client.query(`SELECT id FROM "Category" WHERE slug = 'electricity'`)
    ).rows[0];

    if (!waterCat || !elecCat) {
      throw new Error("Water ama electricity category ma jiro. Marka hore orod: npm run db:seed");
    }

    const catIds = [waterCat.id, elecCat.id];

    await client.query(
      `DELETE FROM "PriceRecord" WHERE "itemId" IN (
        SELECT id FROM "Item" WHERE "categoryId" = ANY($1::text[])
      )`,
      [catIds]
    );
    await client.query(`DELETE FROM "Item" WHERE "categoryId" = ANY($1::text[])`, [catIds]);

    console.log("Biyaha...");
    for (const co of WATER_COMPANIES) {
      const year = co.year || YEAR;
      const name = waterItemName(co.name, year);
      const slug = slugify(`${co.name}-${year}`);
      await upsertItem(client, waterCat.id, name, slug, co.price);
      console.log(`  ✓ ${name} — $${co.price.toFixed(2)}/m³`);
    }

    console.log("Korontada...");
    for (const co of ELECTRICITY_COMPANIES) {
      for (const rate of ELECTRICITY_RATES) {
        const name = electricityItemName(co.name, YEAR, rate.label);
        const slug = slugify(`${co.name}-${YEAR}-${rate.label}`);
        await upsertItem(client, elecCat.id, name, slug, rate.price);
        console.log(`  ✓ ${name} — $${rate.price}/kWh`);
      }
    }

    await client.query("COMMIT");
    console.log(`\nUtility seed wuu dhammaaday (sanadka ${YEAR}).`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
