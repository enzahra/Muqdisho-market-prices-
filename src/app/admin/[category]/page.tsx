"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { use } from "react";
import { isSuperAdmin, canAccessCategory, canAdminModifyCategory, getAdminNavCategories } from "@/lib/admin-role";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ToastContainer, useToast } from "@/components/Toast";
import { adminFetch, adminLogout, parseAdminJson, verifyAdminAuth } from "@/lib/admin-client";
import { getDisplaySeason, getSeasonLabel, getPriceSeason, isLivestockCategory, PRICE_SEASONS, PRICE_SEASON_LABELS, type PriceSeason } from "@/lib/season";
import { groupUtilityItems, isUtilityCategory, type UtilityCompanyGroup, type UtilityYearRate, electricityRateItemName, ELECTRICITY_RATES, getMissingElectricityRateItems, getElectricityCompanyLogo, getUtilityLogoVariant, getWaterCompanyDisplayName, getWaterCompanyLogo } from "@/lib/utility-rates";

const LEGACY_ANIMAL_BASE_DENY = [
  "Geelka", "Lo'da", "Ariga", "Geel", "Lo'", "Ari", "Ari'",
  "Camel", "Cattle", "Goat/Sheep", "Goat", "Sheep",
];

const BREED_SORT: Record<string, number> = {
  Hasha: 1, Hal: 1, Ratiga: 2, qalin: 3, qaalin: 4,
  Dibiga: 1, Sac: 2, "Lo'da": 3, Weyl: 4, Weysha: 5,
  Orgi: 1, "Ri'": 2, Waxar: 3, Ariga: 4,
};

const LIVESTOCK_TYPE_LABELS: Record<string, string> = {
  geel: "Geel",
  lo: "Lo'",
  ari: "Ari'",
};

function getBreedsFromCategory(cat: any): string[] {
  const breeds: string[] = [];
  const seen = new Set<string>();
  for (const item of cat.items || []) {
    const match = item.name.match(/(.+) \((.+)\)/);
    const base = match ? match[1].trim() : item.name;
    if (LEGACY_ANIMAL_BASE_DENY.includes(base) || seen.has(base)) continue;
    seen.add(base);
    breeds.push(base);
  }
  return breeds.sort((a, b) => (BREED_SORT[a] ?? 99) - (BREED_SORT[b] ?? 99));
}

