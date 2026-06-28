"use client";
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from 'next-themes';
import { LivestockReportModal } from '@/components/LivestockReportModal';
import { UtilityReportModal } from '@/components/UtilityReportModal';
import { WaterBillCalculator } from '@/components/WaterBillCalculator';
import { ElectricityBillCalculator } from '@/components/ElectricityBillCalculator';
import { VisitorGuideModal } from '@/components/VisitorGuideModal';
import { ElectricityCompanyLogo } from '@/components/ElectricityCompanyLogo';
import { buildUtilityCompanyViews, getElectricityCompanyDisplayName, getElectricityCompanyLogo, getUtilityCompanyLogo, getWaterCompanyDisplayName, getWaterCompanyLogo, getWaterLogoVariant, getUtilityUnit, isUtilityCategory, type UtilityCompanyView } from '@/lib/utility-rates';

type AnimalGroupKey = 'geel' | 'lo' | 'ari';

const ANIMAL_GROUP_CONFIG: Record<AnimalGroupKey, {
    slug: AnimalGroupKey;
    emoji: string;
    subtitle: string;
    accent: string;
    accentSoft: string;
}> = {
    geel: {
        slug: 'geel',
        emoji: '🐫',
        subtitle: 'Geela & noocyadiisa',
        accent: '#ea580c',
        accentSoft: 'rgba(234, 88, 12, 0.12)',
    },
    lo: {
        slug: 'lo',
        emoji: '🐄',
        subtitle: "Lo'da & noocyadeeda",
        accent: '#16a34a',
        accentSoft: 'rgba(22, 163, 74, 0.12)',
    },
    ari: {
        slug: 'ari',
        emoji: '🐑',
        subtitle: 'Ariga & noocyadiisa',
        accent: '#818cf8',
        accentSoft: 'rgba(129, 140, 248, 0.12)',
    },
};

function resolveAnimalGroupKey(type: string): AnimalGroupKey {
    const lower = type.toLowerCase();
    if (lower.includes('geel')) return 'geel';
    if (lower.includes('lo')) return 'lo';
    return 'ari';
}

function getAnimalDetailPageTitle(animalType: string): string {
    const lower = animalType.toLowerCase();
    if (lower.includes('geel')) return 'Sicirka rasmiga ah ee Geela';
    if (lower.includes('lo')) return "Sicirka rasmiga ah ee Lo'da";
    return 'Sicirka rasmiga ah ee Ariga';
}

function getMarketInsightTitle(animalType: string | null, category: string | null): string {
    if (category === 'animals' && animalType) {
        const lower = animalType.toLowerCase();
        if (lower.includes('geel')) return 'Heerka is badalka suuq Geela';
        if (lower.includes('lo')) return "Heerka is badalka suuq Lo'da";
        if (lower.includes('ari')) return "Heerka is badalka suuq Ari'a";
    }
    if (category === 'animals') return 'Heerka is badalka suuq xoolaha';
    return 'Heerka is badalka suuq xoolaha';
}

