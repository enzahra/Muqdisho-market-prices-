export const YEAR_RATE_PATTERN = /^(.+) \((\d{4})\)$/;
export const ELECTRICITY_YEAR_RATE_PATTERN = /^(.+) \((\d{4})\) · (.+)$/;

export const ELECTRICITY_RATES = [
  { id: "home", label: "Home Guri", defaultPrice: 0.42 },
  { id: "multi", label: "Shirkad  Laamo badan", defaultPrice: 0.35 },
  { id: "single", label: "Shirkad  Hal laan", defaultPrice: 0.3 },
] as const;

/** Legacy item names still in DB — not shown or recreated */
const SKIPPED_ELECTRICITY_LABELS = ["Guri / Home", "(Guri)"];

const LEGACY_ELECTRICITY_LABEL_MAP: Record<string, (typeof ELECTRICITY_RATES)[number]> = {
  Guri: ELECTRICITY_RATES[0],
  "Shirkad · Laamo badan": ELECTRICITY_RATES[1],
  "Shirkad Laamo badan": ELECTRICITY_RATES[1],
  "Shirkad · Hal laam": ELECTRICITY_RATES[2],
  "Shirkad · Hal laan": ELECTRICITY_RATES[2],
  "Shirkad Hal laan": ELECTRICITY_RATES[2],
};

function resolveElectricityRate(label: string) {
  return ELECTRICITY_RATES.find((r) => r.label === label) ?? LEGACY_ELECTRICITY_LABEL_MAP[label];
}

function fillElectricityYearRates(yearEntry: UtilityYearRate, companyName: string) {
  yearEntry.rates = ELECTRICITY_RATES.map((rateDef) => {
    const existing = yearEntry.rates.find((r) => {
      if (r.rateId === rateDef.id) return true;
      const resolved = resolveElectricityRate(r.label);
      return resolved?.id === rateDef.id;
    });
    if (existing) {
      return { ...existing, rateId: rateDef.id, label: rateDef.label };
    }
    return {
      rateId: rateDef.id,
      label: rateDef.label,
      itemName: electricityRateItemName(companyName, yearEntry.year, rateDef.label),
      price: rateDef.defaultPrice,
    };
  });
  yearEntry.price = yearEntry.rates[0]?.price ?? 0;
  yearEntry.itemName =
    yearEntry.rates.find((r) => r.rateId === "home")?.itemName ?? yearEntry.rates[0]?.itemName ?? "";
}

export function getMissingElectricityRateItems(
  items: { name: string }[],
  companyName: string,
  year: string
) {
  const existingNames = new Set(items.map((i) => i.name));
  return ELECTRICITY_RATES.filter(
    (rate) => !existingNames.has(electricityRateItemName(companyName, year, rate.label))
  );
}

export type ElectricityRateId = (typeof ELECTRICITY_RATES)[number]["id"];

export function isUtilityCategory(slug: string) {
  return slug === "water" || slug === "electricity";
}

export function getUtilityUnit(slug: string): string {
  if (slug === "water") return "m³";
  if (slug === "electricity") return "kWh";
  return "unit";
}

/** Company logo paths under /public — matched by name keywords */
export function getElectricityCompanyLogo(companyName: string): string | null {
  const name = companyName.toLowerCase();
  if (name.includes("beco")) return "/images/electricity/beco.png";
  if (name.includes("muqdisho") || name.includes("mogadishu")) return "/images/electricity/mogadishu-power.png";
  if (name.includes("blue sky") || name.includes("bluesky")) return "/images/electricity/blue-sky.png";
  return null;
}

export function getWaterCompanyLogo(companyName: string): string | null {
  const name = companyName.toLowerCase();
  if (name.includes("towfiiq") || name.includes("horumarinta")) return "/images/water/towfiiq.png";
  if (name.includes("wabax")) return "/images/water/wabax.png";
  return null;
}

export function getUtilityCompanyLogo(companyName: string, isElectricity: boolean): string | null {
  return isElectricity ? getElectricityCompanyLogo(companyName) : getWaterCompanyLogo(companyName);
}

export function getElectricityCompanyDisplayName(companyName: string): string {
  const name = companyName.toLowerCase();
  if (name.includes("blue sky") || name.includes("bluesky")) {
    return "Shirkada Korontada Blue Sky";
  }
  if (name.includes("beco")) return "Shirkada Korontada Beco";
  if (name.includes("muqdisho") || name.includes("mogadishu")) {
    return "Shirkada Korontada Muqdisho Power";
  }
  return companyName;
}

