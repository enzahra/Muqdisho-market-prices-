require('dotenv').config()
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const email = `test-${Date.now()}@admin.com`
  const password = 'TestPass123!'
  const hashed = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      fullName: 'Test',
      isAdmin: true,
      adminRole: 'water',
    },
  })
  console.log('created', { email: user.email, isAdmin: user.isAdmin, adminRole: user.adminRole })

  const found = await prisma.user.findUnique({ where: { email } })
  const match = await bcrypt.compare(password, found.password)
  console.log('login check', { found: !!found, isAdmin: found.isAdmin, passwordMatch: match })

  await prisma.user.delete({ where: { email } })
  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
