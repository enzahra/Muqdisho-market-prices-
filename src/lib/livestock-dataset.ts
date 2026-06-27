import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';

export type PriceSeasonKey = 'gu' | 'xagaa' | 'dayr' | 'jiilaal';
export type SeasonalPrices = Partial<Record<PriceSeasonKey, number>>;

export type LivestockItem = {
  name: string;
  birimo?: SeasonalPrices;
  sugunto?: SeasonalPrices;
};

export type LivestockCategory = {
  slug: 'geel' | 'lo' | 'ari';
  name: string;
  items: LivestockItem[];
};

export type LivestockDataset = {
  meta: Record<string, unknown>;
  categories: LivestockCategory[];
};

const DATA_FILE = path.join(process.cwd(), 'data/livestock-prices.json');

const CATEGORY_NAMES: Record<'geel' | 'lo' | 'ari', string> = {
  geel: 'Geel (Camels)',
  lo: "Lo'da (Cattle)",
  ari: 'Ariga (Goat/Sheep)',
};

const DEFAULT_META = {
  source: 'Excel upload',
  priceSeasons: {
    gu: { label: "Gu'", months: [3, 4, 5] },
    xagaa: { label: 'Xagaa', months: [6, 7, 8, 9] },
    dayr: { label: 'Dayr', months: [10, 11] },
    jiilaal: { label: 'Jiilaal', months: [12, 1, 2] },
  },
  displaySeasons: {
    caadi: { label: 'Xilliga Caadi', months: [3, 4, 5, 10, 11, 12] },
    jiilaal: { label: 'Xilliga Jiilaal', months: [12, 1, 2, 6, 7, 8, 9] },
  },
};

const HEADER_ALIASES = {
  category: ['xoolaha', 'category', 'qaybta', 'qayb', 'xoolo'],
  name: ['nuuca', 'nooca', 'name', 'magac', 'item'],
  grade: ['heerka', 'heer', 'grade', 'type', 'nooc'],
  season: ['xilliga', 'season', 'xilli'],
  price: ['qiimahausd', 'qiimaha', 'price', 'qiimo', 'usd'],
  gu: ['gu'],
  xagaa: ['xagaa'],
  dayr: ['dayr'],
  jiilaal: ['jiilaal', 'jilaal'],
} as const;

type WideColumnMap = Record<'category' | 'name' | 'grade' | PriceSeasonKey, number>;
type LongColumnMap = { category: number; name: number; grade: number; season: number; price: number };

function activePrice(seasonal: SeasonalPrices): number {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return seasonal.gu ?? seasonal.xagaa ?? seasonal.dayr ?? seasonal.jiilaal ?? 0;
  if (month >= 6 && month <= 9) return seasonal.xagaa ?? seasonal.gu ?? seasonal.dayr ?? seasonal.jiilaal ?? 0;
  if (month >= 10 && month <= 11) return seasonal.dayr ?? seasonal.gu ?? seasonal.xagaa ?? seasonal.jiilaal ?? 0;
  return seasonal.jiilaal ?? seasonal.dayr ?? seasonal.xagaa ?? seasonal.gu ?? 0;
}

function slugify(name: string, suffix = ''): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return suffix ? `${base}-${suffix}` : base;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().trim().replace(/[''`]/g, '').replace(/[^a-z0-9]/g, '');
}

function headerMatches(normalizedHeader: string, aliases: readonly string[]): boolean {
  if (!normalizedHeader) return false;
  return aliases.some(
    (alias) =>
      normalizedHeader === alias ||
      normalizedHeader.startsWith(alias) ||
      normalizedHeader.includes(alias)
  );
}

function findColumn(headers: string[], aliases: readonly string[]): number {
  const normalized = headers.map((h) => normalizeKey(String(h ?? '')));
  for (let i = 0; i < normalized.length; i++) {
    if (headerMatches(normalized[i], aliases)) return i;
  }
  return -1;
}

function parsePriceValue(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;

  const str = String(value).trim();
  if (!str) return undefined;

  const numbers = str.match(/[\d,]+(?:\.\d+)?/g);
  if (!numbers || numbers.length === 0) return undefined;

  const parsed = numbers
    .map((n) => Number(n.replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (parsed.length === 0) return undefined;
  return Math.max(...parsed);
}

function normalizeCategory(value: string): 'geel' | 'lo' | 'ari' | null {
  const v = value.toLowerCase().trim().replace(/[''`]/g, '');
  if (!v) return null;
  if (v === 'geel' || v.includes('camel')) return 'geel';
  if (v === 'lo' || v === 'loda' || v.includes('cattle') || v.includes('cow')) return 'lo';
  if (v === 'ari' || v.includes('goat') || v.includes('sheep')) return 'ari';
  return null;
}

