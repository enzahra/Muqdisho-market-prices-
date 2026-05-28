"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { use } from "react";
import { isSuperAdmin, canAccessCategory, isAdminAccount, canAdminModifyCategory } from "@/lib/admin-role";
import { ThemeToggle } from "@/components/ThemeToggle";
import { adminFetch, adminLogout, parseAdminJson, ensureAdminSession } from "@/lib/admin-client";

export default function AdminPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = use(params);
  const categoryParam = resolvedParams.category;
  const categorySlug = (categoryParam || "").toLowerCase();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<any>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditLoadingMore, setAuditLoadingMore] = useState(false);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const router = useRouter();

  const [initialPrices, setInitialPrices] = useState<any>({});
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
          pricesObj[`${cat.slug}_${item.name}`] = item.currentPrice;
        });
      });
      setPrices(pricesObj);
      setInitialPrices(pricesObj);
    } catch (err) { console.error(err); }
  }, []);


  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push("/admin-login");
      return;
    }

    const currentUser = JSON.parse(storedUser);
    if (!isAdminAccount(currentUser)) {
      localStorage.removeItem('user');
      router.push("/admin-login?error=Koontadaada%20ma%20laha%20xuquuqda%20Admin-ka.%20Fadlan%20ku%20gal%20akoon%20Admin%20ah.");
      return;
    }

    if (!canAccessCategory(currentUser.adminRole, categorySlug)) {
      router.push("/admin");
      return;
    }

    setUser(currentUser);

    let cancelled = false;
    setLoading(true);
    (async () => {
      const sessionOk = await ensureAdminSession(currentUser);
      if (!sessionOk) {
        localStorage.removeItem('user');
        router.push("/admin-login?error=" + encodeURIComponent("Session-ka wuu dhacay. Fadlan mar kale ku gal."));
        return;
      }
      await fetchCurrentPrices();
      await fetchRecentLogs();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, categorySlug, fetchCurrentPrices, fetchRecentLogs]);


  const handlePriceChange = (categorySlug: string, itemName: string, value: string) => {
    setPrices((prev: any) => ({ ...prev, [`${categorySlug}_${itemName}`]: value }));
    setHasChanges(true);
  };

  const [newItemName, setNewItemName] = useState<Record<string, string>>({});
  const [addBirimo, setAddBirimo] = useState(true);
  const [addSugunto, setAddSugunto] = useState(true);

  const addNewItem = async (categoryId: string) => {
    const name = newItemName[categoryId];
    if (!name || name.trim() === "") return;

    setMessage("Adding item...");
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

        setMessage(`Success: Si guul leh ayaa loo daray ${createdCount} nooc (${namesToCreate.join(', ')})!`);
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
          setMessage(`Success: "${name}" waa la daray!`);
          setNewItemName(prev => ({ ...prev, [categoryId]: "" }));
          fetchCurrentPrices(); // Refresh list
        } else {
          const errResult = await parseAdminJson(resp);
          throw new Error(errResult.error || "Lama dari karo");
        }
      }
    } catch (err: any) {
      setMessage(`Err: ${err.message}`);
    }
  };

  const removeItem = async (itemId: string, itemName: string) => {
    if (!window.confirm(`Ma hubtaa inaad tirtirto "${itemName}"? Tani dib looma soo celin karo.`)) return;

    setMessage(`Tirtiraya "${itemName}"...`);
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
        setMessage(`Success: "${itemName}" waa la tirtiray!`);
        fetchCurrentPrices(); // Refresh list
      } else {
        const errResult = await parseAdminJson(resp);
        throw new Error(errResult.error || "Lama tirtiri karo");
      }
    } catch (err: any) {
      setMessage(`Err: ${err.message}`);
    }
  };

  const savePrices = async () => {
    if (!hasChanges) {
      setMessage("Xogta waa sideeda, wax ka baddal marka hore!");
      setTimeout(() => setMessage(""), 5000);
      return;
    }

    setMessage("Cusboonaysiinaya...");
    try {
      const role = user?.adminRole ?? "ALL";

      // 1. First Pass: Validate all changed prices (allowed categories only)
      for (const cat of dbCategories) {
        if (!canAdminModifyCategory(role, cat.slug)) continue;
        for (const item of cat.items) {
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

      // 2. Second Pass: Save
      for (const cat of dbCategories) {
        if (!canAdminModifyCategory(role, cat.slug)) continue;
        for (const item of cat.items) {
          const itemKey = `${cat.slug}_${item.name}`;
          const currentPrice = prices[itemKey];

          if (currentPrice === undefined || currentPrice === "" || currentPrice === null) continue;
          if (Number(currentPrice) === initialPrices[itemKey]) continue; // Skip unchanged

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

      setMessage("Success: Xogta si guul leh ayaa loo keydiyay!");
      setHasChanges(false);
      fetchCurrentPrices(); // Refresh to set new initial state
      fetchRecentLogs();
      setTimeout(() => setMessage(""), 5000);
    } catch (err: any) { setMessage(`Err: ${err.message}`); }
  };

  const handleLogout = async () => {
    await adminLogout();
    router.push("/admin-login");
  };

  if (!mounted || loading) {
    return (
      <div className="pro-loader-screen">
        <div className="loader-orb"></div>
      </div>
    );
  }

  return (
    <div className="admin-pro-wrapper animate-pro">
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
                        <h1>{categorySlug === 'animals' ? 'Sicirka Xoolaha' : categorySlug === 'water' ? 'Sicirka Biyaha' : categorySlug === 'electricity' ? 'Sicirka Korontada' : 'Admin Panel'}</h1>
                    </div>
                    {hasChanges && (
                        <div className="changes-indicator">
                            ⚠️ PENDING CHANGES
                        </div>
                    )}
                 </div>
            </header>

            {isSuperAdmin(user?.adminRole) && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button onClick={() => router.push('/admin/animals')} className={`btn-${categorySlug === 'animals' ? 'primary' : 'secondary'}`} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>🐄 Xoolaha</button>
                    <button onClick={() => router.push('/admin/water')} className={`btn-${categorySlug === 'water' ? 'primary' : 'secondary'}`} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>💧 Biyaha</button>
                    <button onClick={() => router.push('/admin/electricity')} className={`btn-${categorySlug === 'electricity' ? 'primary' : 'secondary'}`} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>⚡ Korontada</button>
                </div>
            )}

            {message && (
                <div className={`pro-status-banner ${(message.includes("Err") || message.includes("marka hore")) ? "err" : "succ"}`}>
                    {message}
                </div>
            )}

            <div className="pro-card-stack">
                {dbCategories.filter((cat) => {
                    if (cat.slug === "animals" && dbCategories.some(c => ["geel", "lo", "ari"].includes(c.slug))) {
                        return false; // Hide legacy animals if specific ones exist
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
                    const legacyAnimalBaseDeny = [
                      "Geelka",
                      "Lo'da",
                      "Ariga",
                      "Geel",
                      "Lo'",
                      "Ari",
                      "Camel",
                      "Cattle",
                      "Goat/Sheep",
                      "Goat",
                      "Sheep",
                    ];
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

                    const sortPriority: Record<string, number> = {
                        'Hasha': 1, 'Ratiga': 2, 'Qaalinka': 3, 'Qaalimada': 4,
                        'Dibiga': 1, 'Sac': 2, "Lo'da": 3, 'Weyl': 4, 'Weysha': 5,
                        'Orgi': 1, "Ri'": 2, 'Waxar': 3, 'Ariga': 4, 'General': 99
                    };

                    const sortedGroups = Object.entries(groupedItems).sort(([groupA], [groupB]) => {
                        const aBase = groupA.replace(' (Lab)', '').replace(' (Dheddig)', '');
                        const bBase = groupB.replace(' (Lab)', '').replace(' (Dheddig)', '');
                        return (sortPriority[aBase] || 50) - (sortPriority[bBase] || 50);
                    });

                    return (
                        <div key={cat.id} className="pro-cat-editor-card">
                            <div className="pro-cat-header">
                                <span className="pro-cat-indicator"></span>
                                <h3>{cat.name}</h3>
                            </div>
                            
                            <div className="pro-grouped-container">
                                {sortedGroups.map(([groupName, items]) => {
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
                                })}
                            </div>

                            <div className="pro-add-new-box-container">
                                <div className="pro-add-new-box">
                                    <input 
                                        type="text" 
                                        placeholder={['animals', 'geel', 'lo', 'ari'].includes(cat.slug) ? "Ku dar xoolo cusub (tusaale: Qaalinka, Waxar)..." : "Ku dar shay cusub (tusaale: Shirkad Hebel)..."} 
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


            <div className="pro-final-save-bar">
                <button onClick={savePrices} className="btn-primary" style={{ width: '100%', padding: '20px', fontSize: '1.1rem' }}>UPDATE LIVE PRICE INDEX</button>
            </div>
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
        
        .pro-status-banner { padding: 16px 24px; border-radius: 14px; margin-bottom: 35px; text-align: center; font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .pro-status-banner.succ { background: #ecfdf5; color: #065f46; border: 1.5px solid #a7f3d0; }
        .pro-status-banner.err { background: #fef2f2; color: #991b1b; border: 1.5px solid #fca5a5; }

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
        :global(.dark) .pro-status-banner.succ { background: rgba(16, 185, 129, 0.1) !important; color: #34d399 !important; border-color: rgba(16, 185, 129, 0.2) !important; }
        :global(.dark) .pro-status-banner.err { background: rgba(239, 68, 68, 0.1) !important; color: #f87171 !important; border-color: rgba(239, 68, 68, 0.2) !important; }

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
