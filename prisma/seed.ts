import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SUPER_ADMIN_EMAIL = 'super@admin.com'
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!'

async function main() {
  // 1. Create Categories
  const categories = [
    { 
      slug: 'animals', 
      name: 'Sicirka Xoolaha', 
      icon: '🐄', 
      description: 'Sicirka rasmiga ah ee xoolaha',
      items: ['Geel (Camel)', "Lo' (Cattle)", 'Ari (Goat/Sheep)']
    },
    { 
      slug: 'water', 
      name: 'Sicirka Biyaha', 
      icon: '💧', 
      description: 'Sicirka rasmiga ah ee biyaha magaalada',
      items: ['Shirkadda Biyaha Towfiiq', 'Shirkadda Biyaha 2', 'Shirkadda Biyaha 3', 'Shirkadda Biyaha 4']
    },
    { 
      slug: 'electricity', 
      name: 'Sicirka Korontada', 
      icon: '⚡', 
      description: 'Sicirka rasmiga ah ee korontada magaalada',
      items: ['Shirkada Korontada Muqdisho', 'Shirkada Korontada Beco', 'Shirkada Korontada Blue Sky']
    }
  ]

  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: {
        slug: cat.slug,
        name: cat.name,
        icon: cat.icon,
        description: cat.description
      }
    })

    for (const itemName of cat.items) {
      await prisma.item.upsert({
        where: { 
          slug_categoryId: {
            slug: itemName,
            categoryId: category.id
          }
        },
        update: {},
        create: {
          name: itemName,
          slug: itemName,
          categoryId: category.id,
          currentPrice: 0
        }
      })
    }
  }

  const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10)
  await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {
      isAdmin: true,
      adminRole: 'ALL',
      fullName: 'Super Admin',
    },
    create: {
      email: SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      fullName: 'Super Admin',
      isAdmin: true,
      adminRole: 'ALL',
    },
  })

  console.log('Seed data created successfully!')
  console.log(`Super admin: ${SUPER_ADMIN_EMAIL} (password: ${SUPER_ADMIN_PASSWORD})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