function normalizeGrade(value: string): 'birimo' | 'sugunto' | null {
  const v = value.toLowerCase().trim();
  if (!v) return null;
  if (v.includes('birimo') || v.includes('barimo') || v.includes('birim')) return 'birimo';
  if (v.includes('sugunto') || v.includes('sukunto') || v.includes('sugun')) return 'sugunto';
  return null;
}

function normalizeSeason(value: string): PriceSeasonKey | null {
  const v = normalizeKey(value);
  if (!v) return null;
  if (v === 'gu' || v.startsWith('gu')) return 'gu';
  if (v.includes('xagaa')) return 'xagaa';
  if (v.includes('dayr')) return 'dayr';
  if (v.includes('jiilaal') || v.includes('jilaal')) return 'jiilaal';
  return null;
}

function mergeSeasonal(target: SeasonalPrices, source: SeasonalPrices) {
  for (const season of ['gu', 'xagaa', 'dayr', 'jiilaal'] as const) {
    if (source[season] != null) target[season] = source[season];
  }
}

function loadExistingMeta(): Record<string, unknown> {
  try {
    const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as LivestockDataset;
    return existing.meta ?? DEFAULT_META;
  } catch {
    return DEFAULT_META;
  }
}

function isHeaderRow(row: unknown[]): boolean {
  const cells = row.map((c) => normalizeKey(String(c ?? '')));
  const hasName = cells.some((c) => headerMatches(c, HEADER_ALIASES.name));
  const hasGrade = cells.some((c) => headerMatches(c, HEADER_ALIASES.grade));
  const hasSeasonCol = cells.some((c) => headerMatches(c, HEADER_ALIASES.season));
  const hasGuCol = cells.some((c) => headerMatches(c, HEADER_ALIASES.gu));
  return hasName && hasGrade && (hasSeasonCol || hasGuCol);
}

function findHeaderRowIndex(aoa: unknown[][]): number {
  for (let i = 0; i < Math.min(aoa.length, 25); i++) {
    const row = aoa[i];
    if (Array.isArray(row) && isHeaderRow(row)) return i;
  }
  return 0;
}

function detectLongColumnMap(headers: string[]): LongColumnMap | null {
  const season = findColumn(headers, HEADER_ALIASES.season);
  const price = findColumn(headers, HEADER_ALIASES.price);
  const name = findColumn(headers, HEADER_ALIASES.name);
  const grade = findColumn(headers, HEADER_ALIASES.grade);

  if (season >= 0 && price >= 0 && name >= 0 && grade >= 0) {
    const category = findColumn(headers, HEADER_ALIASES.category);
    return {
      category: category >= 0 ? category : 0,
      name,
      grade,
      season,
      price,
    };
  }
  return null;
}

function detectWideColumnMap(headers: string[]): WideColumnMap | null {
  const name = findColumn(headers, HEADER_ALIASES.name);
  const grade = findColumn(headers, HEADER_ALIASES.grade);
  const gu = findColumn(headers, HEADER_ALIASES.gu);
  const xagaa = findColumn(headers, HEADER_ALIASES.xagaa);

  if (name >= 0 && grade >= 0 && gu >= 0 && xagaa >= 0) {
    const category = findColumn(headers, HEADER_ALIASES.category);
    const dayr = findColumn(headers, HEADER_ALIASES.dayr);
    const jiilaal = findColumn(headers, HEADER_ALIASES.jiilaal);
    return {
      category: category >= 0 ? category : 0,
      name,
      grade,
      gu,
      xagaa,
      dayr: dayr >= 0 ? dayr : xagaa + 1,
      jiilaal: jiilaal >= 0 ? jiilaal : (dayr >= 0 ? dayr + 1 : xagaa + 2),
    };
  }

  if (headers.length >= 7) {
    return { category: 0, name: 1, grade: 2, gu: 3, xagaa: 4, dayr: 5, jiilaal: 6 };
  }
  return null;
}

function cellAt(row: unknown[], index: number): string {
  if (index < 0 || index >= row.length) return '';
  return String(row[index] ?? '').trim();
}

function buildDatasetFromMap(
  categoryMap: Map<'geel' | 'lo' | 'ari', Map<string, LivestockItem>>
): LivestockDataset {
  const itemOrder: Record<string, string[]> = {};
  const categories: LivestockCategory[] = (['geel', 'lo', 'ari'] as const)
    .filter((slug) => categoryMap.has(slug))
    .map((slug) => {
      const items = Array.from(categoryMap.get(slug)!.values());
      itemOrder[slug] = items.map((i) => i.name);
      return {
        slug,
        name: CATEGORY_NAMES[slug],
        items,
      };
    });

  if (categories.length === 0) {
    throw new Error(
      'Excel-ka lama akhrin karo. Hubi in uu leeyahay: Xoolaha, Nuuca, Heerka, iyo qiimaha (Gu/Xagaa/Dayr/Jiilaal ama Xilliga + Qiimaha_USD).'
    );
  }

  return {
    meta: { ...loadExistingMeta(), source: 'Excel upload', uploadedAt: new Date().toISOString(), itemOrder },
    categories,
  };
}

