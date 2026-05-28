require('dotenv').config()
const { Client } = require('pg')
const bcrypt = require('bcryptjs')

const EMAIL = 'super@admin.com'
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!'

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set in .env')
    process.exit(1)
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const hashed = await bcrypt.hash(PASSWORD, 10)
  const existing = await client.query('SELECT id, email, "adminRole" FROM "User" WHERE email = $1', [EMAIL])

  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE "User" SET "isAdmin" = true, "adminRole" = 'ALL', "fullName" = COALESCE("fullName", 'Super Admin'), "updatedAt" = NOW() WHERE email = $1`,
      [EMAIL]
    )
    console.log(`Updated: ${EMAIL} → adminRole=ALL`)
  } else {
    const id = `super_${Date.now()}`
    await client.query(
      `INSERT INTO "User" (id, email, password, "fullName", "isAdmin", "adminRole", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'Super Admin', true, 'ALL', NOW(), NOW())`,
      [id, EMAIL, hashed]
    )
    console.log(`Created: ${EMAIL} → adminRole=ALL`)
  }

  console.log(`Password: ${PASSWORD}`)
  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
