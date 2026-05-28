require('dotenv').config()
const { Client } = require('pg')
const bcrypt = require('bcryptjs')

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const cols = await client.query(
    `SELECT column_name, data_type, character_maximum_length
     FROM information_schema.columns
     WHERE table_name = 'User' AND column_name = 'password'`
  )
  console.log('password column:', cols.rows[0])

  const r = await client.query(
    `SELECT email, "isAdmin", "adminRole", length(password) as pw_len, password FROM "User" ORDER BY "createdAt" DESC LIMIT 8`
  )
  for (const row of r.rows) {
    const hashOk = row.password?.startsWith('$2')
    console.log({
      email: row.email,
      isAdmin: row.isAdmin,
      adminRole: row.adminRole,
      pwLen: row.pw_len,
      bcryptHash: hashOk,
    })
  }
  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