export function getLivestockItemOrder(): Record<string, string[]> {
  try {
    const json = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as LivestockDataset & {
      meta?: { itemOrder?: Record<string, string[]> };
    };
    if (json.meta?.itemOrder && Object.keys(json.meta.itemOrder).length > 0) {
      return json.meta.itemOrder;
    }
    const order: Record<string, string[]> = {};
    for (const cat of json.categories || []) {
      order[cat.slug] = cat.items.map((i) => i.name);
    }
    return order;
  } catch {
    return {};
  }
}

export function sortLivestockItems<T extends { name: string }>(
  items: T[],
  categorySlug: string,
  orderMap?: Record<string, string[]>
): T[] {
  const order = orderMap?.[categorySlug] ?? getLivestockItemOrder()[categorySlug] ?? [];
  return [...items].sort((a, b) => {
    const baseA = (a.name.match(/(.+) \((.+)\)/)?.[1] || a.name).trim();
    const baseB = (b.name.match(/(.+) \((.+)\)/)?.[1] || b.name).trim();
    const idxA = order.indexOf(baseA);
    const idxB = order.indexOf(baseB);
    if (idxA !== idxB) return (idxA === -1 ? 9999 : idxA) - (idxB === -1 ? 9999 : idxB);
    if (a.name.includes('Birimo') && b.name.includes('Sugunto')) return -1;
    if (a.name.includes('Sugunto') && b.name.includes('Birimo')) return 1;
    return 0;
  });
}

function parseLongFormat(dataRows: unknown[][], cols: LongColumnMap): LivestockDataset {
  const categoryMap = new Map<'geel' | 'lo' | 'ari', Map<string, LivestockItem>>();
  let lastCategory: 'geel' | 'lo' | 'ari' | null = null;

  for (const row of dataRows) {
    if (!Array.isArray(row)) continue;

    const categoryRaw = cellAt(row, cols.category);
    const parsedCategory = normalizeCategory(categoryRaw);
    if (parsedCategory) lastCategory = parsedCategory;

    const category = parsedCategory ?? lastCategory;
    const name = cellAt(row, cols.name);
    const grade = normalizeGrade(cellAt(row, cols.grade));
    const season = normalizeSeason(cellAt(row, cols.season));
    const price = parsePriceValue(row[cols.price]);

    if (!category || !name || !grade || !season || price == null) continue;

    if (!categoryMap.has(category)) categoryMap.set(category, new Map());
    const items = categoryMap.get(category)!;

    if (!items.has(name)) items.set(name, { name });
    const item = items.get(name)!;

    if (grade === 'birimo') {
      item.birimo = item.birimo ?? {};
      item.birimo[season] = price;
    } else {
      item.sugunto = item.sugunto ?? {};
      item.sugunto[season] = price;
    }
  }

  return buildDatasetFromMap(categoryMap);
}

function parseWideFormat(dataRows: unknown[][], cols: WideColumnMap): LivestockDataset {
  const categoryMap = new Map<'geel' | 'lo' | 'ari', Map<string, LivestockItem>>();
  let lastCategory: 'geel' | 'lo' | 'ari' | null = null;

  for (const row of dataRows) {
    if (!Array.isArray(row)) continue;

    const categoryRaw = cellAt(row, cols.category);
    const parsedCategory = normalizeCategory(categoryRaw);
    const name = cellAt(row, cols.name);
    const grade = normalizeGrade(cellAt(row, cols.grade));

    const seasonal: SeasonalPrices = {};
    for (const season of ['gu', 'xagaa', 'dayr', 'jiilaal'] as const) {
      const price = parsePriceValue(row[cols[season]]);
      if (price != null) seasonal[season] = price;
    }

    if (parsedCategory && !name && !grade) {
      lastCategory = parsedCategory;
      continue;
    }

    if (parsedCategory) lastCategory = parsedCategory;
    const category = parsedCategory ?? lastCategory;

    if (!category || !name || !grade || Object.keys(seasonal).length === 0) continue;

    if (!categoryMap.has(category)) categoryMap.set(category, new Map());
    const items = categoryMap.get(category)!;

    if (!items.has(name)) items.set(name, { name });
    const item = items.get(name)!;

    if (grade === 'birimo') {
      item.birimo = item.birimo ?? {};
      mergeSeasonal(item.birimo, seasonal);
    } else {
      item.sugunto = item.sugunto ?? {};
      mergeSeasonal(item.sugunto, seasonal);
    }
  }

  return buildDatasetFromMap(categoryMap);
}

