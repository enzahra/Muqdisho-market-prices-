export type DisplaySeason = 'caadi' | 'jiilaal';
export type PriceSeason = 'gu' | 'xagaa' | 'dayr' | 'jiilaal';

export const PRICE_SEASONS: PriceSeason[] = ['gu', 'xagaa', 'dayr', 'jiilaal'];

export const PRICE_SEASON_LABELS: Record<PriceSeason, string> = {
  gu: "Gu'",
  xagaa: 'Xagaa',
  dayr: 'Dayr',
  jiilaal: 'Jiilaal',
};

const DISPLAY_JIILAAL_MONTHS = new Set([12, 1, 2, 6, 7, 8, 9]);
const MONTH_NAMES = [
  '', 'Janaayo', 'Febraayo', 'Maarso', 'Abriil', 'May', 'Juun',
  'Luulyo', 'Agoosto', 'Sebteembar', 'Oktoobar', 'Nofeembar', 'Diseembar',
];

export function getDisplaySeason(date = new Date()): DisplaySeason {
  const month = date.getMonth() + 1;
  return DISPLAY_JIILAAL_MONTHS.has(month) ? 'jiilaal' : 'caadi';
}

export function getSeasonLabel(season: DisplaySeason): string {
  return season === 'caadi' ? 'Xilliga Caadi' : 'Xilliga Jiilaal';
}

/** @deprecated use getDisplaySeason */
export const getSeason = getDisplaySeason;

export function getMonthName(date = new Date()): string {
  return MONTH_NAMES[date.getMonth() + 1];
}

export function getPriceSeason(date = new Date()): PriceSeason {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'gu';
  if (month >= 6 && month <= 9) return 'xagaa';
  if (month >= 10 && month <= 11) return 'dayr';
  return 'jiilaal';
}

export function isLivestockCategory(slug: string): boolean {
  return ['geel', 'lo', 'ari', 'animals'].includes(slug);
}

export type SeasonalPrices = {
  priceGu?: number | null;
  priceXagaa?: number | null;
  priceDayr?: number | null;
  priceJiilaal?: number | null;
};

export function getActivePrice(
  prices: SeasonalPrices,
  priceSeason?: PriceSeason
): number {
  const season = priceSeason ?? getPriceSeason();
  const map: Record<PriceSeason, number | null | undefined> = {
    gu: prices.priceGu,
    xagaa: prices.priceXagaa,
    dayr: prices.priceDayr,
    jiilaal: prices.priceJiilaal,
  };

  const primary = map[season];
  if (primary != null && primary > 0) return Number(primary);

  for (const key of PRICE_SEASONS) {
    const val = map[key];
    if (val != null && val > 0) return Number(val);
  }
  return 0;
}

export function getMonthForPriceSeason(season: PriceSeason): number {
  const defaults: Record<PriceSeason, number> = {
    gu: 4,
    xagaa: 7,
    dayr: 10,
    jiilaal: 1,
  };
  return defaults[season];
}
