import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, requireItemAccess } from '@/lib/admin-api-auth'
import { getLivestockItemOrder, sortLivestockItems } from '@/lib/livestock-dataset'
import {
  getActivePrice,
  getDisplaySeason,
  getPriceSeason,
  isLivestockCategory,
  type PriceSeason,
} from '@/lib/season'

export const dynamic = 'force-dynamic'

type SeasonalRow = {
  id: string
  priceGu: number | null
  priceXagaa: number | null
  priceDayr: number | null
  priceJiilaal: number | null
}

function rowToPrices(row: SeasonalRow) {
  return {
    priceGu: row.priceGu != null ? Number(row.priceGu) : null,
    priceXagaa: row.priceXagaa != null ? Number(row.priceXagaa) : null,
    priceDayr: row.priceDayr != null ? Number(row.priceDayr) : null,
    priceJiilaal: row.priceJiilaal != null ? Number(row.priceJiilaal) : null,
  }
}

async function syncLivestockPrices() {
  await prisma.$executeRaw`
    UPDATE "Item" i
    SET "currentPrice" = CASE
      WHEN EXTRACT(MONTH FROM CURRENT_DATE)::int IN (3, 4, 5)
        THEN COALESCE(i."priceGu", i."priceXagaa", i."priceDayr", i."priceJiilaal", 0)
      WHEN EXTRACT(MONTH FROM CURRENT_DATE)::int IN (6, 7, 8, 9)
        THEN COALESCE(i."priceXagaa", i."priceGu", i."priceDayr", i."priceJiilaal", 0)
      WHEN EXTRACT(MONTH FROM CURRENT_DATE)::int IN (10, 11)
        THEN COALESCE(i."priceDayr", i."priceGu", i."priceXagaa", i."priceJiilaal", 0)
      ELSE COALESCE(i."priceJiilaal", i."priceDayr", i."priceXagaa", i."priceGu", 0)
    END,
    "updatedAt" = NOW()
    FROM "Category" c
    WHERE i."categoryId" = c.id
      AND c.slug IN ('geel', 'lo', 'ari')
  `
}

async function getSeasonalPriceMap() {
  const rows = await prisma.$queryRaw<SeasonalRow[]>`
    SELECT i.id, i."priceGu", i."priceXagaa", i."priceDayr", i."priceJiilaal"
    FROM "Item" i
    JOIN "Category" c ON i."categoryId" = c.id
    WHERE c.slug IN ('geel', 'lo', 'ari')
  `
  return new Map(rows.map((r) => [r.id, r]))
}

function enrichCategories(
  categories: any[],
  seasonalMap: Map<string, SeasonalRow>,
  priceSeason: PriceSeason
) {
  return categories.map((cat) => ({
    ...cat,
    items: cat.items.map((item: any) => {
      if (!isLivestockCategory(cat.slug)) return item
      const seasonal = seasonalMap.get(item.id)
      if (!seasonal) return item
      const prices = rowToPrices(seasonal)
      const currentPrice = getActivePrice(prices, priceSeason)
      return { ...item, ...prices, currentPrice }
    }),
  }))
}

