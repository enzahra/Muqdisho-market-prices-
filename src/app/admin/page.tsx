"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAdminNavCategories, isSuperAdmin } from "@/lib/admin-role";
import { adminLogout, verifyAdminAuth } from "@/lib/admin-client";

const CATEGORY_CARDS = [
  {
    slug: "animals",
    icon: "🐄",
    title: "Sicirka Xoolaha",
    desc: "Maamul qiimaha Geel, Lo' & Ari'",
    accent: "#16a34a",
    soft: "#f0fdf4",
  },
  {
    slug: "water",
    icon: "💧",
    title: "Sicirka Biyaha",
    desc: "Maamul shirkadaha biyaha & qiimaha m³",
    accent: "#0284c7",
    soft: "#f0f9ff",
  },
  {
    slug: "electricity",
    icon: "⚡",
    title: "Sicirka Korontada",
    desc: "Maamul shirkadaha korontada & qiimaha kWh",
    accent: "#d97706",
    soft: "#fffbeb",
  },
] as const;

export default function AdminHubPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const authUser = await verifyAdminAuth();
      if (!authUser) {
        router.push(
          "/admin-login?error=" + encodeURIComponent("Fadlan geli email-kaaga iyo password-kaaga.")
        );
        return;
      }
      setUser(authUser);
      setLoading(false);
    })();
  }, [router]);

  const handleLogout = async () => {
    await adminLogout();
    router.push("/admin-login");
  };

  if (loading) {
    return (
      <div className="hub-loader">
        <div className="loader-orb" />
        <style jsx>{`
          .hub-loader {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #f8fafc;
          }
          .loader-orb {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 4px solid #e2e8f0;
            border-top-color: #1e3a8a;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  const allowed = getAdminNavCategories(user?.adminRole);
  const visibleCategories = CATEGORY_CARDS.filter((c) => allowed.includes(c.slug));
  const superAdmin = isSuperAdmin(user?.adminRole);

  return (
    <div className="admin-hub">
      <nav className="hub-nav">
        <div className="hub-nav-inner">
          <div className="hub-brand">
            <Image src="/images/logo.png" alt="Logo" width={36} height={36} />
            <div>
              <h1>Admin Panel</h1>
              <p>Muqdisho Market Prices</p>
            </div>
          </div>
          <div className="hub-nav-actions">
            <div className="theme-wrap">
              <ThemeToggle />
            </div>
            <button type="button" className="hub-btn-ghost" onClick={() => router.push("/dashboard")}>
              Dashboard
            </button>
            <button type="button" className="hub-btn-logout" onClick={handleLogout}>
              Ka bax
            </button>
          </div>
        </div>
      </nav>

      <main className="hub-main">
        <header className="hub-header">
          <div className="hub-welcome">
            <span className="hub-avatar">{(user?.email?.[0] ?? "A").toUpperCase()}</span>
            <div>
              <p className="hub-kicker">Ku soo dhawoow</p>
              <h2>{user?.fullName || user?.email}</h2>
              <p className="hub-email">{user?.email}</p>
            </div>
          </div>
        </header>

        {superAdmin && (
          <section className="hub-section">
            <h3 className="hub-section-title">Maamulka Adminada</h3>
            <button
              type="button"
              className="hub-card hub-card-admin"
              onClick={() => router.push("/admin/users")}
            >
              <span className="hub-card-icon">👥</span>
              <div className="hub-card-body">
                <strong>Maamulidda Adminada</strong>
                <span>Abuur, bedel, ama tirtir adminada nidaamka</span>
              </div>
              <span className="hub-card-arrow">→</span>
            </button>
          </section>
        )}

        <section className="hub-section">
          <h3 className="hub-section-title">Maamulka Qiimaha</h3>
          <div className="hub-grid">
            {visibleCategories.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                className="hub-card"
                style={{ "--card-accent": cat.accent, "--card-soft": cat.soft } as React.CSSProperties}
                onClick={() => router.push(`/admin/${cat.slug}`)}
              >
                <span className="hub-card-icon">{cat.icon}</span>
                <div className="hub-card-body">
                  <strong>{cat.title}</strong>
                  <span>{cat.desc}</span>
                </div>
                <span className="hub-card-arrow">→</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      <style jsx>{`
        .admin-hub {
          --bg: #f8fafc;
          --card: #ffffff;
          --border: #e2e8f0;
          --text: #0f172a;
          --muted: #64748b;
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: "Plus Jakarta Sans", "Inter", sans-serif;
        }
        :global(html.dark) .admin-hub {
          --bg: #0a0f1e;
          --card: rgba(15, 23, 42, 0.85);
          --border: rgba(255, 255, 255, 0.08);
          --text: #f1f5f9;
          --muted: #94a3b8;
        }
        .hub-nav {
          background: var(--card);
          border-bottom: 1.5px solid var(--border);
          padding: 0 24px;
          height: 72px;
          display: flex;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(12px);
        }
        .hub-nav-inner {
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .hub-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .hub-brand h1 {
          margin: 0;
          font-size: 1rem;
          font-weight: 800;
          color: #1e3a8a;
          line-height: 1.2;
        }
        :global(html.dark) .hub-brand h1 {
          color: #c7d2fe;
        }
        .hub-brand p {
          margin: 0;
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--muted);
        }
        .hub-nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .theme-wrap {
          width: 160px;
        }
        .hub-btn-ghost,
        .hub-btn-logout {
          border-radius: 10px;
          padding: 9px 16px;
          font-size: 0.8rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hub-btn-ghost {
          background: var(--bg);
          border: 1.5px solid var(--border);
          color: var(--text);
        }
        .hub-btn-ghost:hover {
          border-color: #6366f1;
          color: #6366f1;
        }
        .hub-btn-logout {
          background: transparent;
          border: 1.5px solid rgba(239, 68, 68, 0.35);
          color: #ef4444;
        }
        .hub-btn-logout:hover {
          background: rgba(239, 68, 68, 0.08);
        }
        .hub-main {
          max-width: 960px;
          margin: 0 auto;
          padding: 32px 24px 48px;
        }
        .hub-header {
          margin-bottom: 32px;
        }
        .hub-welcome {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .hub-avatar {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #fff;
          display: grid;
          place-items: center;
          font-size: 1.2rem;
          font-weight: 900;
          flex-shrink: 0;
        }
        .hub-kicker {
          margin: 0 0 2px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6366f1;
        }
        .hub-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .hub-email {
          margin: 4px 0 0;
          font-size: 0.85rem;
          color: var(--muted);
          font-weight: 600;
        }
        .hub-section {
          margin-bottom: 28px;
        }
        .hub-section-title {
          margin: 0 0 14px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--muted);
        }
        .hub-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 14px;
        }
        .hub-card {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          padding: 18px 20px;
          border-radius: 18px;
          border: 1.5px solid var(--border);
          background: var(--card);
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
          box-shadow: 0 4px 16px -6px rgba(15, 23, 42, 0.08);
        }
        .hub-card:hover {
          transform: translateY(-2px);
          border-color: var(--card-accent, #6366f1);
          box-shadow: 0 12px 28px -8px rgba(15, 23, 42, 0.12);
        }
        .hub-card-admin {
          border-color: rgba(99, 102, 241, 0.35);
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, var(--card) 100%);
        }
        .hub-card-admin:hover {
          border-color: #6366f1;
          box-shadow: 0 12px 32px -8px rgba(99, 102, 241, 0.25);
        }
        .hub-card-icon {
          font-size: 1.75rem;
          line-height: 1;
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: var(--card-soft, #f1f5f9);
        }
        .hub-card-body {
          flex: 1;
          min-width: 0;
        }
        .hub-card-body strong {
          display: block;
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 3px;
        }
        .hub-card-body span {
          display: block;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--muted);
          line-height: 1.4;
        }
        .hub-card-arrow {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--muted);
          flex-shrink: 0;
        }
        .hub-card:hover .hub-card-arrow {
          color: var(--card-accent, #6366f1);
        }
        @media (max-width: 640px) {
          .hub-nav-inner {
            flex-wrap: wrap;
            height: auto;
            padding: 12px 0;
          }
          .hub-nav {
            height: auto;
          }
          .theme-wrap {
            width: 100%;
          }
          .hub-nav-actions {
            flex-wrap: wrap;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
