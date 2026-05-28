import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, requireItemAccess } from '@/lib/admin-api-auth'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        items: {
          include: { prices: { orderBy: { timestamp: 'asc' } } }
        }
      },
      orderBy: { slug: 'asc' }
    })

    return NextResponse.json(categories)
  } catch (error: any) {
    console.error('Fetch Prices Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { itemId, price, updatedBy } = await request.json()

    const numericPrice = Number(price);

    if (!itemId || price === undefined || isNaN(numericPrice)) {
      return NextResponse.json({ error: 'Fadlan geli qiimo sax ah (Nambar).' }, { status: 400 })
    }

    if (numericPrice < 0) {
      return NextResponse.json({ error: 'Qiimaha lama ogola inuu ka yaraado eber (Negative).' }, { status: 400 })
    }

    if (numericPrice > 5000) { 
      return NextResponse.json({ error: 'Qiimaha aad gelisay wuu xad-dhaafay ($5,000+). Fadlan hubi mar kale.' }, { status: 400 })
    }

    const auth = await requireItemAccess(request, itemId)
    if (!auth.ok) return auth.response

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: { currentPrice: numericPrice }
    })

    await prisma.priceRecord.create({
      data: {
        itemId,
        price: numericPrice,
        updatedBy: auth.admin.email || updatedBy || 'Admin'
      }
    })

    await prisma.auditLog.create({
      data: {
        adminEmail: auth.admin.email || updatedBy || 'Admin',
        action: 'Price Updated',
        details: `Updated price of item ID ${itemId} to $${numericPrice}`
      }
    })

    return NextResponse.json({ 
      message: 'Price updated successfully', 
      price: updatedItem.currentPrice 
    })

  } catch (error: any) {
    console.error('Update Price Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin(request, { superOnly: true })
    if (!auth.ok) return auth.response

    await prisma.priceRecord.deleteMany({});
    return NextResponse.json({ message: 'All price history cleared successfully' })
  } catch (error: any) {
    console.error('Delete History Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