export async function GET() {
  try {
    await syncLivestockPrices()

    const [categories, seasonalMap] = await Promise.all([
      prisma.category.findMany({
        include: {
          items: {
            include: { prices: { orderBy: { timestamp: 'asc' } } }
          }
        },
        orderBy: { slug: 'asc' }
      }),
      getSeasonalPriceMap(),
    ])

    const displaySeason = getDisplaySeason()
    const priceSeason = getPriceSeason()
    const enriched = enrichCategories(categories, seasonalMap, priceSeason)
    const itemOrder = getLivestockItemOrder()
    const sorted = enriched.map((cat) =>
      ['geel', 'lo', 'ari'].includes(cat.slug)
        ? { ...cat, items: sortLivestockItems(cat.items, cat.slug, itemOrder) }
        : cat
    )

    return NextResponse.json(sorted, {
      headers: {
        'X-Active-Season': displaySeason,
        'X-Price-Season': priceSeason,
      },
    })
  } catch (error: any) {
    console.error('Fetch Prices Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

function validatePrice(num: number, label: string) {
  if (isNaN(num)) throw new Error(`Qiimaha ${label} ma ahan nambar sax ah.`)
  if (num < 0) throw new Error(`Qiimaha ${label} kama yaraadaan karo eber (0).`)
  if (num > 5000) throw new Error(`Qiimaha ${label} wuu xad-dhaafay ($5,000+).`)
}

async function getItemSeasonalPrices(itemId: string) {
  const rows = await prisma.$queryRaw<SeasonalRow[]>`
    SELECT id, "priceGu", "priceXagaa", "priceDayr", "priceJiilaal"
    FROM "Item" WHERE id = ${itemId}
  `
  return rows[0] ?? null
}

async function updateLivestockItemPrices(
  itemId: string,
  prices: {
    priceGu: number | null
    priceXagaa: number | null
    priceDayr: number | null
    priceJiilaal: number | null
  },
  currentPrice: number
) {
  await prisma.$executeRaw`
    UPDATE "Item"
    SET
      "priceGu" = ${prices.priceGu},
      "priceXagaa" = ${prices.priceXagaa},
      "priceDayr" = ${prices.priceDayr},
      "priceJiilaal" = ${prices.priceJiilaal},
      "currentPrice" = ${currentPrice},
      "updatedAt" = NOW()
    WHERE id = ${itemId}
  `
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      itemId,
      price,
      priceGu,
      priceXagaa,
      priceDayr,
      priceJiilaal,
      updatedBy,
    } = body

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID waa lagama maarmaan.' }, { status: 400 })
    }

    const auth = await requireItemAccess(request, itemId)
    if (!auth.ok) return auth.response

    const existing = await prisma.item.findUnique({
      where: { id: itemId },
      include: { category: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Item lama helin.' }, { status: 404 })
    }

    const stored = await getItemSeasonalPrices(itemId)
    const isLivestock = isLivestockCategory(existing.category.slug)
    const hasSeasonalUpdate =
      priceGu !== undefined ||
      priceXagaa !== undefined ||
      priceDayr !== undefined ||
      priceJiilaal !== undefined

    let finalPrices = {
      priceGu: null as number | null,
      priceXagaa: null as number | null,
      priceDayr: null as number | null,
      priceJiilaal: null as number | null,
    }
    let finalCurrentPrice = existing.currentPrice

    if (isLivestock && hasSeasonalUpdate) {
      const existingPrices = stored ? rowToPrices(stored) : finalPrices
      const pick = (key: keyof typeof finalPrices, val: unknown) =>
        val !== undefined && val !== '' ? Number(val) : existingPrices[key]

      finalPrices = {
        priceGu: pick('priceGu', priceGu),
        priceXagaa: pick('priceXagaa', priceXagaa),
        priceDayr: pick('priceDayr', priceDayr),
        priceJiilaal: pick('priceJiilaal', priceJiilaal),
      }

      for (const [key, label] of [
        ['priceGu', "Gu'"],
        ['priceXagaa', 'Xagaa'],
        ['priceDayr', 'Dayr'],
        ['priceJiilaal', 'Jiilaal'],
      ] as const) {
        const val = finalPrices[key]
        if (val != null) validatePrice(val, label)
      }

      finalCurrentPrice = getActivePrice(finalPrices)
      await updateLivestockItemPrices(itemId, finalPrices, finalCurrentPrice)
    } else {
      const numericPrice = Number(price)
      if (price === undefined || isNaN(numericPrice)) {
        return NextResponse.json({ error: 'Fadlan geli qiimo sax ah (Nambar).' }, { status: 400 })
      }
      validatePrice(numericPrice, existing.name)
      finalCurrentPrice = numericPrice

      await prisma.item.update({
        where: { id: itemId },
        data: { currentPrice: numericPrice },
      })
    }

    await prisma.priceRecord.create({
      data: {
        itemId,
        price: finalCurrentPrice,
        updatedBy: auth.admin.email || updatedBy || 'Admin',
      },
    })

    await prisma.auditLog.create({
      data: {
        adminEmail: auth.admin.email || updatedBy || 'Admin',
        action: 'Price Updated',
        details: isLivestock
          ? `Updated ${existing.name}: Gu' $${finalPrices.priceGu ?? 0}, Xagaa $${finalPrices.priceXagaa ?? 0}, Dayr $${finalPrices.priceDayr ?? 0}, Jiilaal $${finalPrices.priceJiilaal ?? 0}`
          : `Updated price of ${existing.name} to $${finalCurrentPrice}`,
      },
    })

    return NextResponse.json({
      message: 'Price updated successfully',
      price: finalCurrentPrice,
      ...finalPrices,
    })
  } catch (error: any) {
    if (error.message?.includes('Qiimaha')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
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