export function parseExcelToDataset(buffer: Buffer): LivestockDataset {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('Excel file has no sheets.');

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  if (aoa.length === 0) throw new Error('Excel file is empty.');

  const headerIdx = findHeaderRowIndex(aoa);
  const headers = (aoa[headerIdx] as unknown[]).map((h) => String(h ?? '').trim());

  const dataRows = aoa.slice(headerIdx + 1).filter(
    (row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== '')
  ) as unknown[][];

  const longCols = detectLongColumnMap(headers);
  if (longCols) return parseLongFormat(dataRows, longCols);

  const wideCols = detectWideColumnMap(headers);
  if (wideCols) return parseWideFormat(dataRows, wideCols);

  throw new Error(
    'Excel-ka lama aqoonsan karo. Waa in uu leeyahay: Xoolaha, Nuuca, Heerka, Xilliga, Qiimaha_USD — ama Gu, Xagaa, Dayr, Jiilaal.'
  );
}

export function saveLivestockDataset(dataset: LivestockDataset) {
  fs.writeFileSync(DATA_FILE, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
}

async function clearCategoryItems(slug: string) {
  await prisma.$executeRaw`
    DELETE FROM "PriceRecord"
    WHERE "itemId" IN (
      SELECT i.id FROM "Item" i
      JOIN "Category" cat ON i."categoryId" = cat.id
      WHERE cat.slug = ${slug}
    )
  `;
  await prisma.$executeRaw`
    DELETE FROM "Item"
    WHERE "categoryId" IN (SELECT id FROM "Category" WHERE slug = ${slug})
  `;
}

async function upsertItem(
  categoryId: string,
  fullItemName: string,
  itemSlug: string,
  seasonal: SeasonalPrices
) {
  const priceGu = seasonal.gu ?? null;
  const priceXagaa = seasonal.xagaa ?? null;
  const priceDayr = seasonal.dayr ?? null;
  const priceJiilaal = seasonal.jiilaal ?? null;
  const currentPrice = activePrice(seasonal);
  const itemId = crypto.randomUUID();

  await prisma.$executeRaw`
    INSERT INTO "Item" (id, name, slug, "categoryId", "currentPrice", "priceGu", "priceXagaa", "priceDayr", "priceJiilaal", "createdAt", "updatedAt")
    VALUES (${itemId}, ${fullItemName}, ${itemSlug}, ${categoryId}, ${currentPrice}, ${priceGu}, ${priceXagaa}, ${priceDayr}, ${priceJiilaal}, NOW(), NOW())
    ON CONFLICT (slug, "categoryId") DO UPDATE SET
      name = ${fullItemName},
      "currentPrice" = ${currentPrice},
      "priceGu" = ${priceGu},
      "priceXagaa" = ${priceXagaa},
      "priceDayr" = ${priceDayr},
      "priceJiilaal" = ${priceJiilaal},
      "updatedAt" = NOW()
  `;
}

export async function applyLivestockDatasetToDatabase(dataset: LivestockDataset) {
  for (const cat of dataset.categories) {
    await clearCategoryItems(cat.slug);

    const categoryId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "Category" (id, slug, name, description, "createdAt")
      VALUES (${categoryId}, ${cat.slug}, ${cat.name}, ${`Qiimaha rasmiga ah ee ${cat.name}`}, NOW())
      ON CONFLICT (slug) DO UPDATE SET name = ${cat.name}, description = ${`Qiimaha rasmiga ah ee ${cat.name}`}
    `;

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Category" WHERE slug = ${cat.slug} LIMIT 1
    `;
    const actualCategoryId = rows[0]?.id;
    if (!actualCategoryId) throw new Error(`Category ${cat.slug} not found after upsert.`);

    for (const item of cat.items) {
      if (item.birimo) {
        await upsertItem(actualCategoryId, `${item.name} (Birimo)`, slugify(item.name, 'birimo'), item.birimo);
      }
      if (item.sugunto) {
        await upsertItem(actualCategoryId, `${item.name} (Sugunto)`, slugify(item.name, 'sugunto'), item.sugunto);
      }
    }
  }
}

export async function importLivestockExcel(buffer: Buffer) {
  const dataset = parseExcelToDataset(buffer);
  saveLivestockDataset(dataset);
  await applyLivestockDatasetToDatabase(dataset);

  const itemCount = dataset.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  return {
    categories: dataset.categories.length,
    items: itemCount,
  };
}