export function getWaterCompanyDisplayName(companyName: string): string {
  const name = companyName.toLowerCase();
  if (name.includes("towfiiq") || name.includes("horumarinta")) {
    return "Shirkadda Horumarinta Biyaha Towfiiq";
  }
  if (name.includes("wabax")) return "Shirkadda Biya-galinta Wabax";
  return companyName;
}

/** Utility bill: (current reading − last reading) × unit price */
export function calcUtilityBill(currentReading: number, lastReading: number, unitPrice: number): number {
  const usage = currentReading - lastReading;
  if (usage < 0 || unitPrice <= 0) return 0;
  return usage * unitPrice;
}

/** @deprecated Use calcUtilityBill */
export function calcWaterBill(currentReading: number, lastReading: number, pricePerM3: number): number {
  return calcUtilityBill(currentReading, lastReading, pricePerM3);
}

export function getWaterLogoVariant(): UtilityLogoVariant {
  return "round";
}

export function getElectricityLogoVariant(): UtilityLogoVariant {
  return "compact";
}

/** Fixed logo frame for all electricity companies (dashboard, admin, reports) */
export const ELECTRICITY_LOGO_FRAME_CLASS = "electricity-logo-slot";
export const ELECTRICITY_LOGO_WIDTH = 52;
export const ELECTRICITY_LOGO_HEIGHT = 52;

export type UtilityLogoVariant = "round" | "wide" | "wabax" | "compact";

export function getUtilityLogoVariant(logoPath: string): UtilityLogoVariant {
  if (logoPath.includes("towfiiq") || logoPath.includes("blue-sky")) return "round";
  if (logoPath.includes("wabax")) return "wabax";
  if (logoPath.includes("mogadishu")) return "wide";
  return "compact";
}

export function formatElectricityRateDisplay(label: string, price: number): string {
  return `${label} – $${price.toFixed(2)} per kWh`;
}

export function electricityRateItemName(company: string, year: string, label: string) {
  return `${company} (${year}) · ${label}`;
}

export type ElectricityRateRow = {
  rateId: string;
  label: string;
  itemName: string;
  price: number;
};

export type UtilityYearRate = {
  year: string;
  price: number;
  itemName: string;
  rates: ElectricityRateRow[];
};

export type UtilityCompanyGroup = {
  companyItem: { id?: string; name: string; currentPrice?: number } | null;
  years: UtilityYearRate[];
};

export type UtilityCompanyView = {
  name: string;
  latestYear: string | null;
  latestPrice: number;
  years: UtilityYearRate[];
  isElectricity: boolean;
};

function priceFrom(
  slug: string,
  itemName: string,
  currentPrice: number | undefined,
  prices: Record<string, number | string | undefined>
): number {
  return Number(prices[`${slug}_${itemName}`] ?? currentPrice ?? 0) || 0;
}

function isLegacySkip(name: string): boolean {
  return /^(.+)\|(home|multi|single)$/.test(name);
}

export function groupWaterItems(
  items: { id?: string; name: string; currentPrice?: number }[],
  slug: string,
  prices: Record<string, number | string | undefined>
): Record<string, UtilityCompanyGroup> {
  const companies: Record<string, UtilityCompanyGroup> = {};

  for (const item of items || []) {
    if (isLegacySkip(item.name) || ELECTRICITY_YEAR_RATE_PATTERN.test(item.name)) continue;

    const yearMatch = item.name.match(YEAR_RATE_PATTERN);
    if (yearMatch) {
      const company = yearMatch[1].trim();
      const year = yearMatch[2];
      if (!companies[company]) companies[company] = { companyItem: null, years: [] };
      companies[company].years.push({
        year,
        itemName: item.name,
        price: priceFrom(slug, item.name, item.currentPrice, prices),
        rates: [],
      });
    } else {
      const company = item.name.trim();
      if (!companies[company]) companies[company] = { companyItem: null, years: [] };
      companies[company].companyItem = item;
    }
  }

  for (const group of Object.values(companies)) {
    group.years.sort((a, b) => Number(b.year) - Number(a.year));
  }
  return companies;
}