export default function AdminPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = use(params);
  const categoryParam = resolvedParams.category;
  const categorySlug = (categoryParam || "").toLowerCase();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<any>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toasts, showToast, dismiss } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditLoadingMore, setAuditLoadingMore] = useState(false);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const router = useRouter();

  const [initialPrices, setInitialPrices] = useState<any>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const AUDIT_PAGE_SIZE = 5;

  type AuditResponse = { logs: any[]; hasMore: boolean; total?: number };

  const fetchRecentLogs = useCallback(async (offset = 0, append = false) => {
    try {
        const result = await parseAdminJson<AuditResponse>(
          await adminFetch(`/api/audit?limit=${AUDIT_PAGE_SIZE}&offset=${offset}`, { cache: 'no-store' })
        );
        if (!result.ok || !result.data) {
          if (!append) setLogs([]);
          setAuditHasMore(false);
          return;
        }
        const { logs: batch, hasMore } = result.data;
        setLogs((prev) => (append ? [...prev, ...(batch ?? [])] : (batch ?? [])));
        setAuditHasMore(!!hasMore);
    } catch (err) { console.error(err); }
  }, []);

  const loadMoreAuditLogs = async () => {
    setAuditLoadingMore(true);
    try {
      await fetchRecentLogs(logs.length, true);
    } finally {
      setAuditLoadingMore(false);
    }
  };

  const collapseAuditLogs = () => {
    fetchRecentLogs(0, false);
  };


  const fetchCurrentPrices = useCallback(async () => {
    try {
      const resp = await fetch('/api/prices', { cache: 'no-store' });
      const data = await resp.json();
      if (!Array.isArray(data)) {
        console.error("/api/prices: expected array of categories", data);
        setDbCategories([]);
        return;
      }
      setDbCategories(data);

      const pricesObj: any = {};
      data.forEach((cat: any) => {
        cat.items.forEach((item: any) => {
          if (isLivestockCategory(cat.slug)) {
            for (const season of PRICE_SEASONS) {
              pricesObj[`${cat.slug}_${item.name}_${season}`] = item[`price${season.charAt(0).toUpperCase()}${season.slice(1)}`] ?? '';
            }
          } else {
            pricesObj[`${cat.slug}_${item.name}`] = item.currentPrice;
          }
        });
      });
      setPrices(pricesObj);
      setInitialPrices(pricesObj);
    } catch (err) { console.error(err); }
  }, []);

  const createElectricityRateItem = useCallback(async (
    categoryId: string,
    companyName: string,
    year: string,
    rate: (typeof ELECTRICITY_RATES)[number],
    adminEmail: string
  ) => {
    const itemName = electricityRateItemName(companyName, year, rate.label);
    const resp = await adminFetch("/api/admin/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: itemName, categoryId, adminEmail }),
    });
    if (!resp.ok) {
      const errResult = await parseAdminJson(resp);
      throw new Error(errResult.error || `Lama dari karo "${itemName}"`);
    }
    const createResult = await parseAdminJson<{ id: string }>(resp);
    if (createResult.data?.id) {
      await adminFetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: createResult.data.id, price: rate.defaultPrice, updatedBy: adminEmail }),
      });
    }
  }, []);

  const syncMissingElectricityRates = useCallback(async (data: any[], adminEmail: string) => {
    const cat = data.find((c: any) => c.slug === "electricity");
    if (!cat) return false;

    const grouped = groupUtilityItems(cat.items || [], "electricity", {});
    let created = false;

    for (const [companyName, group] of Object.entries(grouped) as [string, UtilityCompanyGroup][]) {
      for (const yearEntry of group.years) {
        const missing = getMissingElectricityRateItems(cat.items || [], companyName, yearEntry.year);
        for (const rate of missing) {
          await createElectricityRateItem(cat.id, companyName, yearEntry.year, rate, adminEmail);
          created = true;
        }
      }
    }

    return created;
  }, [createElectricityRateItem]);


  useEffect(() => {
    setMounted(true);

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const authed = await verifyAdminAuth();
        if (cancelled) return;
        if (!authed) {
          window.location.href =
            "/admin-login?error=" +
            encodeURIComponent("Fadlan geli email-kaaga iyo password-kaaga.");
          return;
        }
        if (!canAccessCategory(authed.adminRole, categorySlug)) {
          window.location.href = "/admin";
          return;
        }
        setUser(authed);
        await fetchCurrentPrices();
        if (categorySlug === "electricity") {
          const resp = await fetch("/api/prices", { cache: "no-store" });
          const data = await resp.json();
          if (Array.isArray(data)) {
            const synced = await syncMissingElectricityRates(data, authed.email);
            if (synced) await fetchCurrentPrices();
          }
        }
        await fetchRecentLogs();
      } catch (err) {
        console.error("Admin page load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [categorySlug, fetchCurrentPrices, fetchRecentLogs, syncMissingElectricityRates]);


  const handlePriceChange = (categorySlug: string, itemName: string, value: string, season?: PriceSeason) => {
    const key = season
      ? `${categorySlug}_${itemName}_${season}`
      : `${categorySlug}_${itemName}`;
    setPrices((prev: any) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const [newItemName, setNewItemName] = useState<Record<string, string>>({});
  const [newYearRate, setNewYearRate] = useState<Record<string, { year: string; price: string }>>({});
  const [addBirimo, setAddBirimo] = useState(true);
  const [addSugunto, setAddSugunto] = useState(true);
  const [selectedLivestockSlug, setSelectedLivestockSlug] = useState("");
  const [selectedBreed, setSelectedBreed] = useState("");
  const [entryMode, setEntryMode] = useState<"excel" | "manual" | null>(null);

  useEffect(() => {
    if (categorySlug !== "animals") return;
    const hasSplit = dbCategories.some((c) => ["geel", "lo", "ari"].includes(c.slug));
    if (!hasSplit || selectedLivestockSlug) return;
    if (dbCategories.some((c) => c.slug === "geel")) {
      setSelectedLivestockSlug("geel");
    }
  }, [dbCategories, categorySlug, selectedLivestockSlug]);

  const addNewItem = async (categoryId: string) => {
    const name = newItemName[categoryId];
    if (!name || name.trim() === "") return;

    try {
      const isLivestock = ['animals', 'geel', 'lo', 'ari'].includes(categorySlug);

      if (isLivestock) {
        const namesToCreate: string[] = [];
        if (addBirimo) namesToCreate.push(`${name.trim()} (Birimo)`);
        if (addSugunto) namesToCreate.push(`${name.trim()} (Sugunto)`);

        if (namesToCreate.length === 0) {
          throw new Error("Fadlan dooro ugu yaraan hal nooc (Birimo ama Sugunto) si loo abuuro.");
        }

        let createdCount = 0;
        for (const itemNameToCreate of namesToCreate) {
          const resp = await adminFetch('/api/admin/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: itemNameToCreate,
              categoryId,
              adminEmail: user?.email
            })
          });

          if (resp.ok) {
            createdCount++;
          } else {
            const errResult = await parseAdminJson(resp);
            throw new Error(errResult.error || `Lama dari karo "${itemNameToCreate}"`);
          }
        }

        showToast(`Si guul leh ayaa loo daray ${createdCount} nooc (${namesToCreate.join(', ')})!`, "success");
        setNewItemName(prev => ({ ...prev, [categoryId]: "" }));
        fetchCurrentPrices(); // Refresh list
      } else {
        const resp = await adminFetch('/api/admin/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            categoryId,
            adminEmail: user?.email
          })
        });

        if (resp.ok) {
          showToast(`"${name}" waa la daray!`, "success");
          setNewItemName(prev => ({ ...prev, [categoryId]: "" }));
          fetchCurrentPrices(); // Refresh list
        } else {
          const errResult = await parseAdminJson(resp);
          throw new Error(errResult.error || "Lama dari karo");
        }
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const addYearRate = async (categoryId: string, categorySlugKey: string, companyName: string) => {
    const stateKey = `${categoryId}_${companyName}`;
    const year = newYearRate[stateKey]?.year?.trim();
    if (!year || !/^\d{4}$/.test(year)) {
      showToast("Fadlan geli sanad sax ah (tusaale: 2025)", "error");
      return;
    }

    const cat = dbCategories.find((c) => c.id === categoryId);
    const grouped = groupUtilityItems(cat?.items || [], categorySlugKey, prices);
    const existing = grouped[companyName]?.years.find((y) => y.year === year);
    if (existing) {
      showToast(`Sanadka ${year} horey ayuu u jiraa.`, "error");
      return;
    }

    try {
      if (categorySlugKey === "electricity") {
        for (const rate of ELECTRICITY_RATES) {
          await createElectricityRateItem(categoryId, companyName, year, rate, user?.email ?? "");
        }
      } else {
        const priceVal = newYearRate[stateKey]?.price?.trim();
        const itemName = `${companyName} (${year})`;
        const resp = await adminFetch("/api/admin/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: itemName, categoryId, adminEmail: user?.email }),
        });
        if (!resp.ok) {
          const errResult = await parseAdminJson(resp);
          throw new Error(errResult.error || "Lama dari karo sanadkan");
        }
        const createResult = await parseAdminJson<{ id: string }>(resp);
        const finalPrice = priceVal && !Number.isNaN(Number(priceVal)) ? Number(priceVal) : 0;
        if (createResult.data?.id && finalPrice > 0) {
          await adminFetch("/api/prices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId: createResult.data.id, price: finalPrice, updatedBy: user?.email }),
          });
        }
      }

      showToast(`Sanadka ${year} waa la daray!`, "success");
      setNewYearRate((prev) => ({ ...prev, [stateKey]: { year: "", price: "" } }));
      await fetchCurrentPrices();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const removeUtilityYear = async (categoryId: string, yearEntry: UtilityYearRate, isElectricity: boolean) => {
    if (!window.confirm(`Ma hubtaa inaad tirtirto sanadka ${yearEntry.year}?`)) return;
    const cat = dbCategories.find((c) => c.id === categoryId);
    const namesToDelete = isElectricity
      ? yearEntry.rates.map((r) => r.itemName)
      : [yearEntry.itemName];

    try {
      for (const itemName of namesToDelete) {
        const item = cat?.items?.find((i: any) => i.name === itemName);
        if (!item?.id) continue;
        const resp = await adminFetch("/api/admin/items", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: item.id, adminEmail: user?.email }),
        });
        if (!resp.ok) {
          const errResult = await parseAdminJson(resp);
          throw new Error(errResult.error || "Lama tirtiri karo");
        }
      }
      showToast(`Sanadka ${yearEntry.year} waa la tirtiray!`, "success");
      fetchCurrentPrices();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const deleteUtilityCompany = async (categorySlugKey: string, companyName: string, group: UtilityCompanyGroup) => {
    if (!window.confirm(`Ma hubtaa inaad tirtirto shirkadda "${companyName}" iyo dhammaan qiimaha sanadlaha ah?`)) return;

    const cat = dbCategories.find((c) => c.slug === categorySlugKey);
    const namesToDelete = new Set<string>([companyName]);
    for (const yearEntry of group.years) {
      if (yearEntry.itemName) namesToDelete.add(yearEntry.itemName);
      for (const rate of yearEntry.rates) namesToDelete.add(rate.itemName);
    }

    const toDelete: { id: string; name: string }[] = [];
    for (const name of namesToDelete) {
      const item = cat?.items?.find((i: any) => i.name === name);
      if (item?.id) toDelete.push({ id: item.id, name: item.name });
    }

    try {
      for (const entry of toDelete) {
        const resp = await adminFetch("/api/admin/items", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: entry.id, adminEmail: user?.email }),
        });
        if (!resp.ok) {
          const errResult = await parseAdminJson(resp);
          throw new Error(errResult.error || `Lama tirtiri karo "${entry.name}"`);
        }
      }
      showToast(`"${companyName}" waa la tirtiray!`, "success");
      fetchCurrentPrices();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const removeItem = async (itemId: string, itemName: string) => {
    if (!window.confirm(`Ma hubtaa inaad tirtirto "${itemName}"? Tani dib looma soo celin karo.`)) return;

    try {
      const resp = await adminFetch('/api/admin/items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          adminEmail: user?.email
        })
      });

      if (resp.ok) {
        showToast(`"${itemName}" waa la tirtiray!`, "success");
        fetchCurrentPrices(); // Refresh list
      } else {
        const errResult = await parseAdminJson(resp);
        throw new Error(errResult.error || "Lama tirtiri karo");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const savePrices = async () => {
    if (!hasChanges) {
      showToast("Xogta waa sideeda, wax ka baddal marka hore!", "info");
      return;
    }
    try {
      const role = user?.adminRole ?? "ALL";

      // 1. First Pass: Validate all changed prices (allowed categories only)
      for (const cat of dbCategories) {
        if (!canAdminModifyCategory(role, cat.slug)) continue;
        for (const item of cat.items) {
          if (isLivestockCategory(cat.slug)) {
            for (const season of PRICE_SEASONS) {
              const itemKey = `${cat.slug}_${item.name}_${season}`;
              const val = prices[itemKey];
              if (val === undefined || val === '' || val === null) continue;
              if (Number(val) === Number(initialPrices[itemKey])) continue;
              const numPrice = Number(val);
              if (isNaN(numPrice)) throw new Error(`Qiimaha ${item.name} (${PRICE_SEASON_LABELS[season]}) ma ahan nambar sax ah.`);
              if (numPrice < 0) throw new Error(`Qiimaha ${item.name} kama yaraadaan karo eber (0).`);
              if (numPrice > 5000) throw new Error(`Qiimaha ${item.name} wuu xad-dhaafay ($5,000+).`);
            }
          } else {
            const itemKey = `${cat.slug}_${item.name}`;
            const currentPrice = prices[itemKey];
            if (currentPrice === undefined || currentPrice === "" || currentPrice === null) continue;
            if (Number(currentPrice) === initialPrices[itemKey]) continue;
            const numPrice = Number(currentPrice);
            if (isNaN(numPrice)) throw new Error(`Qiimaha ${item.name} ma ahan nambar sax ah.`);
            if (numPrice < 0) throw new Error(`Qiimaha ${item.name} kama yaraadaan karo eber (0).`);
            if (numPrice > 5000) throw new Error(`Qiimaha ${item.name} wuu xad-dhaafay ($5,000+).`);
          }
        }
      }

      // 2. Second Pass: Save
      for (const cat of dbCategories) {
        if (!canAdminModifyCategory(role, cat.slug)) continue;
        for (const item of cat.items) {
          if (isLivestockCategory(cat.slug)) {
            const seasonKeys = PRICE_SEASONS.map((s) => `${cat.slug}_${item.name}_${s}`);
            const anyChanged = seasonKeys.some(
              (key) => prices[key] !== undefined && Number(prices[key]) !== Number(initialPrices[key])
            );
            if (!anyChanged) continue;

            const body: Record<string, unknown> = { itemId: item.id, updatedBy: user.email };
            for (const season of PRICE_SEASONS) {
              const key = `${cat.slug}_${item.name}_${season}`;
              const apiKey = `price${season.charAt(0).toUpperCase()}${season.slice(1)}`;
              if (prices[key] !== undefined && prices[key] !== '') {
                body[apiKey] = Number(prices[key]);
              }
            }

            const result = await adminFetch('/api/prices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            const resParsed = await parseAdminJson(result);
            if (!resParsed.ok) throw new Error(resParsed.error || `Could not update ${item.name}`);
          } else {
            const itemKey = `${cat.slug}_${item.name}`;
            const currentPrice = prices[itemKey];
            if (currentPrice === undefined || currentPrice === "" || currentPrice === null) continue;
            if (Number(currentPrice) === initialPrices[itemKey]) continue;

            const result = await adminFetch('/api/prices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemId: item.id,
                price: Number(currentPrice),
                updatedBy: user.email
              })
            });
            const resParsed = await parseAdminJson(result);
            if (!resParsed.ok) throw new Error(resParsed.error || `Could not update ${item.name}`);
          }
        }
      }

      showToast("Xogta si guul leh ayaa loo keydiyay!", "success");
      setHasChanges(false);
      fetchCurrentPrices(); // Refresh to set new initial state
      fetchRecentLogs();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleLogout = async () => {
    await adminLogout();
    router.push("/admin-login");
  };

  const handleLivestockUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const resp = await adminFetch("/api/admin/livestock-upload", {
        method: "POST",
        body: formData,
      });
      const result = await parseAdminJson<{ message?: string; error?: string }>(resp);

      if (!result.ok) {
        throw new Error(result.error || "Upload failed");
      }

      showToast(result.data?.message || "Waa la soo raray!", "success");
      setHasChanges(false);
      await fetchCurrentPrices();
      await fetchRecentLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      showToast(msg, "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (!mounted || loading || !user) {
    return (
      <div className="pro-loader-screen">
        <div className="loader-orb"></div>
      </div>
    );
  }

  const activeSeason = getDisplaySeason();
  const activeSeasonLabel = getSeasonLabel(activeSeason);
  const activePriceSeason = getPriceSeason();
  const hasSplitAnimalCats = dbCategories.some((c) => ["geel", "lo", "ari"].includes(c.slug));
  const useLivestockCascade = categorySlug === "animals" && hasSplitAnimalCats;
  const livestockCats = dbCategories
    .filter((c) => ["geel", "lo", "ari"].includes(c.slug))
    .sort((a, b) => ({ geel: 1, lo: 2, ari: 3 }[a.slug as "geel" | "lo" | "ari"] ?? 99) - ({ geel: 1, lo: 2, ari: 3 }[b.slug as "geel" | "lo" | "ari"] ?? 99));
  const selectedLivestockCat = livestockCats.find((c) => c.slug === selectedLivestockSlug);
  const breedOptions = selectedLivestockCat ? getBreedsFromCategory(selectedLivestockCat) : [];
  const showAnimalsToolbar = categorySlug === "animals" && !useLivestockCascade;
  const showCascadePriceEditor = useLivestockCascade && !!selectedBreed && entryMode === "manual";
  const showCascadeExcelPanel = useLivestockCascade && !!selectedBreed && entryMode === "excel";

  const handleLivestockSelect = (slug: string) => {
    setSelectedLivestockSlug(slug);
    setSelectedBreed("");
    setEntryMode(null);
  };

  const handleBreedSelect = (breed: string) => {
    setSelectedBreed(breed);
    setEntryMode(null);
  };

  return (
    <div className="admin-pro-wrapper animate-pro">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <nav className="admin-pro-nav">
        <div className="admin-nav-container">
            <div className="admin-logo-group">
                <div className="logo-image-wrap">
                  <Image src="/images/logo.png" alt="Market Index Logo" width={38} height={38} priority={true} />
                </div>
                <h1>Muqdisho <span className="logo-sub">/ Market Prices</span></h1>
            </div>
            <div className="nav-actions">
                <div className="theme-toggle-wrap">
                  <ThemeToggle />
                </div>
                <button onClick={() => router.push('/dashboard')} className="btn-secondary">Ku noqo Dashboard-ka</button>
            </div>
        </div>
      </nav>

      <main className="admin-pro-grid">
        <div className="admin-pro-main">
            <header className="pro-header-group">
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>{categorySlug === 'animals' ? 'Sicirka rasmiga ah ee xoolaha' : categorySlug === 'water' ? 'Sicirka rasmiga ah ee Biyaha muqdisho' : categorySlug === 'electricity' ? 'Sicirka rasmiga ah ee korontada muqdisho' : 'Admin Panel'}</h1>
                    </div>
                    {hasChanges && (
                        <div className="changes-indicator">
                            ⚠️ PENDING CHANGES
                        </div>
                    )}
                 </div>
            </header>

            {(() => {
              const navCats = getAdminNavCategories(user?.adminRole ?? "ALL");
              if (navCats.length <= 1) return null;
              const labels: Record<string, string> = {
                animals: "🐄 Xoolaha",
                water: "💧 Biyaha",
                electricity: "⚡ Korontada",
              };
              return (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {navCats.map((slug) => (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => router.push(`/admin/${slug}`)}
                      className={`btn-${categorySlug === slug ? 'primary' : 'secondary'}`}
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      {labels[slug] ?? slug}
                    </button>
                  ))}
                </div>
              );
            })()}

            {showAnimalsToolbar && (
                <div className="animals-toolbar">
                    <div className="animals-toolbar-group">
                        <span className="season-text">{activeSeasonLabel}</span>
                        <span className="toolbar-divider" aria-hidden="true" />
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            className="upload-input-hidden"
                            onChange={handleLivestockUpload}
                        />
                        <button
                            type="button"
                            className="btn-primary upload-btn"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {uploading ? "Uploading..." : "Upload Excel File"}
                        </button>
                    </div>
                </div>
            )}

            {useLivestockCascade && (
                <div className="livestock-cascade">
                    <div className="livestock-type-tabs">
                        {livestockCats.map((cat) => (
                            <button
                                key={cat.slug}
                                type="button"
                                className={`livestock-type-tab livestock-type-tab-${cat.slug}${selectedLivestockSlug === cat.slug ? " active" : ""}`}
                                onClick={() => handleLivestockSelect(cat.slug)}
                            >
                                {LIVESTOCK_TYPE_LABELS[cat.slug] ?? cat.name}
                            </button>
                        ))}
                    </div>

                    {selectedLivestockSlug && (
                    <div className="cascade-row">
                        <div className="cascade-field">
                            <label htmlFor="breed-select">{LIVESTOCK_TYPE_LABELS[selectedLivestockSlug] ?? selectedLivestockCat?.name}</label>
                            <select
                                id="breed-select"
                                className="cascade-select"
                                value={selectedBreed}
                                onChange={(e) => handleBreedSelect(e.target.value)}
                            >
                                <option value="">Dooro Nucaa Rabo</option>
                                {breedOptions.map((breed) => (
                                    <option key={breed} value={breed}>
                                        {breed.replace(" (Lab)", "").replace(" (Dheddig)", "")}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    )}

                    {selectedBreed && !entryMode && (
                        <div className="entry-mode-picker">
                            <p className="entry-mode-title">Gali qiimaha <strong>{selectedBreed.replace(" (Lab)", "").replace(" (Dheddig)", "")}</strong>?</p>
                            <div className="entry-mode-actions">
                                <button type="button" className="btn-primary entry-mode-btn" onClick={() => setEntryMode("excel")}>
                                    Upload Excel File
                                </button>
                                <button type="button" className="btn-secondary entry-mode-btn" onClick={() => setEntryMode("manual")}>
                                    Gacanta ku gali
                                </button>
                            </div>
                        </div>
                    )}

                    {showCascadeExcelPanel && (
                        <div className="cascade-detail-panel">
                            <div className="cascade-detail-head">
                                <div>
                                    <span className="cascade-breadcrumb">{selectedLivestockCat?.name} / {selectedBreed.replace(" (Lab)", "").replace(" (Dheddig)", "")}</span>
                                    <span className="season-text">{activeSeasonLabel}</span>
                                </div>
                                <button type="button" className="btn-link-back" onClick={() => setEntryMode(null)}>← Dib u noqo</button>
                            </div>
                            <div className="animals-toolbar">
                                <div className="animals-toolbar-group">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        className="upload-input-hidden"
                                        onChange={handleLivestockUpload}
                                    />
                                    <button
                                        type="button"
                                        className="btn-primary upload-btn"
                                        disabled={uploading}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {uploading ? "Uploading..." : "Upload Excel File"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {showCascadePriceEditor && (
                        <div className="cascade-detail-head cascade-detail-head-inline">
                            <div>
                                <span className="cascade-breadcrumb">{selectedLivestockCat?.name} / {selectedBreed.replace(" (Lab)", "").replace(" (Dheddig)", "")}</span>
                                <span className="season-text">{activeSeasonLabel}</span>
                            </div>
                            <button type="button" className="btn-link-back" onClick={() => setEntryMode(null)}>← Dib u noqo</button>
                        </div>
                    )}
                </div>
            )}

            {(!useLivestockCascade || showCascadePriceEditor) && (
            <div className="pro-card-stack">
                {dbCategories.filter((cat) => {
                    if (cat.slug === "animals" && dbCategories.some(c => ["geel", "lo", "ari"].includes(c.slug))) {
                        return false;
                    }

                    if (useLivestockCascade) {
                        return cat.slug === selectedLivestockSlug;
                    }
                    
                    if (categorySlug === "animals") {
                        return ["geel", "lo", "ari", "animals"].includes(cat.slug);
                    }
                    
                    return cat.slug === categorySlug;
                }).sort((a, b) => {
                    const order = { 'geel': 1, 'lo': 2, 'ari': 3, 'animals': 4, 'water': 5, 'electricity': 6 };
                    return (order[a.slug as keyof typeof order] || 99) - (order[b.slug as keyof typeof order] || 99);
                }).map((cat) => {
                    const hasSplitAnimalCats = dbCategories.some((c) =>
                      ["geel", "lo", "ari"].includes(c.slug)
                    );
                    // Group items by base name if they follow the "Name (Type)" pattern
                    const groupedItems: Record<string, any[]> = {};
                    const legacyAnimalBaseDeny = LEGACY_ANIMAL_BASE_DENY;
                    cat.items.filter((item: any) => {
                        if (!hasSplitAnimalCats && cat.slug === "animals") {
                          return true;
                        }
                        const baseName = (item.name.match(/(.+) \((.+)\)/)?.[1] || item.name).trim();
                        return !legacyAnimalBaseDeny.includes(baseName);
                    }).forEach((item: any) => {
                        const match = item.name.match(/(.+) \((.+)\)/);
                        const groupKey = match ? match[1] : "General";
                        if (!groupedItems[groupKey]) groupedItems[groupKey] = [];
                        groupedItems[groupKey].push(item);
                    });

                    const orderedGroupNames: string[] = [];
                    for (const item of cat.items) {
                        const match = item.name.match(/(.+) \((.+)\)/);
                        const groupKey = match ? match[1].trim() : item.name;
                        if (!orderedGroupNames.includes(groupKey)) orderedGroupNames.push(groupKey);
                    }
                    for (const groupKey of Object.keys(groupedItems)) {
                        if (!orderedGroupNames.includes(groupKey)) orderedGroupNames.push(groupKey);
                    }

                    const sortedGroups = orderedGroupNames
                        .filter((groupName) => groupedItems[groupName]?.length)
                        .filter((groupName) => !useLivestockCascade || !selectedBreed || groupName === selectedBreed)
                        .map((groupName) => [groupName, groupedItems[groupName]] as [string, any[]]);

                    return (
                        <div key={cat.id} className="pro-cat-editor-card">
                            <div className="pro-cat-header">
                                <span className="pro-cat-indicator"></span>
                                <h3>{cat.name}</h3>
                            </div>
                            
                            <div className="pro-grouped-container">
                                {isUtilityCategory(cat.slug) ? (
                                    Object.entries(groupUtilityItems(cat.items, cat.slug, prices)).map(([companyName, group]) => {
                                        const stateKey = `${cat.id}_${companyName}`;
                                        const yearDraft = newYearRate[stateKey] || { year: "", price: "" };
                                        const isElectricity = cat.slug === "electricity";
                                        const isWater = cat.slug === "water";
                                        const companyLogo = isElectricity
                                            ? getElectricityCompanyLogo(companyName)
                                            : isWater
                                                ? getWaterCompanyLogo(companyName)
                                                : null;
                                        return (
                                            <div key={companyName} className="utility-company-block">
                                                <div className="utility-company-head">
                                                    <div>
                                                        {companyLogo ? (
                                                            <>
                                                                <div className={`admin-utility-logo-frame variant-${getUtilityLogoVariant(companyLogo)} ${isWater ? "theme-water" : "theme-electricity"}`}>
                                                                    <Image
                                                                        src={companyLogo}
                                                                        alt={isWater ? getWaterCompanyDisplayName(companyName) : companyName}
                                                                        width={140}
                                                                        height={80}
                                                                        quality={95}
                                                                        className="admin-utility-logo-img"
                                                                    />
                                                                </div>
                                                                {isWater ? (
                                                                    <p className={`water-company-display-name${companyLogo.includes("wabax") ? " water-company-display-name-caps" : ""}`}>
                                                                        {getWaterCompanyDisplayName(companyName)}
                                                                    </p>
                                                                ) : null}
                                                            </>
                                                        ) : (
                                                            <h4 className="admin-group-title">
                                                                {isWater ? getWaterCompanyDisplayName(companyName) : companyName}
                                                            </h4>
                                                        )}
                                                        <p className="utility-company-sub">
                                                            {isElectricity ? "Sanad kasta: Home Guri, Laamo badan, Hal laan" : "Qiimaha sanadlaha ah ee shirkaddan"}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn-remove-company"
                                                        onClick={() => deleteUtilityCompany(cat.slug, companyName, group)}
                                                    >
                                                        Tirtir Shirkadda
                                                    </button>
                                                </div>

                                                {group.years.length === 0 ? (
                                                    <p className="utility-empty-hint">Weli sanad lama darin — ku dar sanadka hoose.</p>
                                                ) : isElectricity ? (
                                                    <div className="electricity-years-stack">
                                                        {group.years.map((yearEntry) => (
                                                            <div key={yearEntry.year} className="electricity-year-block">
                                                                <div className="electricity-year-head">
                                                                    <strong>{yearEntry.year}</strong>
                                                                    <button type="button" className="btn-remove-year" onClick={() => removeUtilityYear(cat.id, yearEntry, true)}>
                                                                        Tirtir Sanadka
                                                                    </button>
                                                                </div>
                                                                <div className="utility-years-grid">
                                                                    {yearEntry.rates.map((rate) => (
                                                                        <div key={rate.itemName} className="pro-input-node">
                                                                            <label>{rate.label}</label>
                                                                            <div className="pro-input-wrap" style={{ borderLeft: "4px solid #eab308" }}>
                                                                                <span className="pro-unit-symbol" style={{ color: "#eab308" }}>$</span>
                                                                                <input
                                                                                    type="number"
                                                                                    step="any"
                                                                                    placeholder="0.00"
                                                                                    value={prices[`${cat.slug}_${rate.itemName}`] ?? (rate.price > 0 ? rate.price : "")}
                                                                                    onChange={(e) => handlePriceChange(cat.slug, rate.itemName, e.target.value)}
                                                                                />
                                                                                <span className="tier-unit-tag">/kWh</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="utility-years-grid">
                                                        {group.years.map((yearEntry) => (
                                                            <div key={yearEntry.year} className="pro-input-node">
                                                                <label>{yearEntry.year}</label>
                                                                <div className="pro-input-wrap" style={{ borderLeft: "4px solid #0ea5e9" }}>
                                                                    <span className="pro-unit-symbol" style={{ color: "#0ea5e9" }}>$</span>
                                                                    <input
                                                                        type="number"
                                                                        step="any"
                                                                        placeholder="0.00"
                                                                        value={prices[`${cat.slug}_${yearEntry.itemName}`] ?? ""}
                                                                        onChange={(e) => handlePriceChange(cat.slug, yearEntry.itemName, e.target.value)}
                                                                    />
                                                                    <span className="tier-unit-tag">/m³</span>
                                                                    <button onClick={() => removeUtilityYear(cat.id, yearEntry, false)} className="btn-remove-item" title="Tirtir sanadkan">
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="utility-add-year-row">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        placeholder="Sanad (2025)"
                                                        maxLength={4}
                                                        value={yearDraft.year}
                                                        onChange={(e) => setNewYearRate((prev) => ({
                                                            ...prev,
                                                            [stateKey]: { ...yearDraft, year: e.target.value.replace(/\D/g, "").slice(0, 4) },
                                                        }))}
                                                    />
                                                    {!isElectricity && (
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            placeholder="Qiimaha / m³"
                                                            value={yearDraft.price}
                                                            onChange={(e) => setNewYearRate((prev) => ({
                                                                ...prev,
                                                                [stateKey]: { ...yearDraft, price: e.target.value },
                                                            }))}
                                                        />
                                                    )}
                                                    <button type="button" className="btn-add-year" onClick={() => addYearRate(cat.id, cat.slug, companyName)}>
                                                        ➕ Ku dar Sanad
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                sortedGroups.map(([groupName, items]) => {
                                    // Sort Birimo before Sugunto
                                    const sortedItems = [...items].sort((a, b) => {
                                        if (a.name.includes('Birimo') && !b.name.includes('Birimo')) return -1;
                                        if (!a.name.includes('Birimo') && b.name.includes('Birimo')) return 1;
                                        return 0;
                                    });

                                    return (
                                        <div key={groupName} className="admin-group-block">
                                            {groupName !== "General" && <h4 className="admin-group-title">{groupName.replace(' (Lab)', '').replace(' (Dheddig)', '')}</h4>}
                                            <div className="pro-inputs-layout">
                                                {sortedItems.map((item: any) => {
                                                    const isBirimo = item.name.includes('Birimo');
                                                    const isSugunto = item.name.includes('Sugunto');
                                                    const borderColor = isBirimo ? '#4f46e5' : isSugunto ? '#059669' : '#e2e8f0';
                                                    const isLivestock = isLivestockCategory(cat.slug);
                                                    const typeLabel = item.name.includes("(") ? (item.name.match(/\((.+)\)/)?.[1] ?? item.name) : item.name;

                                                    if (isLivestock) {
                                                        return (
                                                            <div key={item.id} className="pro-input-node seasonal-node">
                                                                <label style={{ color: isBirimo ? '#6366f1' : isSugunto ? '#10b981' : 'var(--text-main)' }}>
                                                                    {typeLabel}
                                                                </label>
                                                                <div className="seasonal-inputs-row">
                                                                    {PRICE_SEASONS.map((season) => {
                                                                        const seasonLabel = PRICE_SEASON_LABELS[season];
                                                                        const isActive = activePriceSeason === season;
                                                                        const key = `${cat.slug}_${item.name}_${season}`;
                                                                        return (
                                                                            <div key={season} className={`pro-input-wrap seasonal-wrap${isActive ? ' is-active-season' : ''}`} style={{ borderLeft: `4px solid ${borderColor}` }}>
                                                                                <span className="season-tag">{seasonLabel}{isActive ? ' ●' : ''}</span>
                                                                                <span className="pro-unit-symbol" style={{ color: borderColor }}>$</span>
                                                                                <input
                                                                                    type="number"
                                                                                    step="any"
                                                                                    placeholder="0"
                                                                                    value={prices[key] !== undefined && prices[key] !== null ? prices[key] : ''}
                                                                                    onChange={(e) => handlePriceChange(cat.slug, item.name, e.target.value, season)}
                                                                                />
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <button
                                                                    onClick={() => removeItem(item.id, item.name)}
                                                                    className="btn-remove-item-inline"
                                                                    title="Tirtir shaygan"
                                                                >
                                                                    Tirtir
                                                                </button>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div key={item.id} className="pro-input-node">
                                                            <label style={{ color: isBirimo ? '#6366f1' : isSugunto ? '#10b981' : 'var(--text-muted)' }}>
                                                                {item.name.includes("(") ? (item.name.match(/\((.+)\)/)?.[1] ?? item.name) : item.name}
                                                            </label>
                                                            <div className="pro-input-wrap" style={{ borderLeft: `4px solid ${borderColor}` }}>
                                                                <span className="pro-unit-symbol" style={{ color: borderColor }}>$</span>
                                                                <input 
                                                                    type="number" 
                                                                    step="any"
                                                                    placeholder="0.00"
                                                                    value={(prices[`${cat.slug}_${item.name}`] !== undefined && prices[`${cat.slug}_${item.name}`] !== null) ? prices[`${cat.slug}_${item.name}`] : ""}
                                                                    onChange={(e) => handlePriceChange(cat.slug, item.name, e.target.value)}
                                                                />
                                                                <button 
                                                                    onClick={() => removeItem(item.id, item.name)}
                                                                    className="btn-remove-item"
                                                                    title="Tirtir shaygan"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                                )}
                            </div>

                            <div className="pro-add-new-box-container">
                                <div className="pro-add-new-box">
                                    <input 
                                        type="text" 
                                        placeholder={['animals', 'geel', 'lo', 'ari'].includes(cat.slug) ? "Ku dar xoolo cusub (tusaale: Qaalinka, Waxar)..." : isUtilityCategory(cat.slug) ? "Ku dar shirkad cusub (tusaale: Shirkad Hebel)..." : "Ku dar shay cusub (tusaale: Shirkad Hebel)..."} 
                                        value={newItemName[cat.id] || ""}
                                        onChange={(e) => setNewItemName(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                    />
                                    <button onClick={() => addNewItem(cat.id)} className="btn-add-item">
                                        ➕ Add New
                                    </button>
                                </div>
                                {['animals', 'geel', 'lo', 'ari'].includes(cat.slug) && (
                                    <div className="livestock-add-options">
                                        <span className="options-title">Noocyada la abuurayo (Automatic Creation):</span>
                                        <div className="options-checks">
                                            <label className="checkbox-label">
                                                <input 
                                                    type="checkbox" 
                                                    checked={addBirimo} 
                                                    onChange={(e) => setAddBirimo(e.target.checked)} 
                                                />
                                                <span className="check-text">Birimo <span className="example-tag">(Tik saar haddii aad rabto - tusaale: {newItemName[cat.id] ? newItemName[cat.id].trim() : "Magaca"} (Birimo))</span></span>
                                            </label>
                                            <label className="checkbox-label">
                                                <input 
                                                    type="checkbox" 
                                                    checked={addSugunto} 
                                                    onChange={(e) => setAddSugunto(e.target.checked)} 
                                                />
                                                <span className="check-text">Sugunto <span className="example-tag">(Tik saar haddii aad rabto - tusaale: {newItemName[cat.id] ? newItemName[cat.id].trim() : "Magaca"} (Sugunto))</span></span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            )}


            {(!useLivestockCascade || showCascadePriceEditor) && (
            <div className="pro-final-save-bar">
                <button onClick={savePrices} className="btn-primary" style={{ width: '100%', padding: '20px', fontSize: '1.1rem' }}>UPDATE LIVE PRICE INDEX</button>
            </div>
            )}
        </div>

        <aside className="admin-pro-sidebar">
            <div className="pro-sidebar-card">
                 <div className="pro-side-header">AUTHENTICATED NODE</div>
                 <div className="pro-profile-box">
                    <div className="pro-avatar-side">A</div>
                    <div className="pro-meta-side">
                        <span className="pro-email-side">{user.email}</span>
                        <span className="pro-status-side-pill">ACTIVE</span>
                    </div>
                 </div>
            </div>

            {isSuperAdmin(user?.adminRole) && (
              <div className="pro-sidebar-card">
                   <div className="pro-side-header">ADMINISTRATION</div>
                   <button onClick={() => router.push('/admin/users')} className="btn-secondary" style={{ width: '100%', fontSize: '0.85rem' }}>
                      👥 User Management
                   </button>
              </div>
            )}

            <div className="pro-sidebar-card">
                 <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%', fontSize: '0.85rem' }}>
                    🚪 Ka bax (Logout)
                 </button>
            </div>

            <div className="pro-sidebar-card">
                 <div className="pro-side-header">RECENT ACTIVITY AUDIT</div>
                 <div className="pro-logs-list">
                     {logs.length === 0 && <div className="empty-state">Weli wax audit activity ah lama helin.</div>}
                     {logs.map((log: any) => (
                        <div key={log.id} className="pro-log-item">
                            <div className="pro-log-meta">
                                <strong>{log.adminEmail}</strong>
                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="pro-log-action">{log.action}</p>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{log.details}</p>
                        </div>
                     ))}
                 </div>
                 {(auditHasMore || logs.length > AUDIT_PAGE_SIZE) && (
                   <div className="pro-audit-actions">
                     {auditHasMore && (
                       <button
                         type="button"
                         onClick={loadMoreAuditLogs}
                         disabled={auditLoadingMore}
                         className="btn-audit-more"
                       >
                         {auditLoadingMore ? 'Loading…' : 'See more'}
                       </button>
                     )}
                     {logs.length > AUDIT_PAGE_SIZE && (
                       <button
                         type="button"
                         onClick={collapseAuditLogs}
                         disabled={auditLoadingMore}
                         className="btn-audit-less"
                       >
                         See less
                       </button>
                     )}
                   </div>
                 )}
            </div>
        </aside>
      </main>

      <style jsx>{`
        .admin-pro-wrapper { min-height: 100vh; background: var(--bg-main); color: var(--text-main); font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; display: flex; flex-direction: column; transition: all 0.4s ease; }
        .admin-pro-nav { background: var(--bg-card, #ffffff); border-bottom: 1.5px solid var(--border); height: 80px; display: flex; align-items: center; position: sticky; top: 0; z-index: 1000; width: 100%; transition: all 0.4s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .admin-nav-container { width: 100%; max-width: 1536px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 0 40px; }
        .admin-logo-group { display: flex; align-items: center; gap: 12px; }
        .admin-logo-group h1 { font-size: 1.15rem; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; display: flex; align-items: center; gap: 5px; }
        .dark .admin-logo-group h1 { color: #c7d2fe; }
        .logo-sub { color: #64748b; font-weight: 500; }
        .nav-actions { display: flex; align-items: center; gap: 16px; }
        .theme-toggle-wrap { width: 180px; }

        .admin-pro-grid { display: grid; grid-template-columns: 1fr 380px; max-width: 1536px; width: 100%; margin: 40px auto; padding: 0 40px; gap: 40px; }
        .pro-header-group { margin-bottom: 30px; }
        .changes-indicator { background: #fffbeb; color: #b45309; padding: 8px 16px; border-radius: 50px; font-weight: 800; font-size: 0.7rem; border: 1px solid #fef3c7; display: inline-flex; align-items: center; gap: 6px; letter-spacing: 0.5px; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        .pro-header-group h1 { font-size: 2.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 8px; letter-spacing: -1.5px; }
        
        .pro-cat-editor-card { background: var(--bg-card, #ffffff); border: 1.5px solid var(--border); border-radius: 20px; padding: 35px; margin-bottom: 35px; box-shadow: 0 10px 30px -15px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.02); transition: all 0.3s ease; }
        .pro-cat-header { display: flex; align-items: center; gap: 12px; margin-bottom: 30px; padding-bottom: 18px; border-bottom: 1.5px solid var(--border); }
        .pro-cat-indicator { width: 10px; height: 10px; background: #10b981; border-radius: 50%; box-shadow: 0 0 12px rgba(16, 185, 129, 0.5); }
        .pro-cat-header h3 { font-size: 1.2rem; font-weight: 800; color: #1e3a8a; letter-spacing: 0.5px; }

        .pro-inputs-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 28px; }
        .pro-input-node label { display: block; font-size: 0.8rem; color: var(--text-main); font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.8px; }
        .pro-input-wrap { background: var(--bg-main); border: 1.5px solid var(--border); border-radius: 14px; display: flex; align-items: center; padding: 0 16px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .pro-input-wrap:focus-within { border-color: #6366f1; background: var(--bg-card, #ffffff); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12); transform: translateY(-1px); }
        .pro-input-wrap input { width: 100%; height: 52px; background: transparent; border: none; font-size: 1.35rem; font-weight: 800; color: var(--text-main); outline: none; padding-left: 8px; }
        .pro-unit-symbol { font-size: 1.15rem; font-weight: 800; color: #6366f1; opacity: 0.85; }

        .pro-sidebar-card { background: var(--bg-card, #ffffff); border: 1.5px solid var(--border); border-radius: 20px; padding: 28px; margin-bottom: 30px; box-shadow: 0 10px 30px -15px rgba(0,0,0,0.05); }
        .pro-side-header { font-size: 0.72rem; color: var(--text-main); font-weight: 800; letter-spacing: 1.2px; margin-bottom: 25px; border-bottom: 1.5px solid var(--border); padding-bottom: 12px; text-transform: uppercase; }
        .pro-profile-box { display: flex; gap: 15px; align-items: center; margin-bottom: 10px; background: var(--bg-main); padding: 18px; border-radius: 14px; border: 1px solid var(--border); }
        .pro-avatar-side { width: 46px; height: 46px; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #fff; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.25rem; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.25); }
        .pro-meta-side { display: flex; flex-direction: column; gap: 6px; overflow: hidden; }
        .pro-email-side { font-size: 0.88rem; font-weight: 800; color: var(--text-main); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
        .pro-status-side-pill { font-size: 0.62rem; color: #10b981; font-weight: 900; background: rgba(16, 185, 129, 0.12); padding: 2px 8px; border-radius: 20px; border: 1px solid rgba(16, 185, 129, 0.2); }

        .pro-log-item { padding: 18px 0; border-bottom: 1.5px solid var(--border); transition: all 0.2s ease; }
        .pro-log-item:hover { transform: translateX(4px); }
        .pro-log-meta { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px; }
        .pro-log-meta strong { color: #4f46e5; }
        .pro-log-action { font-size: 0.88rem; font-weight: 700; color: var(--text-main); }
        .empty-state { color: var(--text-muted); font-size: 0.85rem; padding: 16px 0; }
        .pro-logs-list { max-height: 420px; overflow-y: auto; padding-right: 4px; }
        .pro-audit-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1.5px solid var(--border); }
        .btn-audit-more, .btn-audit-less { width: 100%; padding: 10px 14px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s ease; }
        .btn-audit-more { background: rgba(99, 102, 241, 0.08); color: #4f46e5; border: 1.5px solid rgba(99, 102, 241, 0.2); }
        .btn-audit-more:hover:not(:disabled) { background: rgba(99, 102, 241, 0.14); border-color: rgba(99, 102, 241, 0.35); }
        .btn-audit-less { background: transparent; color: var(--text-muted); border: 1.5px solid var(--border); }
        .btn-audit-less:hover:not(:disabled) { background: var(--bg-main); color: var(--text-main); }
        .btn-audit-more:disabled, .btn-audit-less:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .admin-group-block { margin-bottom: 30px; padding: 25px; background: var(--bg-main); border-radius: 16px; border: 1px solid var(--border); }
        .admin-group-title { font-size: 0.9rem; font-weight: 800; color: #1e3a8a; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1.5px solid var(--border); padding-bottom: 10px; }
        .pro-grouped-container { display: flex; flex-direction: column; gap: 15px; }

        .pro-add-new-box-container { margin-top: 35px; padding-top: 25px; border-top: 1.5px dashed var(--border); display: flex; flex-direction: column; gap: 12px; }
        .pro-add-new-box { display: flex; gap: 15px; }
        .pro-add-new-box input { flex: 1; height: 52px; background: var(--bg-main); border: 1.5px solid var(--border); border-radius: 14px; padding: 0 18px; font-size: 0.92rem; font-weight: 600; color: var(--text-main); outline: none; transition: all 0.2s; }
        .pro-add-new-box input:focus { border-color: #6366f1; background: var(--bg-card, #ffffff); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
        .btn-add-item { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: #fff; border: none; padding: 0 28px; border-radius: 14px; font-weight: 800; font-size: 0.88rem; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); white-space: nowrap; box-shadow: 0 4px 12px rgba(30, 58, 138, 0.15); }
        .btn-add-item:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(30, 58, 138, 0.25); background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); }
        .btn-add-item:active { transform: translateY(0); }
        .utility-company-block { border: 1.5px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; background: var(--bg-main); }
        .utility-company-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
        .admin-utility-logo-frame {
            display: inline-flex; align-items: center; justify-content: center;
            margin-bottom: 10px; line-height: 0;
        }
        .admin-utility-logo-frame.variant-round {
            width: 52px; height: 52px; padding: 3px; border-radius: 50%;
            background: linear-gradient(145deg, #ffffff 0%, #f0f9ff 100%);
            border: 1.5px solid rgba(14, 165, 233, 0.22);
            box-shadow: 0 3px 10px rgba(14, 165, 233, 0.14);
        }
        .admin-utility-logo-frame.variant-round .admin-utility-logo-img {
            width: 100% !important; height: 100% !important; max-width: none !important;
            border-radius: 50%; object-fit: cover;
        }
        .admin-utility-logo-frame.variant-wide {
            padding: 6px 12px; border-radius: 12px;
            background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
            border: 1px solid rgba(15, 23, 42, 0.07);
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
        }
        .admin-utility-logo-frame.variant-wide .admin-utility-logo-img {
            height: 36px !important; width: auto !important; max-width: 88px !important;
            object-fit: contain;
        }
        .admin-utility-logo-frame.variant-wabax {
            padding: 4px 8px 3px; border-radius: 12px;
            background: linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);
            border: 1px solid rgba(14, 165, 233, 0.18);
            box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);
        }
        .admin-utility-logo-frame.variant-wabax .admin-utility-logo-img {
            height: 40px !important; width: auto !important; max-width: 46px !important;
            object-fit: contain; object-position: center bottom;
        }
        .admin-utility-logo-frame.variant-compact .admin-utility-logo-img {
            height: 32px !important; width: auto !important; max-width: 120px !important;
            object-fit: contain;
        }
        .admin-utility-logo-frame.theme-water.variant-wide {
            background: linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);
            border-color: rgba(14, 165, 233, 0.18);
        }
        .admin-utility-logo-frame.theme-electricity.variant-wide {
            background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%);
            border-color: rgba(234, 179, 8, 0.22);
        }
        .admin-utility-logo-img { display: block; }
        .water-company-display-name {
            margin: 6px 0 0; font-size: 0.78rem; font-weight: 800; color: var(--text-main);
            line-height: 1.35; max-width: 280px;
        }
        .water-company-display-name-caps {
            font-size: 0.72rem; letter-spacing: 0.05em; text-transform: uppercase;
        }
        .utility-company-sub { margin: 4px 0 0; font-size: 0.82rem; color: var(--text-muted); }
        .utility-empty-hint { margin: 0 0 16px; font-size: 0.85rem; color: var(--text-muted); font-style: italic; }
        .utility-years-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .utility-add-year-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding-top: 16px; border-top: 1px dashed var(--border); }
        .utility-add-year-row input { flex: 1; min-width: 120px; height: 48px; background: var(--bg-card, #fff); border: 1.5px solid var(--border); border-radius: 12px; padding: 0 14px; font-size: 0.9rem; font-weight: 600; color: var(--text-main); outline: none; }
        .utility-add-year-row input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12); }
        .btn-add-year { background: #0ea5e9; color: #fff; border: none; padding: 0 20px; height: 48px; border-radius: 12px; font-weight: 800; font-size: 0.82rem; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
        .btn-add-year:hover { background: #0284c7; transform: translateY(-1px); }
        .btn-remove-company { background: transparent; border: 1.5px solid #fecaca; color: #dc2626; padding: 8px 14px; border-radius: 10px; font-size: 0.78rem; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
        .electricity-years-stack { display: flex; flex-direction: column; gap: 20px; margin-bottom: 20px; }
        .electricity-year-block { border: 1px solid var(--border); border-radius: 12px; padding: 16px; background: var(--bg-card, #fff); }
        .electricity-year-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .btn-remove-year { background: transparent; border: 1px solid #fecaca; color: #dc2626; padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
        .tier-unit-tag { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); padding-right: 8px; }
        .btn-remove-company:hover { background: #fef2f2; border-color: #f87171; }

        .livestock-add-options { display: flex; flex-direction: column; gap: 8px; padding: 12px 18px; background: rgba(99, 102, 241, 0.04); border-radius: 12px; border: 1px solid rgba(99, 102, 241, 0.08); margin-top: 5px; }
        .options-title { font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .options-checks { display: flex; gap: 20px; flex-wrap: wrap; }
        .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.88rem; font-weight: 600; color: var(--text-main); transition: all 0.2s; }
        .checkbox-label:hover { color: #6366f1; }
        .checkbox-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: #6366f1; cursor: pointer; }
        .example-tag { font-size: 0.72rem; color: var(--text-muted); font-weight: 400; font-style: italic; }
        :global(.dark) .livestock-add-options { background: rgba(99, 102, 241, 0.08); border-color: rgba(255, 255, 255, 0.05); }

        .btn-remove-item { background: transparent; color: #94a3b8; border: none; padding: 10px; cursor: pointer; transition: all 0.2s ease; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-left: 5px; }
        .btn-remove-item:hover { background: #fee2e2; color: #ef4444; transform: scale(1.08); }

        .pro-final-save-bar { margin-top: 40px; position: sticky; bottom: 30px; z-index: 10; }

        .animals-toolbar { margin-bottom: 24px; }
        .livestock-cascade { margin-bottom: 28px; display: flex; flex-direction: column; gap: 20px; }
        .livestock-type-tabs { display: flex; flex-wrap: wrap; gap: 10px; }
        .livestock-type-tab { padding: 10px 22px; border-radius: 999px; border: 1.5px solid var(--border); background: var(--bg-card, #fff); color: var(--text-main); font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.2s ease; }
        .livestock-type-tab:hover { border-color: #6366f1; color: #4f46e5; }
        .livestock-type-tab.active { color: #fff; border-color: transparent; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12); }
        .livestock-type-tab-geel.active { background: #ea580c; }
        .livestock-type-tab-lo.active { background: #16a34a; }
        .livestock-type-tab-ari.active { background: #818cf8; }
        .cascade-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; }
        .cascade-field { display: flex; flex-direction: column; gap: 8px; min-width: min(100%, 280px); flex: 1; }
        .cascade-field label { font-size: 0.78rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.6px; }
        .cascade-select { height: 48px; background: var(--bg-card, #fff); border: 1.5px solid var(--border); border-radius: 12px; padding: 0 14px; font-size: 0.92rem; font-weight: 600; color: var(--text-main); outline: none; cursor: pointer; transition: all 0.2s ease; }
        .cascade-select:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12); }
        .entry-mode-picker { padding: 24px; background: var(--bg-card, #fff); border: 1.5px solid var(--border); border-radius: 16px; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04); }
        .entry-mode-title { margin: 0 0 16px; font-size: 0.95rem; font-weight: 600; color: var(--text-main); }
        .entry-mode-title strong { color: #1e3a8a; }
        .entry-mode-actions { display: flex; flex-wrap: wrap; gap: 12px; }
        .entry-mode-btn { min-width: 180px; padding: 12px 20px !important; font-size: 0.88rem !important; border-radius: 10px !important; }
        .cascade-detail-panel { padding: 20px; background: var(--bg-card, #fff); border: 1.5px solid var(--border); border-radius: 16px; }
        .cascade-detail-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .cascade-detail-head-inline { margin-bottom: 8px; padding: 0 4px; }
        .cascade-breadcrumb { display: block; font-size: 0.95rem; font-weight: 800; color: #1e3a8a; margin-bottom: 6px; }
        .btn-link-back { background: transparent; border: none; color: #6366f1; font-size: 0.82rem; font-weight: 700; cursor: pointer; padding: 4px 0; }
        .btn-link-back:hover { color: #4f46e5; text-decoration: underline; }
        .animals-toolbar-group {
          display: inline-flex;
          align-items: center;
          gap: 18px;
          padding: 10px 14px 10px 16px;
          background: var(--bg-card, #fff);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        .toolbar-divider { width: 1px; height: 28px; background: var(--border); flex-shrink: 0; margin: 0 4px; }
        .season-text { font-size: 0.875rem; font-weight: 600; color: var(--text-muted); white-space: nowrap; line-height: 1.2; }
        .upload-input-hidden { display: none; }
        .upload-btn { padding: 8px 16px !important; font-size: 0.82rem !important; font-weight: 700 !important; border-radius: 8px !important; white-space: nowrap; flex-shrink: 0; }
        .upload-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .seasonal-node { position: relative; }
        .seasonal-inputs-row { display: flex; flex-direction: column; gap: 10px; }
        .seasonal-wrap { flex-wrap: wrap; gap: 4px; }
        .seasonal-wrap.is-active-season { border-color: #6366f1 !important; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15); }
        .season-tag { font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; min-width: 52px; }
        .btn-remove-item-inline { margin-top: 8px; background: transparent; border: none; color: #94a3b8; font-size: 0.72rem; cursor: pointer; padding: 4px 0; }
        .btn-remove-item-inline:hover { color: #ef4444; }

        /* Dark Theme Styling overrides for stunning premium finish */
        :global(.dark) .admin-pro-nav { background: rgba(11, 15, 25, 0.85) !important; backdrop-filter: blur(16px); border-bottom-color: rgba(255, 255, 255, 0.08) !important; }
        :global(.dark) .admin-logo-group h1 { color: #f8fafc !important; }
        :global(.dark) .logo-sub { color: #94a3b8 !important; }
        :global(.dark) .pro-cat-editor-card { background: rgba(15, 23, 42, 0.65) !important; backdrop-filter: blur(12px); border-color: rgba(255, 255, 255, 0.08) !important; box-shadow: 0 20px 40px -20px rgba(0,0,0,0.5) !important; }
        :global(.dark) .pro-cat-header { border-bottom-color: rgba(255, 255, 255, 0.08) !important; }
        :global(.dark) .pro-cat-header h3 { color: #a5b4fc !important; }
        :global(.dark) .admin-group-block { background: rgba(15, 23, 42, 0.35) !important; border-color: rgba(255, 255, 255, 0.08) !important; }
        :global(.dark) .admin-group-title { color: #818cf8 !important; border-bottom-color: rgba(255, 255, 255, 0.08) !important; }
        :global(.dark) .pro-input-wrap { background: rgba(11, 15, 25, 0.45) !important; border-color: rgba(255, 255, 255, 0.08) !important; }
        :global(.dark) .pro-input-wrap:focus-within { border-color: #6366f1 !important; background: rgba(11, 15, 25, 0.7) !important; box-shadow: 0 0 15px rgba(99, 102, 241, 0.25) !important; }
        :global(.dark) .pro-add-new-box-container { border-top-color: rgba(255, 255, 255, 0.08) !important; }
        :global(.dark) .pro-add-new-box input { background: rgba(11, 15, 25, 0.45) !important; border-color: rgba(255, 255, 255, 0.08) !important; color: #fff !important; }
        :global(.dark) .pro-add-new-box input:focus { border-color: #6366f1 !important; background: rgba(11, 15, 25, 0.7) !important; }
        
        :global(.dark) .pro-sidebar-card { background: rgba(15, 23, 42, 0.65) !important; backdrop-filter: blur(12px); border-color: rgba(255, 255, 255, 0.08) !important; box-shadow: 0 20px 40px -20px rgba(0,0,0,0.5) !important; }
        :global(.dark) .pro-side-header { border-bottom-color: rgba(255, 255, 255, 0.08) !important; }
        :global(.dark) .pro-profile-box { background: rgba(11, 15, 25, 0.45) !important; border-color: rgba(255, 255, 255, 0.08) !important; }
        :global(.dark) .pro-log-item { border-bottom-color: rgba(255, 255, 255, 0.08) !important; }
        :global(.dark) .pro-log-meta strong { color: #818cf8 !important; }
        :global(.dark) .pro-audit-actions { border-top-color: rgba(255, 255, 255, 0.08) !important; }
        :global(.dark) .btn-audit-more { background: rgba(99, 102, 241, 0.12) !important; color: #a5b4fc !important; border-color: rgba(99, 102, 241, 0.25) !important; }
        :global(.dark) .btn-audit-less { border-color: rgba(255, 255, 255, 0.08) !important; color: #94a3b8 !important; }
        :global(.dark) .changes-indicator { background: rgba(245, 158, 11, 0.1) !important; color: #fbbf24; border-color: rgba(245, 158, 11, 0.2) !important; }
        :global(.dark) .animals-toolbar-group { background: rgba(15, 23, 42, 0.65) !important; border-color: rgba(255, 255, 255, 0.08) !important; }
        :global(.dark) .livestock-cascade .cascade-select,
        :global(.dark) .entry-mode-picker,
        :global(.dark) .cascade-detail-panel { background: rgba(15, 23, 42, 0.65) !important; border-color: rgba(255, 255, 255, 0.08) !important; }
        :global(.dark) .livestock-type-tab { background: rgba(15, 23, 42, 0.65) !important; border-color: rgba(255, 255, 255, 0.08) !important; color: #e2e8f0 !important; }
        :global(.dark) .cascade-breadcrumb { color: #a5b4fc !important; }
        :global(.dark) .season-text { color: #94a3b8 !important; }
        :global(.dark) .btn-secondary { background: rgba(255,255,255,0.03) !important; color: #e2e8f0 !important; border-color: rgba(255,255,255,0.08) !important; }
        :global(.dark) .btn-secondary:hover { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.15) !important; }

        @media (max-width: 1024px) {
          .admin-pro-grid {
            grid-template-columns: 1fr;
            gap: 30px;
            padding: 0 20px;
            margin: 20px auto;
          }
          .admin-nav-container {
            padding: 0 20px;
          }
          .pro-header-group h1 {
            font-size: 1.8rem;
          }
          .pro-cat-editor-card {
            padding: 20px;
          }
          .pro-inputs-layout {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .pro-add-new-box-container {
            margin-top: 25px;
            padding-top: 20px;
          }
          .pro-add-new-box {
            flex-direction: column;
            gap: 10px;
          }
          .btn-add-item {
            width: 100%;
            height: 52px;
          }
        }

        @media (max-width: 640px) {
          .admin-logo-group h1 {
            font-size: 0.95rem;
          }
          .admin-nav-container {
            flex-direction: column;
            gap: 12px;
            padding: 10px 20px;
          }
          .admin-pro-nav {
            height: auto;
            padding: 10px 0;
          }
          .nav-actions {
            width: 100%;
            justify-content: space-between;
          }
          .theme-toggle-wrap {
            width: 130px;
          }
          .pro-avatar-side {
            width: 36px;
            height: 36px;
            font-size: 1rem;
          }
          .pro-profile-box {
            padding: 12px;
          }
          .pro-final-save-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            margin-top: 0;
            padding: 15px 20px;
            background: var(--bg-card);
            border-top: 1.5px solid var(--border);
            box-shadow: 0 -4px 15px rgba(0,0,0,0.05);
            z-index: 100;
          }
          .admin-pro-wrapper {
            padding-bottom: 90px;
          }
          .btn-primary {
            padding: 15px !important;
            font-size: 0.95rem !important;
          }
        }
      `}</style>

    </div>
  );
}
