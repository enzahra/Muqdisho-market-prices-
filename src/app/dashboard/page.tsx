"use client";
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from 'next-themes';

export default function Dashboard() {
    const [activeCategory, setActiveCategory] = useState<string | null>("animals");
    const [selectedSubItem, setSelectedSubItem] = useState<string | null>(null);
    const [selectedAnimalType, setSelectedAnimalType] = useState<string | null>(null);
    const [selectedAnimalSubType, setSelectedAnimalSubType] = useState<string | null>(null);
    const [marketPrices, setMarketPrices] = useState<any>({});
    const [previousPrices, setPreviousPrices] = useState<any>({});
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [mounted, setMounted] = useState(true);
    const [referenceTime, setReferenceTime] = useState(() => Date.now());
    const [categories, setCategories] = useState<any[]>([
        { id: "animals", name: "Sicirka Xoolaha", icon: "🐄", items: [], description: "Sicirka rasmiga ah ee xoolaha" },
        { id: "water", name: "Sicirka Biyaha", icon: "💧", items: [], description: "Sicirka rasmiga ah ee biyaha" },
        { id: "electricity", name: "Sicirka Korontada", icon: "⚡", items: ["Shirkada Korontada Muqdisho", "Shirkada Korontada Beco", "Shirkada Korontada Blue Sky"], description: "Sicirka rasmiga ah ee korontada" },
    ]);
    const isInitialLoad = useRef(true);
    const [logsData, setLogsData] = useState<any[]>([]);
    const [timeframe, setTimeframe] = useState("1m");
    const { resolvedTheme } = useTheme();
    const isDark = mounted && resolvedTheme === 'dark';

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/prices', { cache: 'no-store' });
                const data = await response.json();

                setCategories(prev => prev.map(cat => {
                    if (cat.id === 'animals') {
                        const animalCats = (data || []).filter((d: any) => ['geel', 'lo', 'ari'].includes(d.slug));
                        const animalsCat = (data || []).find((d: any) => d.slug === 'animals');
                        return {
                            ...cat,
                            // Use grouped livestock labels when available; fallback to DB-provided animal items.
                            items: animalCats.length > 0
                                ? ['Geel', "Lo'", 'Ari']
                                : ((animalsCat?.items || []).map((i: any) => i.name))
                        };
                    }
                    const dbCat = data.find((d: any) => d.slug === cat.id);
                    let items = dbCat ? (dbCat.items || []).map((i: any) => i.name) : cat.items;
                    if (cat.id === 'electricity') {
                        const muqdisho = 'Shirkada Korontada Muqdisho';
                        if (!items.includes(muqdisho)) {
                            items = [muqdisho, ...items];
                        }
                    }
                    return {
                        ...cat,
                        name: dbCat ? dbCat.name : cat.name,
                        description: dbCat ? dbCat.description : cat.description,
                        items
                    };
                }));

                const pricesObj: any = {};
                const historyMap: Record<string, any> = {};

                (data || []).forEach((cat: any) => {
                    (cat.items || []).forEach((item: any) => {
                        pricesObj[`${cat.slug}_${item.name}`] = item.currentPrice;
                        if (item.prices) {
                            item.prices.forEach((record: any) => {
                                const t = record.timestamp;
                                if (!historyMap[t]) historyMap[t] = { timestamp: t, prices: {} };
                                historyMap[t].prices[`${cat.slug}_${item.name}`] = record.price;
                            });
                        }
                    });
                });

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
                    // Ensure electricity placeholder has a price if not provided by API
                    const key = 'electricity_Shirkada Korontada Muqdisho';
                    if (!pricesObj[key]) {
                        // Approximate average price per kWh in USD
                        pricesObj[key] = 0.62;
                    }
                    return pricesObj;
                });
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

    const exportCSV = () => {
        let csv = "Item,Price\n";
        categories.forEach(cat => { cat.items.forEach((item: string) => { csv += `${item},${marketPrices[`${cat.id}_${item}`]}\n`; }); });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'market_report.csv';
        a.click();
    };

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
    const hasGroupedAnimalData = Object.keys(marketPrices).some((k) => /^(geel|lo|ari)_/.test(k));
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
    const currentMarketVolume = recentCatUpdates > 15 ? "High" : recentCatUpdates > 4 ? "Moderate" : "Low";

    let totalPctChange = 0;
    const catItems = Object.keys(marketPrices).filter(key => {
        const slug = key.split('_')[0];
        return activeCategory === 'animals' ? ['geel', 'lo', 'ari', 'animals'].includes(slug) : slug === activeCategory;
    });

    catItems.forEach(key => {
        const currentPrice = marketPrices[key];
        const itemName = key.substring(key.indexOf('_') + 1);
        const itemLogs = categoryLogs.filter((l: any) => l.item === itemName && new Date(l.time) >= last7Days);
        if (itemLogs.length > 0) {
            const oldestPrice = itemLogs[itemLogs.length - 1].price;
            if (oldestPrice > 0) totalPctChange += Math.abs((currentPrice - oldestPrice) / oldestPrice);
        }
    });

    const avgChange = catItems.length > 0 ? (totalPctChange / catItems.length) * 100 : 0;
    const currentStabilityIndex = avgChange <= 1.5 ? "Excellent" : avgChange <= 4 ? "Good" : avgChange <= 8 ? "Moderate" : "Volatile";

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
                                    if (cat.items && cat.items.length > 0) setSelectedSubItem(cat.items[0]);
                                }}
                            >
                                {cat.icon} {cat.name}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="sidebar-footer">
                    <ThemeToggle />
                    <button onClick={exportCSV} className="btn-secondary" style={{ width: '100%', marginTop: '15px' }}>Download Report</button>
                </div>
            </aside>

            <main className="main-content">
                <div className="top-bar">
                    <div className="breadcrumb">Muqdisho Market Prices Dashboard</div>
                </div>

                <div className="dash-layout-inner">
                    <div className="main-area">
                        <div className="content-header">
                            <h1 style={{ marginBottom: '10px' }}>{selectedCategoryData?.name}</h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

                                <p className="dash-desc">
                                    {selectedCategoryData?.description}
                                </p>
                            </div>
                        </div>

                        <div className="price-cards-grid animate-pro-scale">
                            {(() => {
                                if (activeCategory === 'animals') {
                                    if (!hasGroupedAnimalData) {
                                        return selectedCategoryData?.items.map((item: string, idx: number) => {
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
                                        return selectedCategoryData?.items.map((item: string, idx: number) => {
                                            const baseMatch = item.match(/(.+) \((.+)\)/);
                                            const label = baseMatch ? baseMatch[0] : item;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="pro-card group-card"
                                                    onClick={() => {
                                                        setSelectedAnimalType(baseMatch ? baseMatch[1] : item);
                                                        setSelectedAnimalSubType(null);
                                                    }}
                                                >
                                                    <div className="pro-card-top">
                                                        <span className="cat-type">{label}</span>
                                                        <span className="stat-pill" style={{ color: '#1e3a8a' }}>DOORO</span>
                                                    </div>
                                                    <div className="price-display">
                                                        <span className="cat-type" style={{ fontWeight: 400, fontSize: '0.9rem' }}>Eeg Noocyada...</span>
                                                    </div>
                                                    <div className="card-foot-line" style={{ background: '#cbd5e1' }}></div>
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
                                        }))).filter(type => !['Geelka', "Lo'da", 'Ariga', 'Orgi', "Ri'", 'Weyl', 'Geel', "Lo'", 'Ari', 'Camel', 'Cattle', 'Goat/Sheep', 'Goat', 'Sheep'].includes(type as string));

                                        const sortPriority: Record<string, number> = {
                                            'Hasha': 1, 'Ratiga': 2, 'Qaalinka': 3, 'Qaalimada': 4,
                                            'Dibiga': 1, 'Sac': 2, "Lo'da": 3, 'Weyl': 4, 'Weysha': 5,
                                            'Orgi': 1, "Ri'": 2, 'Waxar': 3, 'Ariga': 4
                                        };
                                        subTypes.sort((a, b) => (sortPriority[a] || 99) - (sortPriority[b] || 99));

                                        if (!selectedAnimalSubType) {
                                            return (
                                                <>
                                                    <div className="full-width-back">
                                                        <button onClick={() => setSelectedAnimalType(null)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                                                            ← Dib ugu noqo
                                                        </button>
                                                        <h2 className="selected-group-title">{selectedAnimalType} - Dooro Nooca</h2>
                                                    </div>
                                                    {subTypes.map((subType: string, idx: number) => (
                                                        <div 
                                                            key={idx} 
                                                            className="pro-card" 
                                                            onClick={() => {
                                                                setSelectedAnimalSubType(subType);
                                                                const bKey = `${subCatSlug}_${subType} (Birimo)`;
                                                                if (marketPrices[bKey] !== undefined) setSelectedSubItem(`${subType} (Birimo)`);
                                                                else setSelectedSubItem(`${subType} (Sugunto)`);
                                                            }}
                                                        >
                                                            <div className="pro-card-top" style={{ justifyContent: 'center', height: '100%', alignItems: 'center', display: 'flex', minHeight: '60px' }}>
                                                                <span className="cat-type cat-type-lg">{subType.replace(' (Lab)', '').replace(' (Dheddig)', '')}</span>
                                                            </div>
                                                            <div className="card-foot-line" style={{ background: '#1e3a8a' }}></div>
                                                        </div>
                                                    ))}
                                                </>
                                            );
                                        } else {
                                            const birimoKey = `${subCatSlug}_${selectedAnimalSubType} (Birimo)`;
                                            const suguntoKey = `${subCatSlug}_${selectedAnimalSubType} (Sugunto)`;
                                            const birimoPrice = marketPrices[birimoKey];
                                            const suguntoPrice = marketPrices[suguntoKey];
                                            return (
                                                <>
                                                    <div className="full-width-back">
                                                        <button onClick={() => setSelectedAnimalSubType(null)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                                                            ← Dib ugu noqo {selectedAnimalType}
                                                        </button>
                                                        <h2 className="selected-group-title">{selectedAnimalSubType?.replace(' (Lab)', '').replace(' (Dheddig)', '')} - Qiimaha Tooska ah</h2>
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
                                                                    borderLeft: `6px solid ${opt.label === 'Birimo' ? '#4f46e5' : '#059669'}`,
                                                                    position: 'relative',
                                                                    overflow: 'hidden'
                                                                }}
                                                                onClick={() => setSelectedSubItem(`${selectedAnimalSubType} (${opt.label})`)}
                                                            >
                                                                <div className="card-glare"></div>
                                                                <div className="pro-card-top">
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        <div className="pulse-dot" style={{ background: opt.label === 'Birimo' ? '#4f46e5' : '#059669' }}></div>
                                                                        <span className="cat-type" style={{ fontSize: '1rem', fontWeight: '900', color: opt.label === 'Birimo' ? '#4f46e5' : '#059669' }}>{opt.label.toUpperCase()}</span>
                                                                    </div>
                                                                    <span className="stat-pill" style={{ color: trend.color, background: `${trend.color}15`, fontWeight: '800', fontSize: '0.7rem' }}>{trend.label}</span>
                                                                </div>
                                                                <div className="price-display-large">
                                                                    <div className="price-main">
                                                                        <span className="curr" style={{ color: opt.label === 'Birimo' ? '#4f46e5' : '#059669', opacity: 0.6 }}>$</span>
                                                                        <span className="amt" style={{ fontSize: '3.8rem' }}>{displayPrice.toLocaleString()}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '5px' }}>
                                                                        <span className="unit-tag" style={{ color: opt.label === 'Birimo' ? '#4f46e5' : '#059669', opacity: 0.8 }}>QIIMAHA {opt.label.toUpperCase()}</span>
                                                                        <span className="text-muted-sm">LAST UPDATED: JUST NOW</span>
                                                                    </div>
                                                                </div>
                                                                <div className="card-foot-line" style={{ background: isSelected ? (opt.label === 'Birimo' ? '#4f46e5' : '#059669') : '#e2e8f0', height: '4px' }}></div>
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            );
                                        }
                                    }
                                } else {
                                    return selectedCategoryData?.items.map((item: string, idx: number) => {
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

                        {/* Moved Chart Container Here */}
                        {((activeCategory !== 'animals') || (activeCategory === 'animals' && (selectedAnimalSubType || (!hasGroupedAnimalData && selectedSubItem)))) && (
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
                                    <div style={{ width: '100%', height: '100%' }}>
                                        <Image src={newsImg} alt="Market News" fill sizes="(max-width: 1024px) 100vw, 320px" priority={true} />
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="pro-sidebar-card stats-card">
                            <div className="pro-side-header">MARKET INSIGHTS</div>
                            <div className="mini-stats">
                                <div className="m-stat-item"><span>Market Volume</span><span className="m-stat-val" style={{ color: currentMarketVolume === 'High' ? '#10b981' : '#64748b' }}>{currentMarketVolume}</span></div>
                                <div className="m-stat-item"><span>Stability Index</span><span className="m-stat-val" style={{ color: currentStabilityIndex === 'Good' || currentStabilityIndex === 'Excellent' ? '#10b981' : '#f59e0b' }}>{currentStabilityIndex}</span></div>
                            </div>
                        </div>
                    </div>
                </div>


            </main>

            <style jsx>{`
                .dashboard-layout { display: flex; height: 100vh; overflow: hidden; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); font-family: 'Inter', sans-serif; }
                .pro-loader-screen { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 24px; color: #475569; font-weight: 700; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); }
                .loader-orb { width: 56px; height: 56px; border-radius: 50%; border: 4px solid #e2e8f0; border-top-color: #3b82f6; animation: spin 1s linear infinite; box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); }
                .sidebar { width: 280px; background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); color: #fff; padding: 40px 24px; display: flex; flex-direction: column; justify-content: space-between; border-right: 1px solid rgba(255,255,255,0.05); box-shadow: 4px 0 24px rgba(0,0,0,0.05); z-index: 10; }
                .sidebar-logo { display: flex; align-items: center; gap: 16px; margin-bottom: 50px; }
                .logo-image-wrap :global(img) { border-radius: 8px; background: #fff; padding: 2px; object-fit: contain; }
                .logo-text h2 { font-size: 1.25rem; font-weight: 900; margin: 0; color: #fff; letter-spacing: -0.5px; }
                .logo-text p { font-size: 0.75rem; color: #94a3b8; margin: 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
                .side-nav { display: flex; flex-direction: column; gap: 12px; }
                .side-link { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-radius: 14px; border: 1px solid transparent; background: transparent; color: #94a3b8; font-weight: 700; cursor: pointer; transition: all 0.3s ease; width: 100%; text-align: left; font-size: 0.95rem; }
                .side-link:hover { background: rgba(255,255,255,0.05); color: #fff; transform: translateX(5px); }
                .side-link.active { background: linear-gradient(90deg, rgba(56,189,248,0.1) 0%, rgba(56,189,248,0) 100%); color: #38bdf8; border-left: 4px solid #38bdf8; border-radius: 0 14px 14px 0; }
                .main-content { flex: 1; padding: 40px; overflow-y: auto; box-sizing: border-box; min-height: 0; scroll-behavior: smooth; }
                .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid rgba(15, 23, 42, 0.05); }
                .breadcrumb { font-weight: 800; color: #64748b; font-size: 0.9rem; letter-spacing: 1px; text-transform: uppercase; display: flex; align-items: center; gap: 10px; }
                .breadcrumb::before { content: ''; display: block; width: 8px; height: 8px; background: #38bdf8; border-radius: 50%; box-shadow: 0 0 10px rgba(56,189,248,0.5); }
                .dash-layout-inner { display: grid; grid-template-columns: 1fr 320px; gap: 32px; }
                .content-header h1 { font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 900; margin: 15px 0 10px; color: #0f172a; letter-spacing: -1px; }
                .live-badge-mini { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: 30px; font-size: 0.65rem; font-weight: 900; letter-spacing: 1.5px; border: 1px solid rgba(239, 68, 68, 0.2); }
                .live-badge-mini::before { content: ''; display: block; width: 6px; height: 6px; background: #ef4444; border-radius: 50%; animation: pulse 2s infinite; }
                .price-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; margin-top: 32px; }
                .pro-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); border-radius: 24px; padding: 30px; border: 1px solid rgba(255,255,255,0.8); cursor: pointer; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.05); overflow: hidden; }
                .pro-card::before { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); transform: skewX(-20deg); transition: 0.5s; }
                .pro-card:hover::before { left: 150%; }
                .pro-card:hover { transform: translateY(-8px) scale(1.02); border-color: rgba(56,189,248,0.5); box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.12); background: #fff; }
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
                .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                .chart-info h3 { font-size: 1.4rem; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
                .chart-tabs { display: flex; background: #f8fafc; padding: 6px; border-radius: 12px; border: 1px solid #e2e8f0; }
                .ui-btn { border: none; border-radius: 10px; font-weight: 800; transition: all 0.2s ease; cursor: pointer; }
                .chart-tabs button { padding: 8px 20px; background: transparent; font-size: 0.8rem; color: #64748b; }
                .chart-tabs button:hover { color: #0f172a; }
                .chart-tabs button.active { background: #fff; color: #0f172a; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
                .full-width-back { grid-column: 1 / -1; display: flex; align-items: center; gap: 24px; margin-bottom: 10px; background: rgba(255,255,255,0.6); backdrop-filter: blur(10px); padding: 18px 25px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.9); box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
                .selected-group-title { font-size: clamp(1.1rem, 3vw, 1.4rem); font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
                .animal-detail-card { min-height: 200px; display: flex; flex-direction: column; justify-content: space-between; padding: 35px 30px !important; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); border: 1px solid rgba(255,255,255,0.8); border-radius: 28px; cursor: pointer; background: #fff; }
                .animal-detail-card:hover { transform: translateY(-10px) scale(1.02); box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.15); }
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
                .chart-subtitle { font-size: 0.75rem; margin-top: 4px; }
                .text-muted-sm { font-size: 0.6rem; color: #94a3b8; font-weight: 700; }
                .cat-type-lg { font-size: 1.4rem; font-weight: 900; color: #0f172a; }
                .chart-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #64748b; }
                .chart-empty-state p { font-weight: 700; color: #475569; margin: 0; }
                .pro-card.is-selected { border-color: #0f172a !important; background: #fbfeff !important; }
                .chart-tooltip { background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.6); padding: 20px; border-radius: 24px; box-shadow: 0 15px 35px -5px rgba(15, 23, 42, 0.1); min-width: 280px; }
                .chart-tooltip-date { margin: 0 0 12px 0; font-size: 0.75rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
                .chart-tooltip-row { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding-bottom: 12px; border-bottom: 1px dashed rgba(15, 23, 42, 0.1); }
                .chart-tooltip-label { font-weight: 900; color: #475569; font-size: 0.85rem; }
                .chart-tooltip-value { font-weight: 900; color: #0f172a; font-size: 1.1rem; letter-spacing: -0.5px; }
                .chart-tooltip-change { font-size: 0.7rem; font-weight: 900; padding: 4px 8px; border-radius: 8px; color: #64748b; background: #f8fafc; }

                :global(html.dark) .dashboard-layout { background: linear-gradient(135deg, #0b0f19 0%, #1e293b 100%); }
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
                :global(html.dark) .pro-card.is-selected { background: #1e293b !important; border-color: #38bdf8 !important; }
                :global(html.dark) .animal-detail-card { background: #0f172a !important; border-color: #334155 !important; }
                :global(html.dark) .animal-detail-card.is-selected-birimo { background: #1e1b4b !important; }
                :global(html.dark) .animal-detail-card.is-selected-sugunto { background: #064e3b !important; }
                :global(html.dark) .full-width-back { background: rgba(15, 23, 42, 0.8); border-color: #334155; }
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
                    .main-content { padding: 24px 18px; }
                    .dash-layout-inner { grid-template-columns: 1fr; gap: 24px; }
                    .right-col { order: -1; }
                    .content-header h1 { font-size: 2rem; }
                    .chart-container-pro { padding: 22px; border-radius: 20px; }
                }
                @media (max-width: 640px) {
                    .side-link { font-size: 0.88rem; padding: 12px 14px; }
                    .pro-card { padding: 18px; border-radius: 18px; }
                    .chart-header { flex-direction: column; align-items: flex-start; gap: 10px; }
                    .chart-tabs { width: 100%; justify-content: space-between; }
                    .chart-tabs button { padding: 8px 10px; font-size: 0.75rem; }
                    .full-width-back { flex-direction: column; align-items: flex-start; gap: 12px; padding: 14px; }
                    .animal-detail-card { min-height: 160px; padding: 20px 18px !important; }
                    .news-card { height: 190px; border-radius: 18px; }
                }
            `}</style>
        </div>
    );
}