export function groupElectricityItems(
  items: { id?: string; name: string; currentPrice?: number }[],
  slug: string,
  prices: Record<string, number | string | undefined>
): Record<string, UtilityCompanyGroup> {
  const companies: Record<string, UtilityCompanyGroup> = {};

  for (const item of items || []) {
    if (isLegacySkip(item.name)) continue;

    const rateMatch = item.name.match(ELECTRICITY_YEAR_RATE_PATTERN);
    if (rateMatch) {
      const company = rateMatch[1].trim();
      const year = rateMatch[2];
      const label = rateMatch[3].trim();
      if (SKIPPED_ELECTRICITY_LABELS.includes(label)) continue;
      if (!companies[company]) companies[company] = { companyItem: null, years: [] };

      let yearEntry = companies[company].years.find((y) => y.year === year);
      if (!yearEntry) {
        yearEntry = { year, itemName: "", price: 0, rates: [] };
        companies[company].years.push(yearEntry);
      }

      const def = resolveElectricityRate(label);
      yearEntry.rates.push({
        rateId: def?.id ?? label,
        label: def?.label ?? label,
        itemName: item.name,
        price: priceFrom(slug, item.name, item.currentPrice, prices),
      });
      continue;
    }

    const legacyYear = item.name.match(YEAR_RATE_PATTERN);
    if (legacyYear) continue;

    const company = item.name.trim();
    if (!companies[company]) companies[company] = { companyItem: null, years: [] };
    companies[company].companyItem = item;
  }

  for (const [companyName, group] of Object.entries(companies)) {
    for (const yearEntry of group.years) {
      fillElectricityYearRates(yearEntry, companyName);
    }
    group.years.sort((a, b) => Number(b.year) - Number(a.year));
  }

  return companies;
}

export function groupUtilityItems(
  items: { id?: string; name: string; currentPrice?: number }[],
  slug: string,
  prices: Record<string, number | string | undefined> = {}
): Record<string, UtilityCompanyGroup> {
  if (slug === "electricity") return groupElectricityItems(items, slug, prices);
  return groupWaterItems(items, slug, prices);
}

function toCompanyView(companyName: string, group: UtilityCompanyGroup, isElectricity: boolean): UtilityCompanyView {
  const latest = group.years[0];
  return {
    name: companyName,
    latestYear: latest?.year ?? null,
    latestPrice: latest?.price ?? group.companyItem?.currentPrice ?? 0,
    years: group.years,
    isElectricity,
  };
}

export function buildUtilityCompanyViews(
  items: { id?: string; name: string; currentPrice?: number }[],
  slug: string,
  prices: Record<string, number | string | undefined>
): UtilityCompanyView[] {
  const grouped = groupUtilityItems(items, slug, prices);
  ensureDefaultUtilityYears(grouped, slug);
  return Object.keys(grouped)
    .filter((name) => !name.includes("|"))
    .sort((a, b) => a.localeCompare(b, "so"))
    .map((name) => toCompanyView(name, grouped[name], slug === "electricity"));
}

const DEFAULT_WATER_PRICES: Record<string, number> = {
  towfiiq: 1.4,
  wabax: 1.5,
};

function defaultWaterPrice(companyName: string, fallback = 0): number {
  const lower = companyName.toLowerCase();
  for (const [key, price] of Object.entries(DEFAULT_WATER_PRICES)) {
    if (lower.includes(key)) return price;
  }
  return fallback;
}

/** Legacy DB rows (company only, no year items) — show defaults on dashboard */
function ensureDefaultUtilityYears(
  grouped: Record<string, UtilityCompanyGroup>,
  slug: string
) {
  const year = String(new Date().getFullYear());
  for (const [companyName, group] of Object.entries(grouped)) {
    if (group.years.length > 0) continue;

    if (slug === "electricity" && group.companyItem) {
      const yearEntry: UtilityYearRate = { year, itemName: "", price: 0, rates: [] };
      fillElectricityYearRates(yearEntry, companyName);
      group.years.push(yearEntry);
      continue;
    }

    if (slug === "water" && group.companyItem) {
      const price =
        Number(group.companyItem.currentPrice) ||
        defaultWaterPrice(companyName, 0.8);
      group.years.push({
        year,
        itemName: `${companyName} (${year})`,
        price,
        rates: [],
      });
    }
  }
}
