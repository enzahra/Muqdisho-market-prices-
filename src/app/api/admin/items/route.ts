import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireCategoryAccess, requireItemAccess } from '@/lib/admin-api-auth'

export async function POST(request: Request) {
  try {
    const { name, categoryId, adminEmail } = await request.json()

    if (!name || !categoryId) {
      return NextResponse.json({ error: 'Name and Category ID are required' }, { status: 400 })
    }

    const auth = await requireCategoryAccess(request, categoryId)
    if (!auth.ok) return auth.response

    const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')

    const newItem = await prisma.item.create({
      data: {
        name,
        slug,
        categoryId,
        currentPrice: 0
      }
    })

    await prisma.auditLog.create({
      data: {
        adminEmail: auth.admin.email || adminEmail || 'Unknown Admin',
        action: 'New Item Added',
        details: `Added new item "${name}" to category ${auth.categorySlug}.`
      }
    })

    return NextResponse.json(newItem)

  } catch (error: any) {
    console.error('Create Item Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { itemId, adminEmail } = await request.json()

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    const auth = await requireItemAccess(request, itemId)
    if (!auth.ok) return auth.response

    await prisma.priceRecord.deleteMany({
      where: { itemId }
    })

    const deletedItem = await prisma.item.delete({
      where: { id: itemId }
    })

    await prisma.auditLog.create({
      data: {
        adminEmail: auth.admin.email || adminEmail || 'Unknown Admin',
        action: 'Item Removed',
        details: `Removed item "${deletedItem.name}" and its price history.`
      }
    })

    return NextResponse.json({ message: 'Item deleted successfully' })

  } catch (error: any) {
    console.error('Delete Item Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
