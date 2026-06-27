const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const categories = [
    { slug: 'animals', name: 'Xoolaha / Animals', icon: '🐄', description: 'Qiimaha rasmiga ah ee xoolaha nool ee Muqdisho.', items: ['Geel (Camel)', "Lo' (Cattle)", 'Ari (Goat/Sheep)', 'Digaag (Chicken)'] },
    { slug: 'water', name: 'Biyaha / Water', icon: '💧', description: 'Kormeerka qiimaha biyaha dhuumaha iyo kuwa haamaha.', items: ['Shirkadda Biyaha Towfiiq', 'Shirkadda Biyaha 2', 'Shirkadda Biyaha 3', 'Shirkadda Biyaha 4'] },
    { slug: 'electricity', name: 'Korontada / Electricity', icon: '⚡', description: 'Faahfaahinta tamarta ee shirkadaha korontada.', items: ['Shirkada Korontada Beco', 'Shirkada Korontada Blue Sky'] }
  ]

  for (const cat of categories) {
    const category = await prisma.category.upsert({ where: { slug: cat.slug }, update: {}, create: { slug: cat.slug, name: cat.name, icon: cat.icon, description: cat.description } })
    for (const itemName of cat.items) {
      await prisma.item.upsert({ where: { slug_categoryId: { slug: itemName, categoryId: category.id } }, update: {}, create: { name: itemName, slug: itemName, categoryId: category.id, currentPrice: 0 } })
    }
  }
}

main().then(() => console.log('Successfully Seeded!')).catch(e => console.error(e)).finally(() => prisma.$disconnect())
