"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";

type ReportPoint = {
  month: string;
  animals: number;
  water: number;
  electricity: number;
};

export default function ReportsPage() {
    const [mounted, setMounted] = useState(false);
    const [reportData, setReportData] = useState<ReportPoint[]>([]);
    const router = useRouter();

    useEffect(() => {
        const fetchReportData = async () => {
            setMounted(true);
            try {
                const resp = await fetch("/api/prices", { cache: "no-store" });
                const data = await resp.json();

                const now = new Date();
                const monthKeys: string[] = [];
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
                }

                const grouped: Record<string, { animals: number[]; water: number[]; electricity: number[] }> = {};
                monthKeys.forEach((k) => {
                    grouped[k] = { animals: [], water: [], electricity: [] };
                });

                (data || []).forEach((cat: any) => {
                    const bucket =
                        ["geel", "lo", "ari", "animals"].includes(cat.slug) ? "animals" :
                        cat.slug === "water" ? "water" :
                        cat.slug === "electricity" ? "electricity" :
                        null;

                    if (!bucket) return;

                    (cat.items || []).forEach((item: any) => {
                        const prices = Array.isArray(item.prices) ? item.prices : [];

                        if (prices.length === 0 && item.currentPrice !== null && item.currentPrice !== undefined) {
                            const latestMonth = monthKeys[monthKeys.length - 1];
                            grouped[latestMonth][bucket].push(Number(item.currentPrice));
                            return;
                        }

                        prices.forEach((p: any) => {
                            const ts = new Date(p.timestamp);
                            if (Number.isNaN(ts.getTime())) return;
                            const key = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}`;
                            if (!grouped[key]) return;
                            grouped[key][bucket].push(Number(p.price));
                        });
                    });
                });

                const monthlyData: ReportPoint[] = monthKeys.map((key) => {
                    const [year, month] = key.split("-").map(Number);
                    const dt = new Date(year, month - 1, 1);
                    const avg = (nums: number[]) =>
                        nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

                    return {
                        month: dt.toLocaleDateString("en-US", { month: "short" }),
                        animals: avg(grouped[key].animals),
                        water: avg(grouped[key].water),
                        electricity: avg(grouped[key].electricity),
                    };
                });

                setReportData(monthlyData);
            } catch (error) {
                console.error("Failed to load report graph data:", error);
                setReportData([]);
            }
        };

        fetchReportData();
    }, []);

    if (!mounted) return null;

    return (
        <div className="reports-wrapper animate-pro">
            <nav className="reports-nav">
                <div className="nav-container">
                    <button onClick={() => router.push('/dashboard')} className="btn-back">
                        ← Back to Dashboard
                    </button>
                    <h1>Market Insights <span style={{ color: '#64748b' }}>/ 6-Month Review</span></h1>
                </div>
            </nav>

            <main className="reports-content">
                <div className="report-grid">
                    {/* Insights Summary Cards */}
                    <div className="insight-card highlight">
                        <h3>Lixdii Bilood ee u Dambeeyey</h3>
                        <p>Xogta isbarbardhigga ee saddexda qeybood ee ugu muhiimsan suuqyada Muqdisho.</p>
                    </div>

                    {(() => {
                        if (reportData.length < 2) return null;
                        const latest = reportData[reportData.length - 1];
                        const prev = reportData[reportData.length - 2];
                        
                        const calcStat = (curr: number, old: number) => {
                            if (!old || old === 0) return { val: curr, trend: 0, class: 'stable', sign: '' };
                            const diff = ((curr - old) / old) * 100;
                            return {
                                val: curr,
                                trend: Math.abs(diff).toFixed(1),
                                class: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
                                sign: diff > 0 ? '+' : diff < 0 ? '-' : ''
                            };
                        };

                        const animStat = calcStat(latest.animals, prev.animals);
                        const waterStat = calcStat(latest.water, prev.water);
                        const elecStat = calcStat(latest.electricity, prev.electricity);

                        return (
                            <div className="stats-row">
                                <div className="stat-box">
                                    <span className="label">Xoolaha Avg</span>
                                    <span className="val">${animStat.val.toFixed(2)}</span>
                                    <span className={`trend ${animStat.class}`}>{animStat.sign}{animStat.trend}%</span>
                                </div>
                                <div className="stat-box">
                                    <span className="label">Biyaha Avg</span>
                                    <span className="val">${waterStat.val.toFixed(2)}</span>
                                    <span className={`trend ${waterStat.class}`}>{waterStat.sign}{waterStat.trend}%</span>
                                </div>
                                <div className="stat-box">
                                    <span className="label">Korontada Avg</span>
                                    <span className="val">${elecStat.val.toFixed(2)}</span>
                                    <span className={`trend ${elecStat.class}`}>{elecStat.sign}{elecStat.trend}%</span>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Main Analysis Chart */}
                    <div className="chart-container-large">
                        <div className="chart-header">
                            <h2>Isbarbardhigga Qeybaha (Comparison)</h2>
                            <p>Xogta muujinaysa sida suuqyadu u kala dhaqaaqeen 6-dii bilood ee u dambeeyey.</p>
                        </div>
                        <div className="chart-box-large">
                            <ResponsiveContainer width="100%" height={400}>
                                <AreaChart data={reportData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} stroke="#64748b" />
                                    <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="#64748b" tickFormatter={(v) => `$${v}`} />
                                    <Tooltip />
                                    <Legend verticalAlign="top" height={36}/>
                                    <Area type="monotone" dataKey="animals" stroke="#6366f1" fillOpacity={0.1} fill="#6366f1" name="Xoolaha (Animals)" strokeWidth={3} />
                                    <Area type="monotone" dataKey="water" stroke="#0ea5e9" fillOpacity={0.1} fill="#0ea5e9" name="Biyaha (Water)" strokeWidth={3} />
                                    <Area type="monotone" dataKey="electricity" stroke="#f59e0b" fillOpacity={0.1} fill="#f59e0b" name="Korontada (Electricity)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Expert Advice Section */}
                    <div className="advice-section">
                        <h2>Falanqaynta Khubarada (Expert Analysis)</h2>
                        <div className="advice-grid">
                            <div className="advice-item">
                                <div className="icon">🐄</div>
                                <div className="text">
                                    <h4>Xoolaha Nool</h4>
                                    <p>Qiimaha xoolaha ayaa sii kordhayay bilihii u dambeeyay sababa la xiriira baahida suuqyada gobolka iyo xilliga barwaaqada ah. Waxaa la filayaa in qiimuhu uu xasilo bilaha soo socda.</p>
                                </div>
                            </div>
                            <div className="advice-item">
                                <div className="icon">💧</div>
                                <div className="text">
                                    <h4>Adeegyada Biyaha</h4>
                                    <p>Biyuhu waxay ahaayeen kuwa ugu xasiloon ee aan isbeddelka badan laga dareemin. Shirkadaha biyaha ayaa dhowray qiimo joogto ah lixdii bilood ee u dambeeyay dhamaantood.</p>
                                </div>
                            </div>
                            <div className="advice-item">
                                <div className="icon">⚡</div>
                                <div className="text">
                                    <h4>Tamar & Koronto</h4>
                                    <p>Korontadu waa ay xasiloontahay, laakiin waxaa jira dareen ah in qiimaha shidaalka ee caalamka uu saameyn ku yeelan karo bilaha soo socda. Digniin: Qorshee isticmaalkaaga.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <style jsx>{`
                .reports-wrapper {
                    --bg-main:    #f8fafc;
                    --bg-card:    #ffffff;
                    --border:     #e2e8f0;
                    --text-main:  #0f172a;
                    --text-muted: #475569;
                    min-height: 100vh;
                    background: var(--bg-main);
                    color: var(--text-main);
                    padding-bottom: 50px;
                    transition: all 0.4s ease;
                }
                :global(.dark) .reports-wrapper {
                    --bg-main:    #0a0f1e;
                    --bg-card:    rgba(15, 23, 42, 0.65);
                    --border:     rgba(255, 255, 255, 0.08);
                    --text-main:  #f1f5f9;
                    --text-muted: #94a3b8;
                }
                .reports-nav {
                    background: var(--bg-card);
                    border-bottom: 1px solid var(--border);
                    padding: 20px 0;
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }
                .nav-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 30px;
                    display: flex;
                    align-items: center;
                    gap: 30px;
                }
                .btn-back {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 20px;
                    border-radius: 12px;
                    background: var(--bg-main);
                    border: 1px solid var(--border);
                    font-weight: 700;
                    color: var(--text-main);
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .btn-back:hover { background: var(--bg-card); transform: translateX(-5px); }
                h1 { font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin: 0; }

                .reports-content {
                    max-width: 1200px;
                    margin: 40px auto;
                    padding: 0 30px;
                }
                .report-grid { display: flex; flex-direction: column; gap: 30px; }
                
                .insight-card {
                    background: linear-gradient(135deg, #1e293b, #0f172a);
                    padding: 30px;
                    border-radius: 24px;
                    color: #fff;
                }
                .insight-card h3 { font-size: 1.4rem; margin-bottom: 10px; }
                .insight-card p { opacity: 0.8; font-size: 0.95rem; }

                .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
                .stat-box { 
                    background: var(--bg-card); 
                    padding: 25px; 
                    border-radius: 20px; 
                    border: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .stat-box .label { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
                .stat-box .val { font-size: 1.8rem; font-weight: 800; color: var(--text-main); }
                .stat-box .trend { font-size: 0.85rem; font-weight: 700; padding: 4px 10px; border-radius: 8px; width: fit-content; }
                .trend.up { background: #f0fdf4; color: #10b981; }
                .trend.down { background: #fef2f2; color: #ef4444; }
                .trend.stable { background: var(--bg-main); color: var(--text-muted); }

                .chart-container-large {
                    background: var(--bg-card);
                    padding: 35px;
                    border-radius: 24px;
                    border: 1px solid var(--border);
                }
                .chart-header { margin-bottom: 30px; }
                .chart-header h2 { font-size: 1.25rem; font-weight: 800; color: var(--text-main); }
                .chart-header p { color: var(--text-muted); font-size: 0.9rem; }
                .chart-box-large { margin-top: 20px; }

                .advice-section {
                    background: var(--bg-card);
                    padding: 35px;
                    border-radius: 24px;
                    border: 1px solid var(--border);
                }
                .advice-section h2 { margin-bottom: 30px; font-size: 1.25rem; font-weight: 800; }
                .advice-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 25px; }
                .advice-item {
                    display: flex;
                    gap: 15px;
                    padding: 20px;
                    background: var(--bg-main);
                    border-radius: 18px;
                }
                .advice-item .icon { font-size: 1.8rem; }
                .advice-item h4 { font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin-bottom: 8px; }
                .advice-item p { font-size: 0.82rem; color: var(--text-muted); line-height: 1.6; }

                @media (max-width: 768px) {
                    .stats-row, .advice-grid { grid-template-columns: 1fr; }
                    .nav-container { flex-direction: column; align-items: flex-start; gap: 15px; }
                    h1 { font-size: 1.2rem; }
                }
            `}</style>
        </div>
    );
}