export default function Dashboard() {
    const [activeCategory, setActiveCategory] = useState<string | null>("animals");
    const [selectedSubItem, setSelectedSubItem] = useState<string | null>(null);
    const [selectedAnimalType, setSelectedAnimalType] = useState<string | null>(null);
    const [selectedAnimalSubType, setSelectedAnimalSubType] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [marketPrices, setMarketPrices] = useState<any>({});
    const [previousPrices, setPreviousPrices] = useState<any>({});
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [mounted, setMounted] = useState(false);
    const [referenceTime, setReferenceTime] = useState(() => Date.now());
    const [categories, setCategories] = useState<any[]>([
        { id: "animals", name: "Sicirka xoolaha", icon: "🐄", items: [], description: "" },
        { id: "water", name: "Sicirka Biyaha", icon: "💧", items: [], description: "" },
        { id: "electricity", name: "Sicirka Korontada", icon: "⚡", items: [], description: "" },
    ]);
    const isInitialLoad = useRef(true);
    const [logsData, setLogsData] = useState<any[]>([]);
    const [timeframe, setTimeframe] = useState("1m");
    const [itemCatalog, setItemCatalog] = useState<Record<string, any>>({});
    const [reportOpen, setReportOpen] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);
    const { resolvedTheme } = useTheme();
    const isDark = mounted && resolvedTheme === 'dark';

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/prices', { cache: 'no-store' });
                if (!response.ok) {
                    console.error('Fetch Error: /api/prices returned', response.status);
                    return;
                }
                const data = await response.json();
                if (!Array.isArray(data)) {
                    console.error('Fetch Error: /api/prices expected array', data);
                    return;
                }

                setCategories(prev => prev.map(cat => {
                    if (cat.id === 'animals') {
                        const animalCats = (data || []).filter((d: any) => ['geel', 'lo', 'ari'].includes(d.slug));
                        const animalsCat = (data || []).find((d: any) => d.slug === 'animals');
                        return {
                            ...cat,
                            items: animalCats.length > 0
                                ? ['Geel', "Lo'", "Ari'"]
                                : ((animalsCat?.items || []).map((i: any) => i.name))
                        };
                    }
                    const dbCat = data.find((d: any) => d.slug === cat.id);
                    return {
                        ...cat,
                        name: dbCat ? dbCat.name : cat.name,
                        description: dbCat ? dbCat.description : cat.description,
                        items: dbCat ? (dbCat.items || []).map((i: any) => i.name) : cat.items,
                    };
                }));

                const pricesObj: any = {};
                const catalogObj: Record<string, any> = {};
                const historyMap: Record<string, any> = {};

                (data || []).forEach((cat: any) => {
                    (cat.items || []).forEach((item: any) => {
                        const key = `${cat.slug}_${item.name}`;
                        pricesObj[key] = item.currentPrice;
                        catalogObj[key] = { ...item, categorySlug: cat.slug, categoryName: cat.name };
                        if (item.prices) {
                            item.prices.forEach((record: any) => {
                                const t = record.timestamp;
                                if (!historyMap[t]) historyMap[t] = { timestamp: t, prices: {} };
                                historyMap[t].prices[`${cat.slug}_${item.name}`] = record.price;
                            });
                        }
                    });
                });

                const utilityMap: Record<string, UtilityCompanyView[]> = {};
                (data || []).forEach((cat: any) => {
                    if (isUtilityCategory(cat.slug)) {
                        utilityMap[cat.slug] = buildUtilityCompanyViews(cat.items || [], cat.slug, pricesObj);
                    }
                });

                setCategories((prev) =>
                    prev.map((cat) => {
                        if (cat.id === 'animals') {
                            return { ...cat, name: 'Sicirka xoolaha' };
                        }
                        if (isUtilityCategory(cat.id)) {
                            const companies = utilityMap[cat.id] || [];
                            const dbCat = data.find((d: any) => d.slug === cat.id);
                            return {
                                ...cat,
                                name: cat.id === 'electricity' ? 'Sicirka Korontada' : cat.id === 'water' ? 'Sicirka Biyaha' : (dbCat?.name ?? cat.name),
                                description: cat.id === 'electricity' || cat.id === 'water' ? '' : (dbCat?.description ?? cat.description),
                                items: companies.map((c) => c.name),
                            };
                        }
                        const dbCat = data.find((d: any) => d.slug === cat.id);
                        return {
                            ...cat,
                            name: dbCat ? dbCat.name : cat.name,
                            description: dbCat ? dbCat.description : cat.description,
                            items: dbCat ? (dbCat.items || []).map((i: any) => i.name) : cat.items,
                        };
                    })
                );

                let sortedHistory = Object.values(historyMap).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                if (sortedHistory.length === 1) {
                    const first = sortedHistory[0];
                    const prevTime = new Date(new Date(first.timestamp).getTime() - 1000 * 60 * 60).toISOString();
                    sortedHistory = [{ timestamp: prevTime, prices: { ...first.prices } }, first];
                } else if (sortedHistory.length === 0) {
                    const now = new Date().toISOString();
                    const hourAgo = new Date(new Date().getTime() - 1000 * 60 * 60).toISOString();
                    sortedHistory = [{ timestamp: hourAgo, prices: { ...pricesObj } }, { timestamp: now, prices: { ...pricesObj } }];
                }

                let latestPrices: any = {};
                sortedHistory.forEach((h: any) => {
                    latestPrices = { ...latestPrices, ...h.prices };
                    h.prices = { ...latestPrices };
                });

                const allItemKeys = new Set<string>();
                data.forEach((cat: any) => cat.items.forEach((item: any) => allItemKeys.add(`${cat.slug}_${item.name}`)));
                allItemKeys.forEach(key => {
                    let firstPrice: number | null = null;
                    for (let i = 0; i < sortedHistory.length; i++) {
                        if (sortedHistory[i].prices[key] !== undefined) {
                            firstPrice = sortedHistory[i].prices[key];
                            break;
                        }
                    }
                    if (firstPrice === null && pricesObj[key] !== undefined) firstPrice = pricesObj[key];
                    if (firstPrice !== null) {
                        for (let i = 0; i < sortedHistory.length; i++) {
                            if (sortedHistory[i].prices[key] === undefined) sortedHistory[i].prices[key] = firstPrice;
                            else break;
                        }
                    }
                });

                setMarketPrices((prev: any) => {
                    setPreviousPrices(prev);
                    return pricesObj;
                });
                setItemCatalog(catalogObj);
                setHistoryData(sortedHistory);

                const logData = data.flatMap((c: any) => (c.items || []).flatMap((i: any) => (i.prices || []).map((h: any) => ({
                    item: i.name,
                    price: h.price,
                    time: h.timestamp,
                    category: c.slug
                }))));
                logData.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());
                setLogsData(logData);
                setReferenceTime(Date.now());
                isInitialLoad.current = false;
            } catch (err) {
                console.error("Fetch Error:", err);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const getChartData = () => {
        if (!activeCategory || !selectedCategoryData) return [];
        
        const now = new Date();
        let filterDate = new Date();
        if (timeframe === "1w") filterDate.setDate(now.getDate() - 7);
        else if (timeframe === "1m") filterDate.setMonth(now.getMonth() - 1);
        else if (timeframe === "1y") filterDate.setFullYear(now.getFullYear() - 1);
        else filterDate = new Date(0); // Show all for '1d' or default

        let filtered = historyData.filter(h => new Date(h.timestamp) >= filterDate);
        if (filtered.length < 2 && historyData.length >= 2) {
            filtered = historyData.slice(-10); // Fallback to show last 10 points if filter is too strict
        }

        let currentSlug = (activeCategory === 'animals' && selectedAnimalType)
            ? (selectedAnimalType.toLowerCase().includes('geel') ? 'geel' : selectedAnimalType.toLowerCase().includes('lo') ? 'lo' : 'ari')
            : activeCategory;

        let currentItems = (activeCategory === 'animals' && selectedAnimalType)
            ? Object.keys(marketPrices).filter(k => k.startsWith(`${currentSlug}_`)).map(k => k.replace(`${currentSlug}_`, ''))
            : (selectedCategoryData?.items || []);
            
        // Fallback for when the database uses 'animals' instead of sub-slugs
        if (activeCategory === 'animals' && currentItems.length === 0) {
            currentSlug = 'animals';
            currentItems = Object.keys(marketPrices).filter(k => k.startsWith(`${currentSlug}_`)).map(k => k.replace(`${currentSlug}_`, ''));
            
            // If still empty, just use the selected category items
            if (currentItems.length === 0) {
                currentItems = selectedCategoryData?.items || [];
            }
        }

        return filtered.map((h, i) => {
            const dateObj = h.timestamp ? new Date(h.timestamp) : new Date();
            const dataPoint: any = {
                timestamp: dateObj.getTime(),
                date: dateObj.toLocaleDateString('so-SO', { day: 'numeric', month: 'short' }),
                time: dateObj.toLocaleTimeString('so-SO', { hour: '2-digit', minute: '2-digit' }),
                fullDate: dateObj.toLocaleDateString('so-SO', { day: 'numeric', month: 'long', year: 'numeric' }),
            };
            currentItems.forEach((item: string) => {
                const key = `${currentSlug}_${item}`;
                const currentPrice = parseFloat(h.prices[key]) || parseFloat(marketPrices[key]) || 0;
                const prevPrice = i > 0 ? (parseFloat(filtered[i - 1].prices[key]) || parseFloat(marketPrices[key]) || 0) : currentPrice;
                const changeVal = i > 0 ? (currentPrice - prevPrice) : 0;
                dataPoint[item] = currentPrice;
                dataPoint[`${item}_change`] = changeVal.toFixed(2);
                dataPoint[`${item}_isUp`] = changeVal > 0;
                dataPoint[`${item}_isDown`] = changeVal < 0;
            });
            return dataPoint;
        });
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (!mounted) return null;
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="chart-tooltip">
                    <p className="chart-tooltip-date">{data.fullDate} at {data.time}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {payload.map((entry: any, index: number) => {
                            const item = entry.dataKey;
                            const isUp = data[`${item}_isUp`];
                            const isDown = data[`${item}_isDown`];
                            const change = data[`${item}_change`];
                            return (
                                <div key={index} className="chart-tooltip-row" style={{ borderBottom: index < payload.length - 1 ? undefined : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: entry.color, boxShadow: `0 0 10px ${entry.color}80` }}></div>
                                        <span className="chart-tooltip-label">{item.replace(' (Lab)', '').replace(' (Dheddig)', '')}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span className="chart-tooltip-value">${Number(entry.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        <span className="chart-tooltip-change" style={{ background: isUp ? 'rgba(16, 185, 129, 0.15)' : isDown ? 'rgba(239, 68, 68, 0.15)' : undefined, color: isUp ? '#10b981' : isDown ? '#ef4444' : undefined }}>
                                            {isUp ? `↑ +$${change}` : isDown ? `↓ -$${Math.abs(change)}` : '='}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            );
        }
        return null;
    };

    if (!mounted) { return null; }

    const selectedCategoryData = categories.find(c => c.id === activeCategory);
    const isAnimalDetailView = activeCategory === 'animals' && !!selectedAnimalType;
    const pageTitle = isAnimalDetailView && selectedAnimalType
        ? getAnimalDetailPageTitle(selectedAnimalType)
        : activeCategory === 'electricity'
            ? 'Sicirka rasmiga ah ee korontada muqdisho'
            : activeCategory === 'water'
                ? 'Sicirka rasmiga ah ee Biyaha muqdisho'
            : activeCategory === 'animals'
                ? 'Sicirka rasmiga ah ee xoolaha'
                : selectedCategoryData?.name;
    const pageDescription = isAnimalDetailView || activeCategory === 'electricity' || activeCategory === 'water' ? '' : selectedCategoryData?.description;
    const hasGroupedAnimalData = Object.keys(marketPrices).some((k) => /^(geel|lo|ari)_/.test(k));
    const activeAnimalSlug = selectedAnimalType
        ? (selectedAnimalType.toLowerCase().includes('geel') ? 'geel' : selectedAnimalType.toLowerCase().includes('lo') ? 'lo' : 'ari')
        : null;
    const reportAccent = activeAnimalSlug ? ANIMAL_GROUP_CONFIG[activeAnimalSlug as AnimalGroupKey].accent : '#ea580c';
    const birimoReportItem = activeAnimalSlug && selectedAnimalSubType
        ? itemCatalog[`${activeAnimalSlug}_${selectedAnimalSubType} (Birimo)`]
        : null;
    const suguntoReportItem = activeAnimalSlug && selectedAnimalSubType
        ? itemCatalog[`${activeAnimalSlug}_${selectedAnimalSubType} (Sugunto)`]
        : null;
    const showGroupedAnimalReports = activeCategory === 'animals' && hasGroupedAnimalData && !!selectedAnimalSubType && !!selectedSubItem;
    const isUtilityView = activeCategory === 'water' || activeCategory === 'electricity';
    const showUtilityReports = isUtilityView && !!selectedSubItem;
    const showLegacyChart = !isUtilityView && (activeCategory !== 'animals' || !hasGroupedAnimalData) && !!selectedSubItem;
    const utilityAccent = activeCategory === 'water' ? '#0ea5e9' : activeCategory === 'electricity' ? '#eab308' : '#64748b';
    const activeUtilityCompanies = isUtilityView && activeCategory
        ? buildUtilityCompanyViews(
            Object.values(itemCatalog).filter((i: any) => i.categorySlug === activeCategory),
            activeCategory,
            marketPrices
        )
        : [];
    const selectedUtilityCompany = showUtilityReports && selectedSubItem
        ? activeUtilityCompanies.find((c) => c.name === selectedSubItem) ?? null
        : null;
    const selectedUtilityLogo = selectedUtilityCompany
        ? getUtilityCompanyLogo(selectedUtilityCompany.name, selectedUtilityCompany.isElectricity)
        : null;
    const getUtilityTrend = (slug: string, company: UtilityCompanyView) => {
        const latest = company.years[0];
        if (!latest) return { label: 'STABLE', color: '#64748b' };
        const priceKey = `${slug}_${latest.itemName}`;
        const current = parseFloat(marketPrices[priceKey]);
        const previous = parseFloat(previousPrices[priceKey]);
        if (!previous || isNaN(current) || isNaN(previous) || previous === 0) return { label: 'STABLE', color: '#64748b' };
        const diffNum = ((current - previous) / previous * 100);
        const diff = diffNum.toFixed(1);
        if (current > previous) return { label: `↑ +${diff}%`, color: '#ef4444' };
        if (current < previous) return { label: `↓ ${diffNum.toFixed(1).replace("-", "")}%`, color: '#10b981' };
        return { label: 'STABLE', color: '#64748b' };
    };
    const getTrend = (catId: string, item: string) => {
        const current = parseFloat(marketPrices[`${catId}_${item}`]);
        const previous = parseFloat(previousPrices[`${catId}_${item}`]);
        if (!previous || isNaN(current) || isNaN(previous) || previous === 0) return { label: 'STABLE', color: '#64748b' };
        const diffNum = ((current - previous) / previous * 100);
        const diff = diffNum.toFixed(1);
        if (current > previous) return { label: `↑ +${diff}%`, color: '#ef4444' };
        if (current < previous) return { label: `↓ ${diffNum.toFixed(1).replace("-", "")}%`, color: '#10b981' };
        return { label: 'STABLE', color: '#64748b' };
    };

    // Dynamic Market Insights per active category
    const categoryLogs = logsData.filter(l => activeCategory === 'animals' ? ['geel', 'lo', 'ari', 'animals'].includes(l.category) : l.category === activeCategory);
    const last7Days = new Date(referenceTime - 7 * 24 * 60 * 60 * 1000);
    const recentCatUpdates = categoryLogs.filter(l => new Date(l.time) >= last7Days).length;
    const marketVolumeKey = recentCatUpdates > 15 ? 'high' : recentCatUpdates > 4 ? 'moderate' : 'low';
    const marketVolumeLabels: Record<'high' | 'moderate' | 'low', string> = {
        high: 'Sare',
        moderate: 'Dhexdhexaad',
        low: 'Hoose',
    };
    const currentMarketVolume = marketVolumeLabels[marketVolumeKey];

    return (
        <div className="dashboard-layout animate-pro">
            <aside className="sidebar animate-pro-slide">
                <div className="sidebar-top">
                    <div className="sidebar-logo">
                        <div className="logo-image-wrap">
                            <Image src="/images/logo.png" alt="Market Index Logo" width={40} height={40} priority={true} />
                        </div>
                        <div className="logo-text">
                            <h2>Muqdisho</h2>
                            <p>Market Prices</p>
                        </div>
                    </div>
                    <nav className="side-nav">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                className={`side-link ${activeCategory === cat.id ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveCategory(cat.id);
                                    setSelectedAnimalType(null);
                                    setSelectedAnimalSubType(null);
                                    setSearchQuery("");
                                    setReportOpen(false);
                                    if (isUtilityCategory(cat.id)) {
                                        setSelectedSubItem(null);
                                    } else if (cat.items && cat.items.length > 0) {
                                        setSelectedSubItem(cat.items[0]);
                                    } else {
                                        setSelectedSubItem(null);
                                    }
                                }}
                            >
                                {cat.icon} {cat.name}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="sidebar-footer">
                    <ThemeToggle />
                </div>
            </aside>

            <main className="main-content">
                <div className="top-bar">
                    <div className="breadcrumb">Muqdisho Market Prices Dashboard</div>
                    <button
                        type="button"
                        className="visitor-guide-btn"
                        onClick={() => setGuideOpen(true)}
                        aria-label="Fur hagaha booqdayaasha"
                    >
                        <span className="visitor-guide-btn-icon" aria-hidden="true">📘</span>
                        Hagaha &amp; Tilmaamaha
                    </button>
                    <div className="search-wrap">
                        <span className="search-icon">🔍</span>
                        <input 
                            type="text" 
                            placeholder="Raadi..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="search-clear-btn" title="Nadiifi">✕</button>
                        )}
                    </div>
                </div>

                <div className="dash-layout-inner">
                    <div className="main-area">
                        <div className="content-header">
                            <h1 className="page-main-title">{pageTitle}</h1>
                            {pageDescription ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                                    <p className="dash-desc">
                                        {pageDescription}
                                    </p>
                                </div>
                            ) : null}
                        </div>

                        <div className={`price-cards-grid animate-pro-scale${isUtilityView ? ' utility-cards-grid' : ''}`}>
                            {(() => {
                                if (activeCategory === 'animals') {
                                    if (!hasGroupedAnimalData) {
                                        const filteredItems = (selectedCategoryData?.items || []).filter((item: string) =>
                                            item.toLowerCase().includes(searchQuery.toLowerCase())
                                        );
                                        if (filteredItems.length === 0) {
                                            return <div className="state-box" style={{ gridColumn: '1/-1', width: '100%' }}>Natiijooyin ma jiraan sheyga &ldquo;{searchQuery}&rdquo;</div>;
                                        }
                                        return filteredItems.map((item: string, idx: number) => {
                                            const trend = getTrend('animals', item);
                                            const isSelected = selectedSubItem === item;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`pro-card${isSelected ? ' is-selected' : ''}`}
                                                    onClick={() => setSelectedSubItem(item)}
                                                >
                                                    <div className="pro-card-top">
                                                        <span className="cat-type">{item}</span>
                                                        <span className="stat-pill" style={{ color: trend.color }}>{trend.label}</span>
                                                    </div>
                                                    <div className="price-display">
                                                        <span className="curr">$</span>
                                                        <span className="amt">{marketPrices[`animals_${item}`] !== undefined ? Number(marketPrices[`animals_${item}`]).toLocaleString('en-US', { minimumFractionDigits: 2 }) : "0.00"}</span>
                                                        <span className="unit"> / unit</span>
                                                    </div>
                                                    <div className="card-foot-line card-foot-muted"></div>
                                                </div>
                                            );
                                        });
                                    }
                                    if (!selectedAnimalType) {
                                        const filteredItems = (selectedCategoryData?.items || []).filter((item: string) =>
                                            item.toLowerCase().includes(searchQuery.toLowerCase())
                                        );
                                        if (filteredItems.length === 0) {
                                            return <div className="state-box" style={{ gridColumn: '1/-1', width: '100%' }}>Natiijooyin ma jiraan sheyga &ldquo;{searchQuery}&rdquo;</div>;
                                        }
                                        return filteredItems.map((item: string, idx: number) => {
                                            const baseMatch = item.match(/(.+) \((.+)\)/);
                                            const label = baseMatch ? baseMatch[0] : item;
                                            const groupKey = resolveAnimalGroupKey(item);
                                            const config = ANIMAL_GROUP_CONFIG[groupKey];
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`pro-card group-card group-card-${groupKey}`}
                                                    style={{
                                                        ['--group-accent' as string]: config.accent,
                                                        ['--group-accent-soft' as string]: config.accentSoft,
                                                    }}
                                                    onClick={() => {
                                                        setSelectedAnimalType(baseMatch ? baseMatch[1] : item);
                                                        setSelectedAnimalSubType(null);
                                                        setSelectedSubItem(null);
                                                        setSearchQuery("");
                                                    }}
                                                >
                                                    <div className="group-card-stripe" />
                                                    <div className="group-card-body">
                                                        <div className="group-card-row">
                                                            <div className="animal-emoji-badge" aria-hidden="true">{config.emoji}</div>
                                                            <div className="group-card-info">
                                                                <h3 className="group-card-label">{label}</h3>
                                                                <p className="group-card-sub">{config.subtitle}</p>
                                                            </div>
                                                        </div>
                                                        <div className="group-card-footer">
                                                            <span className="group-card-cta">Guji</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    } else {
                                        const subCatSlug = selectedAnimalType.toLowerCase().includes('geel') ? 'geel' : selectedAnimalType.toLowerCase().includes('lo') ? 'lo' : 'ari';
                                        const allItemsForCat = Object.keys(marketPrices).filter(key => key.startsWith(`${subCatSlug}_`));
                                        const subTypes = Array.from(new Set(allItemsForCat.map(key => {
                                            const fullName = key.replace(`${subCatSlug}_`, '');
                                            const match = fullName.match(/(.+) \((.+)\)/);
                                            return (match ? match[1] : fullName).trim();
                                        }))).filter(type => !['Geelka', "Lo'da", 'Ariga', 'Orgi', "Ri'", 'Weyl', 'Geel', "Lo'", 'Ari', "Ari'", 'Camel', 'Cattle', 'Goat/Sheep', 'Goat', 'Sheep'].includes(type as string));

                                        const sortPriority: Record<string, number> = {
                                            'Hasha': 1, 'Ratiga': 2, 'qalin': 3, 'qaalin': 4,
                                            'Dibiga': 1, 'Sac': 2, "Lo'da": 3, 'Weyl': 4, 'Weysha': 5,
                                            'Orgi': 1, "Ri'": 2, 'Waxar': 3, 'Ariga': 4
                                        };
                                        subTypes.sort((a, b) => (sortPriority[a] || 99) - (sortPriority[b] || 99));

                                        const groupConfig = ANIMAL_GROUP_CONFIG[subCatSlug as AnimalGroupKey];

                                        if (!selectedAnimalSubType) {
                                            const filteredSubTypes = subTypes.filter((subType: string) =>
                                                subType.toLowerCase().includes(searchQuery.toLowerCase())
                                            );
                                            return (
                                                <>
                                                    <div
                                                        className="animal-nav-row"
                                                        style={{
                                                            ['--group-accent' as string]: groupConfig.accent,
                                                        }}
                                                    >
                                                        <button onClick={() => { setSelectedAnimalType(null); setSearchQuery(""); setSelectedSubItem(null); }} className="group-back-btn">
                                                            ← Back
                                                        </button>
                                                    </div>
                                                    {filteredSubTypes.length === 0 ? (
                                                        <div className="state-box" style={{ gridColumn: '1/-1', width: '100%' }}>Natiijooyin ma jiraan sheyga &ldquo;{searchQuery}&rdquo;</div>
                                                    ) : (
                                                        filteredSubTypes.map((subType: string, idx: number) => {
                                                            const displayName = subType.replace(' (Lab)', '').replace(' (Dheddig)', '');
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className="breed-card"
                                                                    style={{
                                                                        ['--breed-accent' as string]: groupConfig.accent,
                                                                        ['--breed-accent-soft' as string]: groupConfig.accentSoft,
                                                                    }}
                                                                    onClick={() => {
                                                                        setSelectedAnimalSubType(subType);
                                                                        setSelectedSubItem(null);
                                                                        setSearchQuery("");
                                                                    }}
                                                                >
                                                                    <span className="breed-card-label">{displayName}</span>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </>
                                            );
                                        } else {
                                            const birimoKey = `${subCatSlug}_${selectedAnimalSubType} (Birimo)`;
                                            const suguntoKey = `${subCatSlug}_${selectedAnimalSubType} (Sugunto)`;
                                            const birimoPrice = marketPrices[birimoKey];
                                            const suguntoPrice = marketPrices[suguntoKey];
                                            return (
                                                <>
                                                    <div
                                                        className="animal-nav-row"
                                                        style={{
                                                            ['--group-accent' as string]: groupConfig.accent,
                                                        }}
                                                    >
                                                        <button onClick={() => { setSelectedAnimalSubType(null); setSearchQuery(""); setSelectedSubItem(null); setReportOpen(false); }} className="group-back-btn">
                                                            ← Back
                                                        </button>
                                                        <p className="animal-group-heading">Sicirka {selectedAnimalSubType?.replace(' (Lab)', '').replace(' (Dheddig)', '').toLowerCase()}</p>
                                                    </div>
                                                    {[
                                                        { label: 'Birimo', key: birimoKey, price: birimoPrice },
                                                        { label: 'Sugunto', key: suguntoKey, price: suguntoPrice }
                                                    ].map((opt, idx) => {
                                                        const trend = getTrend(subCatSlug, `${selectedAnimalSubType} (${opt.label})`);
                                                        const isSelected = selectedSubItem === `${selectedAnimalSubType} (${opt.label})`;
                                                        const displayPrice = opt.price !== undefined && !isNaN(Number(opt.price)) ? Number(opt.price) : 0;
                                                        
                                                        return (
                                                            <div 
                                                                key={idx} 
                                                                className={`pro-card animal-detail-card${isSelected ? ` active-pro-card ${opt.label === 'Birimo' ? 'is-selected-birimo' : 'is-selected-sugunto'}` : ''}`}
                                                                style={{ 
                                                                    ['--group-accent' as string]: groupConfig.accent,
                                                                    borderLeft: `6px solid ${groupConfig.accent}`,
                                                                    position: 'relative',
                                                                    overflow: 'hidden'
                                                                }}
                                                                onClick={() => setSelectedSubItem(`${selectedAnimalSubType} (${opt.label})`)}
                                                            >
                                                                <div className="card-glare"></div>
                                                                <div className="pro-card-top">
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        <div className="pulse-dot" style={{ background: groupConfig.accent }}></div>
                                                                        <span className="cat-type" style={{ fontSize: '1rem', fontWeight: '900', color: groupConfig.accent }}>{opt.label.toUpperCase()}</span>
                                                                    </div>
                                                                    <span className="stat-pill" style={{ color: trend.color, background: `${trend.color}15`, fontWeight: '800', fontSize: '0.7rem' }}>{trend.label}</span>
                                                                </div>
                                                                <div className="price-display-large">
                                                                    <div className="price-main">
                                                                        <span className="curr" style={{ color: groupConfig.accent, opacity: 0.6 }}>$</span>
                                                                        <span className="amt" style={{ fontSize: '3.8rem' }}>{displayPrice.toLocaleString()}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '5px' }}>
                                                                        <span className="unit-tag" style={{ color: groupConfig.accent, opacity: 0.8 }}>QIIMAHA {opt.label.toUpperCase()}</span>
                                                                        <span className="text-muted-sm">LAST UPDATED: JUST NOW</span>
                                                                    </div>
                                                                </div>
                                                                <div className="card-foot-line" style={{ background: isSelected ? groupConfig.accent : '#e2e8f0', height: '4px' }}></div>
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            );
                                        }
                                    }
                                } else if (isUtilityView) {
                                    const unit = getUtilityUnit(activeCategory!);
                                    const filteredCompanies = activeUtilityCompanies.filter((company) =>
                                        company.name.toLowerCase().includes(searchQuery.toLowerCase())
                                    );
                                    if (filteredCompanies.length === 0) {
                                        return <div className="state-box" style={{ gridColumn: '1/-1', width: '100%' }}>Shirkad lama helin &ldquo;{searchQuery}&rdquo;</div>;
                                    }
                                    return filteredCompanies.map((company, idx) => {
                                        const trend = getUtilityTrend(activeCategory!, company);
                                        const isSelected = selectedSubItem === company.name;
                                        const latestYear = company.years[0];
                                        const isWater = activeCategory === 'water';
                                        const companyLogo = company.isElectricity
                                            ? getElectricityCompanyLogo(company.name)
                                            : isWater
                                                ? getWaterCompanyLogo(company.name)
                                                : null;
                                        return (
                                            <div
                                                key={idx}
                                                className={`pro-card utility-card${company.isElectricity ? ' electricity-card' : ''}${isWater ? ' water-card' : ''}${isSelected ? ' is-selected' : ''}`}
                                                onClick={() => {
                                                    setSelectedSubItem(company.name);
                                                    setReportOpen(false);
                                                }}
                                            >
                                                {company.isElectricity && latestYear ? (
                                                    <>
                                                        <div className="electricity-card-head">
                                                            {companyLogo ? (
                                                                <ElectricityCompanyLogo
                                                                    src={companyLogo}
                                                                    alt={getElectricityCompanyDisplayName(company.name)}
                                                                />
                                                            ) : (
                                                                <span className="electricity-fallback-name">{getElectricityCompanyDisplayName(company.name)}</span>
                                                            )}
                                                            <ElectricityBillCalculator
                                                                companyName={getElectricityCompanyDisplayName(company.name)}
                                                                rates={latestYear.rates}
                                                            />
                                                        </div>
                                                        <ul className="electricity-rates-list">
                                                            {latestYear.rates.map((rate) => (
                                                                <li key={rate.rateId} className={`electricity-rate-row rate-${rate.rateId}`}>
                                                                    <span className="electricity-rate-dot" aria-hidden="true" />
                                                                    <span className="electricity-rate-label">{rate.label}</span>
                                                                    <span className="electricity-rate-price">
                                                                        <strong>${rate.price.toFixed(2)}</strong>
                                                                        <small>per kWh</small>
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </>
                                                ) : isWater ? (
                                                    <>
                                                        <div className="water-card-head">
                                                            <div className="water-brand-block">
                                                                {companyLogo ? (
                                                                    <div className={`utility-logo-frame variant-${getWaterLogoVariant()} theme-water`}>
                                                                        <Image
                                                                            src={companyLogo}
                                                                            alt={getWaterCompanyDisplayName(company.name)}
                                                                            width={44}
                                                                            height={44}
                                                                            quality={95}
                                                                            className="utility-logo-img"
                                                                        />
                                                                    </div>
                                                                ) : null}
                                                                <span className="water-company-title">
                                                                    {getWaterCompanyDisplayName(company.name)}
                                                                </span>
                                                            </div>
                                                            <WaterBillCalculator
                                                                companyName={getWaterCompanyDisplayName(company.name)}
                                                                pricePerM3={company.latestPrice}
                                                            />
                                                        </div>
                                                        <div className="water-rate-panel">
                                                            <div className="water-rate-row">
                                                                <span className="water-rate-dot" aria-hidden="true" />
                                                                <span className="water-rate-label">Qiimaha biyaha</span>
                                                                <span className="water-rate-price">
                                                                    <strong>{company.latestPrice > 0 ? `$${company.latestPrice.toFixed(2)}` : '—'}</strong>
                                                                    <small>per m³</small>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="pro-card-top">
                                                            <span className="cat-type">{company.name}</span>
                                                            <span className="stat-pill" style={{ color: trend.color }}>{trend.label}</span>
                                                        </div>
                                                        <div className="price-display">
                                                            <span className="curr">$</span>
                                                            <span className="amt">{company.latestPrice > 0 ? company.latestPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "—"}</span>
                                                            <span className="unit"> / {unit}</span>
                                                        </div>
                                                        <div className="utility-card-meta">
                                                            {company.latestYear ? `Sanadka ${company.latestYear}` : 'Sanad lama diiwaangelin'}
                                                        </div>
                                                    </>
                                                )}
                                                <div className="card-foot-line card-foot-muted"></div>
                                            </div>
                                        );
                                    });
                                } else {
                                    const filteredItems = (selectedCategoryData?.items || []).filter((item: string) =>
                                        item.toLowerCase().includes(searchQuery.toLowerCase())
                                    );
                                    if (filteredItems.length === 0) {
                                        return <div className="state-box" style={{ gridColumn: '1/-1', width: '100%' }}>Natiijooyin ma jiraan sheyga &ldquo;{searchQuery}&rdquo;</div>;
                                    }
                                    return filteredItems.map((item: string, idx: number) => {
                                        const trend = getTrend(activeCategory!, item);
                                        const isSelected = selectedSubItem === item;
                                        return (
                                            <div
                                                key={idx}
                                                className={`pro-card${isSelected ? ' is-selected' : ''}`}
                                                onClick={() => setSelectedSubItem(item)}
                                            >
                                                <div className="pro-card-top">
                                                    <span className="cat-type">{item}</span>
                                                    <span className="stat-pill" style={{ color: trend.color }}>{trend.label}</span>
                                                </div>
                                                <div className="price-display">
                                                    <span className="curr">$</span>
                                                    <span className="amt">{marketPrices[`${activeCategory}_${item}`] !== undefined ? Number(marketPrices[`${activeCategory}_${item}`]).toLocaleString('en-US', { minimumFractionDigits: 2 }) : "0.00"}</span>
                                                    <span className="unit"> / unit</span>
                                                </div>
                                                <div className="card-foot-line card-foot-muted"></div>
                                            </div>
                                        );
                                    });
                                }
                            })()}
                        </div>

                        {showUtilityReports && (
                            <div className="chart-container-pro report-section" style={{ marginTop: '40px' }}>
                                <div className="chart-header">
                                    <div className="chart-info report-info-with-logo">
                                        {selectedUtilityLogo && selectedUtilityCompany && (
                                            selectedUtilityCompany.isElectricity ? (
                                                <ElectricityCompanyLogo
                                                    src={selectedUtilityLogo}
                                                    alt={selectedSubItem || ''}
                                                    className="report-bar-logo"
                                                />
                                            ) : (
                                            <div className={`utility-logo-frame variant-${getWaterLogoVariant()} theme-water report-bar-logo`}>
                                                <Image
                                                    src={selectedUtilityLogo}
                                                    alt={selectedSubItem || ''}
                                                    width={44}
                                                    height={44}
                                                    quality={95}
                                                    className="utility-logo-img"
                                                />
                                            </div>
                                            )
                                        )}
                                        <div>
                                            <h3>Warbixin / Reports</h3>
                                            <p className="dash-desc chart-subtitle">
                                                Daabac qiimaha sanadlaha ah ee {selectedSubItem}.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="ui-btn report-trigger-btn"
                                        style={{ borderColor: utilityAccent, color: utilityAccent, background: `${utilityAccent}12` }}
                                        onClick={() => setReportOpen(true)}
                                    >
                                        📄 Reports
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Livestock: Reports (replaces chart + 1w/1m/1y) */}
                        {showGroupedAnimalReports && (
                            <div className="chart-container-pro report-section" style={{ marginTop: '40px' }}>
                                <div className="chart-header">
                                    <div className="chart-info">
                                        <h3>Warbixin / Reports</h3>
                                        <p className="dash-desc chart-subtitle">
                                            Dooro xilliga aad rabto inaad daabacdo qiimaha {selectedSubItem?.includes('Birimo') ? 'Birimo' : 'Sugunto'}.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="ui-btn report-trigger-btn"
                                        style={{ borderColor: reportAccent, color: reportAccent, background: `${reportAccent}12` }}
                                        onClick={() => setReportOpen(true)}
                                    >
                                        📄 Reports
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Water / Electricity / legacy animals: price chart */}
                        {showLegacyChart && (
                            <div className="chart-container-pro" style={{ marginTop: '40px' }}>
                                <div className="chart-header">
                                    <div className="chart-info">
                                        <h3>{selectedSubItem ? `${selectedSubItem.replace(' (Lab)', '').replace(' (Dheddig)', '')} - ${selectedAnimalType || selectedCategoryData?.name}` : (selectedAnimalType || selectedCategoryData?.name)}</h3>
                                        <p className="dash-desc chart-subtitle">Isbedelka qiimaha rasmiga ah ee mudooyinkii u dambeeyay.</p>
                                    </div>
                                    <div className="chart-tabs">
                                        {['1w', '1m', '1y'].map(t => <button key={t} className={`ui-btn ${timeframe === t ? "active" : ""}`} onClick={() => setTimeframe(t)}>{t}</button>)}
                                    </div>
                                </div>
                                <div style={{ width: '100%', height: 350, minHeight: 350, marginTop: '20px', position: 'relative' }}>
                                    {mounted && (() => {
                                        try {
                                            const data = getChartData();
                                            if (!selectedSubItem) return (
                                                <div className="chart-empty-state">
                                                    <span style={{ fontSize: '3rem', marginBottom: '10px' }}>📊</span>
                                                    <p>Fadlan dooro shey si aad u aragto isbedelka qiimaha</p>
                                                </div>
                                            );
                                            
                                            if (!data || data.length === 0) return (
                                                <div className="chart-empty-state">
                                                    <span style={{ fontSize: '3rem', marginBottom: '10px' }}>🔍</span>
                                                    <p>Wax xog ah lagama hayo qiimahan xiligan...</p>
                                                </div>
                                            );
                                            
                                            const isBirimo = selectedSubItem.includes('Birimo');
                                            const isSugunto = selectedSubItem.includes('Sugunto');
                                            const strokeColor = isBirimo ? '#4f46e5' : isSugunto ? '#059669' : '#38bdf8';
                                            const fillColorId = isBirimo ? 'colorBirimo' : isSugunto ? 'colorSugunto' : 'colorDefault';

                                            const prices = data.map(d => Number(d[selectedSubItem]) || 0).filter(p => p > 0);
                                            const dataMin = prices.length > 0 ? Math.min(...prices) : 0;
                                            const dataMax = prices.length > 0 ? Math.max(...prices) : 0;
                                            
                                            const domainMin = dataMin === dataMax ? Math.max(0, dataMin - 10) : Math.max(0, dataMin - (dataMax - dataMin) * 0.2);
                                            const domainMax = dataMin === dataMax ? dataMax + 10 : dataMax + (dataMax - dataMin) * 0.2;

                                            return (
                                                <div style={{ width: '100%', height: '320px' }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                                            <defs>
                                                                <linearGradient id="colorBirimo" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                                                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                                                </linearGradient>
                                                                <linearGradient id="colorSugunto" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#059669" stopOpacity={0.8}/>
                                                                    <stop offset="95%" stopColor="#059669" stopOpacity={0.1}/>
                                                                </linearGradient>
                                                                <linearGradient id="colorDefault" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                                                                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.1}/>
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(15, 23, 42, 0.05)'} />
                                                            <XAxis 
                                                                dataKey="timestamp" 
                                                                type="number"
                                                                domain={['dataMin', 'dataMax']}
                                                                axisLine={false} 
                                                                tickLine={false} 
                                                                fontSize={11} 
                                                                stroke={isDark ? '#cbd5e1' : '#64748b'} 
                                                                tick={{ fill: isDark ? '#e2e8f0' : '#64748b' }}
                                                                dy={15} 
                                                                minTickGap={30} 
                                                                tickFormatter={(val) => {
                                                                    const d = new Date(val);
                                                                    return (timeframe === '1w' || timeframe === '1m' || timeframe === '1y') 
                                                                        ? d.toLocaleDateString('so-SO', { day: 'numeric', month: 'short' })
                                                                        : d.toLocaleTimeString('so-SO', { hour: '2-digit', minute: '2-digit' });
                                                                }}
                                                            />
                                                            <YAxis 
                                                                axisLine={false} 
                                                                tickLine={false} 
                                                                fontSize={11} 
                                                                stroke={isDark ? '#cbd5e1' : '#64748b'} 
                                                                tick={{ fill: isDark ? '#e2e8f0' : '#64748b' }}
                                                                domain={[domainMin, domainMax]} 
                                                                tickFormatter={v => `$${Math.round(v)}`} 
                                                                dx={-5} 
                                                            />
                                                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(15, 23, 42, 0.1)', strokeWidth: 2 }} />
                                                            <Area 
                                                                type="monotone" 
                                                                dataKey={selectedSubItem} 
                                                                stroke={strokeColor} 
                                                                strokeWidth={3} 
                                                                fill={`url(#${fillColorId})`} 
                                                                activeDot={{ r: 6, strokeWidth: 2, fill: isDark ? '#1e293b' : '#fff', stroke: strokeColor }} 
                                                                isAnimationActive={true}
                                                                animationDuration={1000}
                                                            />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            );
                                        } catch (err) {
                                            console.error("Chart Error:", err);
                                            return <div className="state-box err">Cilad ayaa dhacday, chart-ka ma furmin.</div>;
                                        }
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="right-col">
                        <div className="news-card">
                            {(() => {
                                const currentId = activeCategory?.toLowerCase();
                                let newsImg = "/images/market-news.jpg";
                                if (currentId?.includes("water")) newsImg = "https://images.unsplash.com/photo-1568487007364-175e0d26233b?q=80&w=1471&auto=format&fit=crop";
                                else if (currentId?.includes("electricity")) newsImg = "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=1470&auto=format&fit=crop";
                                return (
                                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                        <Image src={newsImg} alt="Market News" fill sizes="(max-width: 1024px) 100vw, 320px" priority={true} style={{ objectFit: 'cover' }} />
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="pro-sidebar-card stats-card">
                            <div className="pro-side-header">{getMarketInsightTitle(selectedAnimalType, activeCategory)}</div>
                            <div className="mini-stats">
                                <div className="m-stat-item"><span>Is badalka hadda</span><span className="m-stat-val" style={{ color: marketVolumeKey === 'high' ? '#10b981' : '#64748b' }}>{currentMarketVolume}</span></div>
                            </div>
                        </div>
                    </div>
                </div>


            </main>

            <style jsx>{`
                @keyframes animateProFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes animateProSlide { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes animateProScale { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
                .animate-pro { animation: animateProFadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
                .animate-pro-slide { animation: animateProSlide 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
                .animate-pro-scale { animation: animateProScale 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
                .group-card { display: flex !important; flex-direction: row !important; min-height: 0; padding: 0 !important; border: 1px solid rgba(15, 23, 42, 0.08) !important; border-radius: 16px !important; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.04) !important; overflow: hidden; position: relative; background: #fff !important; }
                .group-card::before { display: none !important; }
                .group-card:hover { transform: translateY(-4px); border-color: rgba(15, 23, 42, 0.12) !important; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08), 0 20px 40px rgba(15, 23, 42, 0.08) !important; }
                .group-card-stripe { width: 4px; flex-shrink: 0; background: var(--group-accent); border-radius: 16px 0 0 16px; }
                .group-card-body { flex: 1; display: flex; flex-direction: column; padding: 20px 20px 18px; min-width: 0; }
                .group-card-row { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
                .animal-emoji-badge { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; background: var(--group-accent-soft); font-size: 1.65rem; line-height: 1; flex-shrink: 0; transition: transform 0.2s ease; }
                .group-card:hover .animal-emoji-badge { transform: scale(1.06); }
                .group-card-info { min-width: 0; }
                .group-card-label { margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; letter-spacing: 0.03em; text-transform: uppercase; line-height: 1.2; }
                .group-card-sub { margin: 3px 0 0; font-size: 0.78rem; font-weight: 500; color: #64748b; line-height: 1.3; }
                .group-card-footer { display: flex; justify-content: center; margin-top: auto; }
                .group-card-cta { display: inline-flex; align-items: center; justify-content: center; min-width: 120px; padding: 10px 28px; border-radius: 999px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em; color: var(--group-accent); background: var(--group-accent-soft); border: 1.5px solid transparent; transition: all 0.22s ease; pointer-events: none; user-select: none; }
                .group-card:hover .group-card-cta { color: #fff; background: var(--group-accent); box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15); }
                .breed-card {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  text-align: center;
                  padding: 28px 18px;
                  min-height: 96px;
                  background: #fff;
                  border: 1px solid rgba(15, 23, 42, 0.06);
                  border-radius: 18px;
                  cursor: pointer;
                  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
                  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
                  position: relative;
                  overflow: hidden;
                }
                .breed-card::before {
                  content: '';
                  position: absolute;
                  inset: 0;
                  background: linear-gradient(180deg, var(--breed-accent-soft) 0%, transparent 55%);
                  opacity: 0.55;
                  pointer-events: none;
                }
                .breed-card::after {
                  content: '';
                  position: absolute;
                  bottom: 0;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 36px;
                  height: 3px;
                  border-radius: 99px;
                  background: var(--breed-accent);
                  opacity: 0.45;
                  transition: width 0.25s ease, opacity 0.25s ease;
                }
                .breed-card:hover {
                  transform: translateY(-5px);
                  border-color: color-mix(in srgb, var(--breed-accent) 40%, white);
                  background: color-mix(in srgb, var(--breed-accent) 14%, white);
                  box-shadow: 0 6px 20px color-mix(in srgb, var(--breed-accent) 14%, transparent);
                }
                .breed-card:hover::before {
                  opacity: 0;
                }
                .breed-card:hover::after {
                  opacity: 0;
                }
                .breed-card:hover .breed-card-label {
                  color: var(--breed-accent);
                }
                .breed-card-label {
                  position: relative;
                  z-index: 1;
                  font-size: 1.05rem;
                  font-weight: 800;
                  color: #1e293b;
                  letter-spacing: 0.03em;
                  text-transform: uppercase;
                  line-height: 1.25;
                }
                :global(html.dark) .breed-card {
                  background: #111827 !important;
                  border-color: rgba(148, 163, 184, 0.14) !important;
                  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25) !important;
                }
                :global(html.dark) .breed-card:hover {
                  border-color: color-mix(in srgb, var(--breed-accent) 50%, #111827) !important;
                  background: color-mix(in srgb, var(--breed-accent) 18%, #111827) !important;
                  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25) !important;
                }
                :global(html.dark) .breed-card:hover .breed-card-label { color: var(--breed-accent) !important; }
                :global(html.dark) .breed-card-label { color: #f8fafc !important; }
                :global(html.dark) .group-card { background: #0f172a !important; border-color: rgba(148, 163, 184, 0.12) !important; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 8px 24px rgba(0, 0, 0, 0.15) !important; }
                :global(html.dark) .group-card:hover { border-color: rgba(148, 163, 184, 0.2) !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), 0 20px 40px rgba(0, 0, 0, 0.2) !important; }
                :global(html.dark) .group-card-label { color: #f8fafc; }
                :global(html.dark) .group-card-sub { color: #94a3b8; }
                .dashboard-layout { display: flex; height: 100vh; overflow: hidden; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); font-family: 'Inter', sans-serif; }
                .pro-loader-screen { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 24px; color: #475569; font-weight: 700; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); }
                .loader-orb { width: 56px; height: 56px; border-radius: 50%; border: 4px solid #e2e8f0; border-top-color: #3b82f6; animation: spin 1s linear infinite; box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); }
                .sidebar { width: 280px; background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); color: #fff; padding: 20px 24px 32px; display: flex; flex-direction: column; justify-content: space-between; border-right: 1px solid rgba(255,255,255,0.05); box-shadow: 4px 0 24px rgba(0,0,0,0.05); z-index: 10; }
                .sidebar-logo { display: flex; align-items: center; gap: 16px; margin-bottom: 36px; }
                .logo-image-wrap :global(img) { border-radius: 8px; background: #fff; padding: 2px; object-fit: contain; }
                .logo-text h2 { font-size: 1.25rem; font-weight: 900; margin: 0; color: #fff; letter-spacing: -0.5px; }
                .logo-text p { font-size: 0.75rem; color: #94a3b8; margin: 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
                .side-nav { display: flex; flex-direction: column; gap: 12px; }
                .side-link { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-radius: 14px; border: 1px solid transparent; background: transparent; color: #94a3b8; font-weight: 700; cursor: pointer; transition: all 0.3s ease; width: 100%; text-align: left; font-size: 0.95rem; }
                .side-link:hover { background: rgba(255,255,255,0.05); color: #fff; transform: translateX(5px); }
                .side-link.active { background: linear-gradient(90deg, rgba(56,189,248,0.1) 0%, rgba(56,189,248,0) 100%); color: #38bdf8; border-left: 4px solid #38bdf8; border-radius: 0 14px 14px 0; }
                .main-content { flex: 1; padding: 12px 40px 40px; overflow-y: auto; box-sizing: border-box; min-height: 0; scroll-behavior: smooth; }
                .top-bar { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid rgba(15, 23, 42, 0.05); }
                .visitor-guide-btn {
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 8px 16px; border-radius: 999px;
                    border: 1.5px solid rgba(14, 165, 233, 0.35);
                    background: linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);
                    color: #0369a1; font-size: 0.78rem; font-weight: 800;
                    letter-spacing: 0.02em; cursor: pointer; flex-shrink: 0;
                    transition: all 0.2s ease; font-family: inherit;
                    box-shadow: 0 2px 10px rgba(14, 165, 233, 0.12);
                }
                .visitor-guide-btn:hover {
                    border-color: #0ea5e9; background: #e0f2fe;
                    transform: translateY(-1px);
                }
                .visitor-guide-btn-icon { font-size: 1rem; line-height: 1; }
                .search-wrap { margin-left: auto; }
                .search-wrap { position: relative; display: flex; align-items: center; background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 12px; padding: 6px 14px; width: 280px; transition: all 0.3s ease; }
                .search-wrap:focus-within { border-color: #38bdf8; background: #fff; box-shadow: 0 4px 12px rgba(56, 189, 248, 0.15); }
                .search-icon { font-size: 0.95rem; color: #64748b; margin-right: 8px; user-select: none; }
                .search-input { border: none; background: transparent; outline: none; width: 100%; font-size: 0.88rem; font-weight: 700; color: #0f172a; }
                .search-input::placeholder { color: #94a3b8; font-weight: 600; }
                .search-clear-btn { border: none; background: transparent; color: #94a3b8; cursor: pointer; font-size: 0.8rem; padding: 0 4px; transition: color 0.2s; font-weight: 700; }
                .search-clear-btn:hover { color: #ef4444; }
                :global(html.dark) .search-wrap { background: rgba(15, 23, 42, 0.6); border-color: rgba(148, 163, 184, 0.15); }
                :global(html.dark) .search-wrap:focus-within { border-color: #38bdf8; background: #0f172a; }
                :global(html.dark) .search-input { color: #f8fafc; }
                .breadcrumb { font-weight: 800; color: #64748b; font-size: 0.9rem; letter-spacing: 1px; text-transform: uppercase; display: flex; align-items: center; gap: 10px; }
                .breadcrumb::before { content: ''; display: block; width: 8px; height: 8px; background: #38bdf8; border-radius: 50%; box-shadow: 0 0 10px rgba(56,189,248,0.5); }
                .dash-layout-inner { display: grid; grid-template-columns: 1fr 320px; gap: 32px; }
                .content-header { margin-bottom: 6px; }
                .content-header h1,
                .page-main-title { font-size: clamp(1.2rem, 2.6vw, 1.55rem); font-weight: 600; margin: 0 0 8px; color: #1e293b; letter-spacing: -0.02em; line-height: 1.4; }
                .live-badge-mini { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: 30px; font-size: 0.65rem; font-weight: 900; letter-spacing: 1.5px; border: 1px solid rgba(239, 68, 68, 0.2); }
                .live-badge-mini::before { content: ''; display: block; width: 6px; height: 6px; background: #ef4444; border-radius: 50%; animation: pulse 2s infinite; }
                .price-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; margin-top: 20px; }
                .utility-cards-grid { grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: 16px; }
                .pro-card.utility-card { overflow: visible; }
                .pro-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); border-radius: 24px; padding: 30px; border: 1px solid rgba(255,255,255,0.8); cursor: pointer; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.05); overflow: hidden; }
                .pro-card::before { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); transform: skewX(-20deg); transition: 0.5s; }
                .pro-card:hover::before { left: 150%; }
                .pro-card:hover { transform: translateY(-8px) scale(1.02); border-color: rgba(56,189,248,0.5); box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.12); background: #fff; }
                .pro-card.animal-detail-card:hover { border-color: color-mix(in srgb, var(--group-accent, #ea580c) 40%, white) !important; background: color-mix(in srgb, var(--group-accent, #ea580c) 14%, white) !important; box-shadow: 0 6px 20px color-mix(in srgb, var(--group-accent, #ea580c) 14%, transparent) !important; }
                .pro-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
                                                .cat-type { font-size: clamp(1rem, 2.5vw, 1.2rem); font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 1.5px; }
                .stat-pill { font-size: 0.7rem; font-weight: 900; padding: 6px 12px; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px; }
                .price-display { display: flex; align-items: baseline; gap: 6px; }
                .curr { font-size: clamp(1rem, 3vw, 1.4rem); font-weight: 800; color: #94a3b8; }
                .amt { font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 900; color: #0f172a; letter-spacing: -1.5px; }
                .unit { font-size: clamp(0.75rem, 2vw, 0.85rem); color: #94a3b8; font-weight: 700; }
                .card-foot-line { position: absolute; bottom: 0; left: 0; width: 100%; height: 4px; opacity: 0.8; }
                .right-col { display: flex; flex-direction: column; gap: 35px; }
                .news-card { background: #000; border-radius: 28px; overflow: hidden; height: 220px; position: relative; box-shadow: 0 15px 35px -10px rgba(0,0,0,0.2); }
                .news-card :global(img) { object-fit: cover; opacity: 0.85; transition: transform 0.5s ease; }
                .news-card:hover :global(img) { transform: scale(1.05); }
                .news-card::after { content: ''; position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%); pointer-events: none; }
                .pro-sidebar-card { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); border-radius: 28px; padding: 30px; border: 1px solid rgba(255,255,255,0.9); box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.05); }
                .pro-side-header { font-size: 0.75rem; font-weight: 900; color: #64748b; letter-spacing: 2px; margin-bottom: 25px; display: flex; align-items: center; gap: 10px; }
                .pro-side-header::after { content: ''; flex: 1; height: 1px; background: rgba(15, 23, 42, 0.1); }
                .mini-stats { display: flex; flex-direction: column; gap: 20px; }
                .m-stat-item { display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; border-bottom: 1px dashed rgba(15, 23, 42, 0.1); font-size: 0.9rem; font-weight: 700; color: #64748b; }
                .m-stat-item:last-child { border-bottom: none; padding-bottom: 0; }
                .m-stat-val { font-weight: 900; font-size: 1.1rem; padding: 4px 12px; border-radius: 8px; background: rgba(15, 23, 42, 0.03); }
                .chart-container-pro { background: #fff; border-radius: 32px; padding: 40px; border: 1px solid rgba(255,255,255,0.9); margin-top: 40px; box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.05); position: relative; overflow: hidden; }
                .chart-container-pro::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc); }
                .report-trigger-btn { font-weight: 800 !important; padding: 10px 22px !important; border-radius: 999px !important; border: 1.5px solid !important; cursor: pointer; transition: all 0.2s ease; }
                .report-trigger-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(15, 23, 42, 0.1); }
                .utility-card-meta { margin-top: 10px; font-size: 0.78rem; font-weight: 700; color: #64748b; letter-spacing: 0.04em; }
                .pro-card.electricity-card {
                    padding: 14px 16px 12px; border-radius: 16px;
                    border: 1px solid rgba(234, 179, 8, 0.18);
                    background: linear-gradient(180deg, #ffffff 0%, #fffef9 100%);
                    box-shadow: 0 4px 16px -6px rgba(15, 23, 42, 0.08);
                }
                .pro-card.electricity-card:hover {
                    transform: translateY(-3px) scale(1);
                    border-color: rgba(234, 179, 8, 0.35) !important;
                    box-shadow: 0 10px 24px -8px rgba(234, 179, 8, 0.2);
                    background: #fff;
                }
                .pro-card.electricity-card.is-selected {
                    border-color: #eab308 !important;
                    background: #fffef5 !important;
                    box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.15), 0 8px 20px -6px rgba(234, 179, 8, 0.18);
                }
                .pro-card.electricity-card.is-selected:hover {
                    border-color: #eab308 !important;
                    background: #fffef5 !important;
                    box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.2), 0 10px 24px -6px rgba(234, 179, 8, 0.22);
                }
                .pro-card.electricity-card.is-selected .utility-logo-frame.theme-electricity {
                    background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%);
                    border-color: rgba(234, 179, 8, 0.28);
                    box-shadow: 0 4px 12px rgba(234, 179, 8, 0.16);
                }
                .pro-card.electricity-card.is-selected .utility-logo-img {
                    filter: none;
                    opacity: 1;
                }
                .electricity-card-head {
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 8px; margin-bottom: 10px; min-height: 52px;
                }
                .utility-logo-frame {
                    display: inline-flex; align-items: center; justify-content: center;
                    flex-shrink: 0; line-height: 0;
                }
                .utility-logo-frame.variant-round {
                    width: 44px; height: 44px; padding: 2px; border-radius: 50%;
                    background: linear-gradient(145deg, #ffffff 0%, #f0f9ff 100%);
                    border: 1.5px solid rgba(14, 165, 233, 0.22);
                    box-shadow: 0 3px 10px rgba(14, 165, 233, 0.14);
                }
                .utility-logo-frame.variant-round .utility-logo-img {
                    width: 100% !important; height: 100% !important; max-width: none !important;
                    border-radius: 50%; object-fit: cover;
                }
                .utility-logo-frame.theme-water.variant-round .utility-logo-img {
                    border-radius: 0;
                    object-fit: contain;
                    object-position: center;
                }
                .utility-logo-frame.variant-wide {
                    padding: 5px 10px; border-radius: 11px;
                    background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
                    border: 1px solid rgba(15, 23, 42, 0.07);
                    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
                }
                .utility-logo-frame.variant-wide .utility-logo-img {
                    height: 30px !important; width: auto !important; max-width: 78px !important;
                    object-fit: contain; object-position: center;
                }
                .utility-logo-frame.variant-wabax {
                    padding: 3px 6px 2px; border-radius: 10px;
                    background: linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);
                    border: 1px solid rgba(14, 165, 233, 0.18);
                    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);
                }
                .utility-logo-frame.variant-wabax .utility-logo-img {
                    height: 32px !important; width: auto !important; max-width: 38px !important;
                    object-fit: contain; object-position: center bottom;
                }
                .utility-logo-frame.variant-compact .utility-logo-img {
                    height: 24px !important; width: auto !important; max-width: 96px !important;
                    object-fit: contain; object-position: left center;
                    filter: drop-shadow(0 1px 1px rgba(15, 23, 42, 0.08));
                }
                .utility-logo-frame.theme-water.variant-wide {
                    background: linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);
                    border-color: rgba(14, 165, 233, 0.18);
                    box-shadow: 0 3px 10px rgba(14, 165, 233, 0.1);
                }
                .utility-logo-frame.theme-electricity.variant-wide {
                    background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%);
                    border-color: rgba(234, 179, 8, 0.22);
                    box-shadow: 0 3px 10px rgba(234, 179, 8, 0.12);
                }
                .utility-logo-img { display: block; }
                .electricity-fallback-name {
                    font-size: 0.72rem; font-weight: 800; color: #0f172a;
                    text-transform: uppercase; letter-spacing: 0.06em;
                }
                .electricity-status-pill {
                    font-size: 0.58rem; font-weight: 800; letter-spacing: 0.08em;
                    text-transform: uppercase; color: #64748b; flex-shrink: 0;
                }
                .electricity-rates-list {
                    list-style: none; margin: 0; padding: 0;
                    display: flex; flex-direction: column; gap: 5px;
                }
                .electricity-rate-row {
                    display: grid;
                    grid-template-columns: 7px 1fr auto;
                    align-items: center; gap: 8px;
                    padding: 7px 9px; border-radius: 10px;
                    background: rgba(248, 250, 252, 0.95);
                    border: 1px solid rgba(15, 23, 42, 0.05);
                }
                .electricity-rate-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
                .rate-home .electricity-rate-dot { background: #f59e0b; }
                .rate-multi .electricity-rate-dot { background: #3b82f6; }
                .rate-single .electricity-rate-dot { background: #10b981; }
                .electricity-rate-label {
                    font-size: 0.68rem; font-weight: 700; color: #334155;
                    line-height: 1.3; white-space: pre-wrap; min-width: 0;
                }
                .electricity-rate-price {
                    display: flex; flex-direction: column; align-items: flex-end;
                    gap: 0; flex-shrink: 0; line-height: 1.15;
                }
                .electricity-rate-price strong {
                    font-size: 0.82rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;
                }
                .electricity-rate-price small {
                    font-size: 0.58rem; font-weight: 600; color: #94a3b8;
                }
                .pro-card.electricity-card .card-foot-line { display: none; }
                .pro-card.electricity-card::before { display: none; }
                .pro-card.water-card {
                    padding: 14px 16px 12px; border-radius: 16px;
                    border: 1px solid rgba(14, 165, 233, 0.2);
                    background: linear-gradient(180deg, #ffffff 0%, #f8fcff 100%);
                    box-shadow: 0 4px 16px -6px rgba(14, 165, 233, 0.12);
                }
                .pro-card.water-card:hover {
                    transform: translateY(-3px) scale(1);
                    border-color: rgba(14, 165, 233, 0.4) !important;
                    box-shadow: 0 10px 24px -8px rgba(14, 165, 233, 0.22);
                    background: #fff;
                }
                .pro-card.water-card.is-selected {
                    border-color: #0ea5e9 !important;
                    background: #f0f9ff !important;
                    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15), 0 8px 20px -6px rgba(14, 165, 233, 0.18);
                }
                .pro-card.water-card .card-foot-line { display: none; }
                .pro-card.water-card::before { display: none; }
                .water-card-head {
                    display: flex; align-items: flex-start; justify-content: space-between;
                    gap: 8px; margin-bottom: 10px;
                }
                .water-brand-block {
                    display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;
                }
                .water-company-title {
                    font-size: 0.62rem; font-weight: 800; color: #0f172a;
                    line-height: 1.35; letter-spacing: 0.01em;
                    flex: 1; min-width: 0;
                }
                .water-fallback-name {
                    font-size: 0.72rem; font-weight: 800; color: #0f172a;
                    text-transform: uppercase; letter-spacing: 0.06em;
                }
                .water-status-pill {
                    font-size: 0.58rem; font-weight: 800; letter-spacing: 0.08em;
                    text-transform: uppercase; color: #64748b; flex-shrink: 0;
                }
                .water-rate-panel { display: flex; flex-direction: column; gap: 5px; }
                .water-rate-row {
                    display: grid;
                    grid-template-columns: 7px 1fr auto;
                    align-items: center; gap: 8px;
                    padding: 8px 10px; border-radius: 10px;
                    background: rgba(240, 249, 255, 0.95);
                    border: 1px solid rgba(14, 165, 233, 0.1);
                }
                .water-rate-dot {
                    width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
                    background: #0ea5e9;
                }
                .water-rate-label {
                    font-size: 0.68rem; font-weight: 700; color: #334155; line-height: 1.3;
                }
                .water-rate-price {
                    display: flex; flex-direction: column; align-items: flex-end;
                    gap: 0; flex-shrink: 0; line-height: 1.15;
                }
                .water-rate-price strong {
                    font-size: 0.88rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;
                }
                .water-rate-price small {
                    font-size: 0.58rem; font-weight: 600; color: #94a3b8;
                }
                .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                .chart-info h3 { font-size: 1.4rem; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
                .chart-tabs { display: flex; background: #f8fafc; padding: 6px; border-radius: 12px; border: 1px solid #e2e8f0; }
                .ui-btn { border: none; border-radius: 10px; font-weight: 800; transition: all 0.2s ease; cursor: pointer; }
                .chart-tabs button { padding: 8px 20px; background: transparent; font-size: 0.8rem; color: #64748b; }
                .chart-tabs button:hover { color: #0f172a; }
                .chart-tabs button.active { background: #fff; color: #0f172a; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
                .animal-nav-row { grid-column: 1 / -1; display: flex; align-items: center; gap: 14px; margin-bottom: 10px; flex-wrap: wrap; }
                .group-back-btn { display: inline-flex; align-items: center; padding: 5px 12px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.03em; border-radius: 999px; color: var(--group-accent, #ea580c); background: color-mix(in srgb, var(--group-accent, #ea580c) 14%, white); border: 1px solid color-mix(in srgb, var(--group-accent, #ea580c) 35%, white); cursor: pointer; box-shadow: 0 2px 8px color-mix(in srgb, var(--group-accent, #ea580c) 10%, transparent); transition: all 0.22s ease; }
                .group-back-btn:hover { background: color-mix(in srgb, var(--group-accent, #ea580c) 22%, white); transform: translateY(-1px); }
                .animal-group-heading { margin: 0; padding: 0; font-size: 0.95rem; font-weight: 400; color: #0f172a; line-height: 1.3; }
                .selected-group-title { font-size: 0.95rem; font-weight: 400; color: #0f172a; margin: 0; letter-spacing: -0.2px; line-height: 1.2; }
                .animal-detail-card { min-height: 200px; display: flex; flex-direction: column; justify-content: space-between; padding: 35px 30px !important; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); border: 1px solid rgba(255,255,255,0.8); border-radius: 28px; cursor: pointer; background: #fff; }
                .animal-detail-card:hover { transform: translateY(-10px) scale(1.02); border-color: color-mix(in srgb, var(--group-accent, #ea580c) 40%, white) !important; border-left-color: var(--group-accent, #ea580c) !important; background: color-mix(in srgb, var(--group-accent, #ea580c) 14%, white); box-shadow: 0 6px 20px color-mix(in srgb, var(--group-accent, #ea580c) 14%, transparent); }
                .animal-detail-card:hover .cat-type,
                .animal-detail-card:hover .curr,
                .animal-detail-card:hover .unit-tag,
                .animal-detail-card:hover .amt { color: var(--group-accent, #ea580c) !important; opacity: 1 !important; }
                .animal-detail-card:hover .pulse-dot { background: var(--group-accent, #ea580c) !important; border-color: rgba(255,255,255,0.9) !important; }
                .animal-detail-card:hover .stat-pill { background: color-mix(in srgb, var(--group-accent, #ea580c) 15%, white) !important; color: var(--group-accent, #ea580c) !important; }
                .animal-detail-card:hover .text-muted-sm { color: #64748b !important; }
                .animal-detail-card:hover .card-foot-line { background: var(--group-accent, #ea580c) !important; opacity: 0.35; }
                .animal-detail-card:hover .card-glare { opacity: 0; }
                .price-display-large { margin-top: 25px; position: relative; z-index: 2; }
                .price-main { display: flex; align-items: flex-start; gap: 6px; }
                .price-main .amt { font-size: clamp(2.5rem, 6vw, 3.8rem) !important; line-height: 1; }
                .unit-tag { display: block; margin-top: 12px; font-size: 0.75rem; font-weight: 900; color: #94a3b8; letter-spacing: 3px; }
                .pulse-dot { width: 14px; height: 14px; border-radius: 50%; animation: pulse 2s infinite; border: 3px solid rgba(255,255,255,0.9); box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .card-glare { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%); pointer-events: none; z-index: 1; border-radius: 28px; }
                .state-box { display: flex; justify-content: center; align-items: center; min-height: 140px; border-radius: 14px; font-weight: 700; background: #f8fafc; color: #64748b; border: 1px dashed #cbd5e1; }
                .state-box.err { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0,0,0,0.1); } 70% { transform: scale(1.1); box-shadow: 0 0 0 12px rgba(0,0,0,0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0,0,0,0); } }
                .active-pro-card::after { content: ''; position: absolute; inset: -2px; border-radius: 30px; background: linear-gradient(135deg, rgba(79, 70, 229, 0.5), rgba(5, 150, 105, 0.5)); z-index: -1; animation: borderGlow 3s ease infinite alternate; }
                @keyframes borderGlow { 0% { opacity: 0.5; filter: blur(4px); } 100% { opacity: 1; filter: blur(8px); } }

                .dash-desc { color: #64748b; font-size: 0.85rem; margin: 0; }
                .season-pill { background: rgba(79, 70, 229, 0.1); color: #4f46e5; padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; border: 1px solid rgba(79, 70, 229, 0.2); }
                .chart-subtitle { font-size: 0.75rem; margin-top: 4px; }
                .text-muted-sm { font-size: 0.6rem; color: #94a3b8; font-weight: 700; }
                .cat-type-lg { font-size: 1.4rem; font-weight: 900; color: #0f172a; }
                .chart-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #64748b; }
                .chart-empty-state p { font-weight: 700; color: #475569; margin: 0; }
                .pro-card.is-selected:not(.utility-card) { border-color: #0f172a !important; background: #fbfeff !important; }
                .report-info-with-logo { display: flex; align-items: center; gap: 14px; }
                .report-bar-logo { flex-shrink: 0; }
                .chart-tooltip { background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.6); padding: 20px; border-radius: 24px; box-shadow: 0 15px 35px -5px rgba(15, 23, 42, 0.1); min-width: 280px; }
                .chart-tooltip-date { margin: 0 0 12px 0; font-size: 0.75rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
                .chart-tooltip-row { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding-bottom: 12px; border-bottom: 1px dashed rgba(15, 23, 42, 0.1); }
                .chart-tooltip-label { font-weight: 900; color: #475569; font-size: 0.85rem; }
                .chart-tooltip-value { font-weight: 900; color: #0f172a; font-size: 1.1rem; letter-spacing: -0.5px; }
                .chart-tooltip-change { font-size: 0.7rem; font-weight: 900; padding: 4px 8px; border-radius: 8px; color: #64748b; background: #f8fafc; }

                :global(html.dark) .dashboard-layout { background: linear-gradient(135deg, #0b0f19 0%, #1e293b 100%); }
                :global(html.dark) .visitor-guide-btn {
                    background: rgba(14, 165, 233, 0.12);
                    border-color: rgba(56, 189, 248, 0.35);
                    color: #7dd3fc;
                }
                :global(html.dark) .breadcrumb { color: #94a3b8; }
                :global(html.dark) .top-bar { border-bottom-color: rgba(148, 163, 184, 0.15); }
                :global(html.dark) .content-header h1 { color: #f8fafc; }
                :global(html.dark) .dash-desc { color: #94a3b8; }
                :global(html.dark) .chart-empty-state { color: #94a3b8; }
                :global(html.dark) .chart-empty-state p { color: #e2e8f0; }
                :global(html.dark) .text-muted-sm { color: #94a3b8; }
                :global(html.dark) .cat-type { color: #f1f5f9 !important; }
                :global(html.dark) .cat-type-lg { color: #f8fafc !important; }
                :global(html.dark) .curr { color: #94a3b8 !important; }
                :global(html.dark) .amt { color: #f8fafc !important; }
                :global(html.dark) .unit { color: #94a3b8 !important; }
                :global(html.dark) .pro-card { background: #0f172a !important; border-color: #334155 !important; }
                :global(html.dark) .pro-card:hover { background: #1e293b !important; border-color: rgba(56, 189, 248, 0.4) !important; }
                :global(html.dark) .pro-card.is-selected:not(.utility-card) { background: #1e293b !important; border-color: #38bdf8 !important; }
                :global(html.dark) .pro-card.electricity-card { background: linear-gradient(180deg, #0f172a 0%, #111827 100%); border-color: rgba(234, 179, 8, 0.22); }
                :global(html.dark) .pro-card.electricity-card.is-selected { background: #1a1f2e !important; border-color: #eab308 !important; }
                :global(html.dark) .electricity-rate-row { background: rgba(15, 23, 42, 0.75); border-color: #334155; }
                :global(html.dark) .electricity-rate-label { color: #e2e8f0; }
                :global(html.dark) .electricity-rate-price strong { color: #f8fafc; }
                :global(html.dark) .pro-card.water-card { background: linear-gradient(180deg, #0f172a 0%, #0c1929 100%); border-color: rgba(14, 165, 233, 0.25); }
                :global(html.dark) .pro-card.water-card.is-selected { background: #0c2233 !important; border-color: #38bdf8 !important; }
                :global(html.dark) .water-rate-row { background: rgba(15, 23, 42, 0.75); border-color: #334155; }
                :global(html.dark) .water-rate-label { color: #e2e8f0; }
                :global(html.dark) .water-rate-price strong { color: #f8fafc; }
                :global(html.dark) .water-company-title { color: #f1f5f9; }
                :global(html.dark) .animal-detail-card { background: #0f172a !important; border-color: #334155 !important; }
                :global(html.dark) .animal-detail-card.is-selected-birimo { background: #1e1b4b !important; }
                :global(html.dark) .animal-detail-card.is-selected-sugunto { background: #064e3b !important; }
                :global(html.dark) .animal-group-heading { color: #f8fafc; }
                :global(html.dark) .selected-group-title { color: #f8fafc; }
                :global(html.dark) .pro-sidebar-card { background: #0f172a !important; border-color: #334155 !important; }
                :global(html.dark) .pro-side-header { color: #94a3b8; }
                :global(html.dark) .pro-side-header::after { background: rgba(148, 163, 184, 0.2); }
                :global(html.dark) .m-stat-item { color: #94a3b8; border-bottom-color: rgba(148, 163, 184, 0.15); }
                :global(html.dark) .m-stat-val { color: #f1f5f9; background: rgba(148, 163, 184, 0.1); }
                :global(html.dark) .chart-container-pro { background: #0f172a !important; border-color: #334155 !important; }
                :global(html.dark) .chart-info h3 { color: #f8fafc !important; }
                :global(html.dark) .chart-tabs { background: #1e293b; border-color: #334155; }
                :global(html.dark) .chart-tabs button { color: #94a3b8; }
                :global(html.dark) .chart-tabs button:hover { color: #f8fafc; }
                :global(html.dark) .chart-tabs button.active { background: #334155; color: #f8fafc; }
                :global(html.dark) .state-box { background: #1e293b; color: #94a3b8; border-color: #475569; }
                :global(html.dark) .chart-tooltip { background: rgba(15, 23, 42, 0.95); border-color: #334155; box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.4); }
                :global(html.dark) .chart-tooltip-date { color: #94a3b8; }
                :global(html.dark) .chart-tooltip-row { border-bottom-color: rgba(148, 163, 184, 0.2); }
                :global(html.dark) .chart-tooltip-label { color: #cbd5e1; }
                :global(html.dark) .chart-tooltip-value { color: #f8fafc; }
                :global(html.dark) .chart-tooltip-change { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }
                .card-foot-muted { background: #e2e8f0; }
                :global(html.dark) .card-foot-muted { background: #475569 !important; }

                @media (max-width: 1100px) {
                    .dashboard-layout { flex-direction: column; height: auto; min-height: 100vh; }
                    .sidebar { width: 100%; padding: 20px; gap: 16px; }
                    .sidebar-logo { margin-bottom: 18px; }
                    .main-content { padding: 10px 18px 24px; }
                    .top-bar { flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
                    .visitor-guide-btn { font-size: 0.72rem; padding: 7px 12px; order: 3; width: 100%; justify-content: center; }
                    .search-wrap { width: 100%; order: 2; margin-left: 0; }
                    .dash-layout-inner { grid-template-columns: 1fr; gap: 24px; }
                    .right-col { order: -1; }
                    .content-header h1,
                    .page-main-title { font-size: 1.2rem; }
                    .chart-container-pro { padding: 22px; border-radius: 20px; }
                }
                @media (max-width: 640px) {
                    .side-link { font-size: 0.88rem; padding: 12px 14px; }
                    .pro-card { padding: 18px; border-radius: 18px; }
                    .group-card-body { padding: 16px 14px 14px; }
                    .animal-emoji-badge { width: 42px; height: 42px; font-size: 1.45rem; border-radius: 10px; }
                    .group-card-label { font-size: 1rem; }
                    .group-card-cta { min-width: 100px; padding: 9px 22px; font-size: 0.75rem; }
                    .chart-header { flex-direction: column; align-items: flex-start; gap: 10px; }
                    .chart-tabs { width: 100%; justify-content: space-between; }
                    .chart-tabs button { padding: 8px 10px; font-size: 0.75rem; }
                    .animal-nav-row { gap: 10px; margin-bottom: 8px; }
                    .animal-detail-card { min-height: 160px; padding: 20px 18px !important; }
                    .news-card { height: 190px; border-radius: 18px; }
                }
            `}</style>

            {showGroupedAnimalReports && selectedAnimalType && selectedAnimalSubType && (
                <LivestockReportModal
                    open={reportOpen}
                    onClose={() => setReportOpen(false)}
                    animalLabel={selectedAnimalType}
                    breedLabel={selectedAnimalSubType.replace(' (Lab)', '').replace(' (Dheddig)', '')}
                    accent={reportAccent}
                    birimo={birimoReportItem}
                    sugunto={suguntoReportItem}
                    focusType={selectedSubItem?.includes('Birimo') ? 'birimo' : selectedSubItem?.includes('Sugunto') ? 'sugunto' : 'both'}
                />
            )}

            {showUtilityReports && activeCategory && (
                <UtilityReportModal
                    open={reportOpen}
                    onClose={() => setReportOpen(false)}
                    categoryLabel={selectedCategoryData?.name || ''}
                    unit={getUtilityUnit(activeCategory)}
                    accent={utilityAccent}
                    company={selectedUtilityCompany}
                />
            )}

            <VisitorGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
        </div>
    );
}
