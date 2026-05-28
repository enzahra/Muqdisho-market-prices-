"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  isSuperAdmin,
  isProtectedSuperAdmin,
  isPrimarySuperAdminEmail,
  isAdminAccount,
} from "@/lib/admin-role";
import { adminFetch, adminLogout, parseAdminJson, ensureAdminSession } from "@/lib/admin-client";

const ROLE_OPTIONS = [
  { value: "ALL",         label: "Dhammaan Qaybaha",   icon: "🌐" },
  { value: "animals",     label: "Xoolaha kaliya",      icon: "🐄" },
  { value: "water",       label: "Biyaha kaliya",       icon: "💧" },
  { value: "electricity", label: "Korontada kaliya",    icon: "⚡" },
];

function roleLabel(role: string | null) {
  const found = ROLE_OPTIONS.find(r => r.value === role);
  return found ? `${found.icon} ${found.label}` : role ?? "—";
}

export default function UserManagementPage() {
  const [users, setUsers]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [message, setMessage]           = useState("");
  const [msgType, setMsgType]           = useState<"ok"|"err">("ok");
  const [currentUser, setCurrentUser]   = useState<any>(null);
  const router = useRouter();

  // --- Create Admin form state ---
  const [createEmail,    setCreateEmail]    = useState("");
  const [createName,     setCreateName]     = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole,     setCreateRole]     = useState("animals");
  const [creating,       setCreating]       = useState(false);
  const [showCreate,     setShowCreate]     = useState(false);
  const [showPwd,        setShowPwd]        = useState(false);

  // --- Inline role-change state ---
  const [editingRole, setEditingRole]   = useState<string | null>(null); // userId
  const [pendingRole, setPendingRole]   = useState("ALL");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) { router.push("/admin-login"); return; }

    const user = JSON.parse(storedUser);
    if (!isAdminAccount(user) || !isSuperAdmin(user.adminRole)) {
      localStorage.removeItem("user");
      router.push("/admin-login?error=Koontadaada%20ma%20laha%20xuquuqda%20Admin-ka.%20Fadlan%20ku%20gal%20akoon%20Admin%20ah.");
      return;
    }
    setCurrentUser(user);
    (async () => {
      const sessionOk = await ensureAdminSession(user);
      if (!sessionOk) {
        localStorage.removeItem("user");
        router.push(
          "/admin-login?error=" +
            encodeURIComponent("Session-ka wuu dhacay. Fadlan mar kale ku gal.")
        );
        return;
      }
      fetchUsers();
    })();
  }, [router]);

  const flash = (msg: string, type: "ok"|"err" = "ok") => {
    setMessage(msg); setMsgType(type);
    setTimeout(() => setMessage(""), 4000);
  };

  const fetchUsers = async () => {
    try {
      const result = await parseAdminJson<any[]>(
        await adminFetch("/api/admin/users", { cache: "no-store" })
      );
      if (!result.ok) {
        flash(result.error || "Lama soo dejin karo users-ka", "err");
        if (result.status === 401 || result.status === 403) {
          await adminLogout();
          router.push("/admin-login");
        }
        setUsers([]);
        return;
      }
      setUsers(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error(err);
      flash("Cilad ayaa dhacday markii users la soo dejinayay.", "err");
    } finally {
      setLoading(false);
    }
  };

  // --- Create new admin ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail || !createPassword) {
      flash("Email-ka iyo password-ka waa lagama maarmaan!", "err"); return;
    }
    setCreating(true);
    try {
      const resp = await adminFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail.trim(),
          password: createPassword.trim(),
          fullName: createName.trim(),
          adminRole: createRole,
        }),
      });
      const result = await parseAdminJson<{ user?: unknown }>(resp);
      if (!result.ok) throw new Error(result.error || "Diiwaangelinta waa ku fashilantay");
      const created = result.data as { user?: { email?: string } } | null;
      flash(
        `✅ Admin "${created?.user?.email ?? createEmail.trim()}" waa la abuuray! Ku gal: ${createEmail.trim()} + password-ka aad gelisay.`
      );
      setCreateEmail(""); setCreateName(""); setCreatePassword(""); setCreateRole("animals");
      setShowCreate(false);
      fetchUsers();
    } catch (err: any) {
      flash(err.message, "err");
    } finally { setCreating(false); }
  };

  // --- Update role of existing user ---
  const applyRoleChange = async (
    userId: string,
    newRole: string,
    targetUser: { email?: string }
  ) => {
    if (isProtectedSuperAdmin(targetUser)) {
      flash("Super admin-ka doorkiisa lama beddeli karo.", "err");
      return;
    }
    try {
      const resp = await adminFetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isAdmin: true, adminRole: newRole }),
      });
      const result = await parseAdminJson(resp);
      if (!result.ok) throw new Error(result.error || "Waa ku fashilantay");
      flash("✅ Doorka waa la cusboonaysiiyay!");
      setEditingRole(null);
      fetchUsers();
    } catch (err: any) { flash(err.message, "err"); }
  };

  const promoteUser = async (userId: string, role: string = "animals") => {
    try {
      const resp = await adminFetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isAdmin: true, adminRole: role }),
      });
      const result = await parseAdminJson(resp);
      if (!result.ok) throw new Error(result.error || "Waa ku fashilantay");
      flash("✅ User-ka waa loo ogolaaday admin ahaan!");
      fetchUsers();
    } catch (err: any) {
      flash(err.message, "err");
    }
  };

  // --- Remove admin access ---
  const demoteUser = async (userId: string, targetUser: { email?: string; adminRole?: string }) => {
    if (isProtectedSuperAdmin(targetUser)) {
      flash("Super admin-ka lama demote-gareyn karo.", "err");
      return;
    }
    try {
      const resp = await adminFetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isAdmin: false, adminRole: null }),
      });
      const result = await parseAdminJson(resp);
      if (!result.ok) throw new Error(result.error || "Waa ku fashilantay");
      flash("✅ Awoodda admin-ka waa laga qaaday.");
      fetchUsers();
    } catch (err: any) { flash(err.message || "Waa ku fashilantay", "err"); }
  };

  // --- Delete user entirely ---
  const deleteUser = async (userId: string, targetUser: { email?: string; adminRole?: string }) => {
    if (isProtectedSuperAdmin(targetUser)) {
      flash("Super admin-ka lama tirtiri karo.", "err");
      return;
    }
    if (!window.confirm(`Ma hubtaa inaad tirtirto: ${targetUser.email}?`)) return;
    try {
      const resp = await adminFetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const result = await parseAdminJson(resp);
      if (!result.ok) throw new Error(result.error || "Tirtiriddu waa ku fashilantay");
      flash("✅ User-ka waa la tirtiray.");
      fetchUsers();
    } catch (err: any) { flash(err.message || "Tirtiriddu waa ku fashilantay", "err"); }
  };

  if (loading) return (
    <div className="loader-screen">
      <div className="loader-orb"></div>
    </div>
  );

  return (
    <div className="admin-wrapper">

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="admin-nav">
        <div className="nav-container">
          <div className="logo-group">
            <Image src="/images/logo.png" alt="Logo" width={32} height={32} />
            <h1>User Management</h1>
          </div>
          <div className="nav-actions">
            <div className="theme-toggle-wrap"><ThemeToggle /></div>
            <button onClick={() => router.push("/admin/animals")} className="btn-back">
              ← Admin Panel
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <header className="page-header">
          <div className="header-row">
            <div>
              <h2>Maamulidda Adminada</h2>
              <p>Abuur, bedel, ama tirtir adminada nidaamka.</p>
            </div>
            <button className="btn-create-toggle" onClick={() => setShowCreate(v => !v)}>
              {showCreate ? "✕ Xir" : "+ Abuur Admin Cusub"}
            </button>
          </div>
        </header>

        {/* ── FLASH MESSAGE ──────────────────────────────────── */}
        {message && (
          <div className={`status-banner ${msgType}`}>{message}</div>
        )}

        {/* ── CREATE ADMIN FORM ──────────────────────────────── */}
        {showCreate && (
          <div className="create-card">
            <h3 className="create-title">➕ Admin Cusub Samee</h3>
            <form onSubmit={handleCreate} className="create-form">

              <div className="form-row">
                <div className="form-group">
                  <label>Magaca Buuxa</label>
                  <input
                    type="text" placeholder="Tusaale: Faadumo Ali"
                    value={createName} onChange={e => setCreateName(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Email-ka <span className="req">*</span></label>
                  <input
                    type="email" placeholder="admin@example.com"
                    value={createEmail} onChange={e => setCreateEmail(e.target.value)}
                    className="form-input" required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Password-ka <span className="req">*</span></label>
                  <div className="pwd-wrap">
                    <input
                      type={showPwd ? "text" : "password"}
                      placeholder="Furaha sirta ah"
                      value={createPassword} onChange={e => setCreatePassword(e.target.value)}
                      className="form-input" required
                    />
                    <button type="button" className="pwd-eye" onClick={() => setShowPwd(v => !v)}>
                      {showPwd ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Doorka Adminka <span className="req">*</span></label>
                  <div className="role-grid">
                    {ROLE_OPTIONS.map(opt => (
                      <button
                        key={opt.value} type="button"
                        className={`role-chip ${createRole === opt.value ? "active" : ""}`}
                        onClick={() => setCreateRole(opt.value)}
                      >
                        <span className="role-chip-icon">{opt.icon}</span>
                        <span className="role-chip-label">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="create-footer">
                <div className="selected-role-preview">
                  Doorashada: <strong>{roleLabel(createRole)}</strong>
                </div>
                <button type="submit" className="btn-create-submit" disabled={creating}>
                  {creating ? "Abuuraya..." : "✅ Abuur Admin"}
                </button>
              </div>

            </form>
          </div>
        )}

        {/* ── USERS TABLE ────────────────────────────────────── */}
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Magaca</th>
                <th>Email</th>
                <th>Doorka</th>
                <th>Taariikh</th>
                <th>Ficilada</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={5} className="empty-row">Wax user ah lama helin.</td></tr>
              )}
              {users.map((user) => {
                const protectedSuper = isProtectedSuperAdmin(user);
                const lockedPrimary = isPrimarySuperAdminEmail(user.email);
                return (
                <tr key={user.id} className={user.isAdmin ? "is-admin-row" : ""}>
                  <td>
                    <div className="user-name-cell">
                      <div className="avatar-mini" data-role={user.adminRole}>
                        {user.fullName?.[0]?.toUpperCase() || "U"}
                      </div>
                      <span>{user.fullName || "—"}</span>
                    </div>
                  </td>
                  <td className="email-cell">{user.email}</td>

                  {/* Role cell — shows inline editor when editing */}
                  <td>
                    {editingRole === user.id ? (
                      <div className="inline-role-editor">
                        <select
                          value={pendingRole}
                          onChange={e => setPendingRole(e.target.value)}
                          className="role-select"
                        >
                          {ROLE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.icon} {opt.label}
                            </option>
                          ))}
                        </select>
                        <button className="btn-save-role" onClick={() => applyRoleChange(user.id, pendingRole, user)}>✓</button>
                        <button className="btn-cancel-role" onClick={() => setEditingRole(null)}>✕</button>
                      </div>
                    ) : (
                      <span className={`role-pill ${user.isAdmin ? "admin" : "plain"}`}>
                        {user.isAdmin ? roleLabel(user.adminRole) : "User Caadi ah"}
                      </span>
                    )}
                  </td>

                  <td className="date-cell">{new Date(user.createdAt).toLocaleDateString("so-SO")}</td>

                  <td>
                    <div className="actions-group">
                      {!user.isAdmin && (
                        <button
                          className="btn-action edit"
                          onClick={() => promoteUser(user.id, "animals")}
                        >
                          ↑ Ka dhig Admin
                        </button>
                      )}
                      {/* Edit role */}
                      {user.isAdmin && !protectedSuper && user.email !== currentUser?.email && (
                        <button
                          className="btn-action edit"
                          onClick={() => { setEditingRole(user.id); setPendingRole(user.adminRole || "ALL"); }}
                        >
                          ✏️ Bedel Doorka
                        </button>
                      )}
                      {/* Demote */}
                      {user.isAdmin && !protectedSuper && user.email !== currentUser?.email && (
                        <button className="btn-action demote" onClick={() => demoteUser(user.id, user)}>
                          ↓ Ka Saar
                        </button>
                      )}
                      {/* Delete */}
                      {!protectedSuper && user.email !== currentUser?.email && (
                        <button className="btn-delete" onClick={() => deleteUser(user.id, user)}>
                          🗑️
                        </button>
                      )}
                      {lockedPrimary && (
                        <span className="protected-badge">🔒 Super Admin</span>
                      )}
                      {user.email === currentUser?.email && !lockedPrimary && (
                        <span className="you-badge">Adiga</span>
                      )}
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </main>

      <style jsx>{`
        .admin-wrapper {
          --bg-main:    #f8fafc;
          --bg-card:    #ffffff;
          --border:     #e2e8f0;
          --text-main:  #0f172a;
          --text-muted: #334155;
          --indigo:     #4f46e5;
          --indigo-dk:  #3730a3;
          --green:      #059669;
          min-height:100vh;
          background:var(--bg-main);
          color:var(--text-main);
          font-family:'Plus Jakarta Sans','Inter',sans-serif;
        }

        :global(.dark) .admin-wrapper {
          --bg-main:    #0a0f1e;
          --bg-card:    rgba(15,23,42,0.7);
          --border:     rgba(255,255,255,0.08);
          --text-main:  #f1f5f9;
          --text-muted: #94a3b8;
          --indigo:     #6366f1;
          --indigo-dk:  #4f46e5;
          --green:      #059669;
        }

        .admin-nav { background:var(--bg-card); border-bottom:1.5px solid var(--border); padding:0 40px; height:72px; display:flex; align-items:center; backdrop-filter:blur(16px); position:sticky; top:0; z-index:50; }
        .nav-container { width:100%; max-width:1300px; margin:0 auto; display:flex; justify-content:space-between; align-items:center; }
        .logo-group { display:flex; align-items:center; gap:12px; }
        .logo-group h1 { font-size:1.1rem; font-weight:800; color:#1e3a8a; letter-spacing:-0.4px; }
        :global(.dark) .logo-group h1 { color:#c7d2fe; }
        .nav-actions { display:flex; align-items:center; gap:14px; }
        .theme-toggle-wrap { width:170px; }
        .btn-back { background:var(--bg-main); border:1.5px solid var(--border); padding:9px 18px; border-radius:10px; font-weight:700; font-size:0.82rem; color:var(--text-main); cursor:pointer; transition:all 0.2s; }
        .btn-back:hover { background:var(--indigo); color:#fff; border-color:var(--indigo); }

        .main-content { max-width:1300px; margin:36px auto; padding:0 32px; }

        /* ── HEADER ─────────────────────── */
        .page-header { margin-bottom:28px; }
        .header-row { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
        .page-header h2 { font-size:2rem; font-weight:800; letter-spacing:-0.8px; color:var(--text-main); }
        .page-header p  { color:var(--text-muted); margin-top:4px; font-size:0.9rem; }

        .btn-create-toggle {
          background: linear-gradient(135deg, var(--indigo) 0%, var(--indigo-dk) 100%);
          color:#fff; border:none; padding:12px 24px; border-radius:14px;
          font-weight:800; font-size:0.88rem; cursor:pointer;
          box-shadow:0 6px 18px rgba(99,102,241,0.3);
          transition:all 0.25s; white-space:nowrap;
        }
        .btn-create-toggle:hover { transform:translateY(-2px); box-shadow:0 10px 24px rgba(99,102,241,0.4); }

        /* ── FLASH ──────────────────────── */
        .status-banner { padding:14px 20px; border-radius:14px; margin-bottom:22px; font-weight:700; font-size:0.9rem; text-align:center; }
        .status-banner.ok  { background:rgba(5,150,105,0.1); color:#059669; border:1px solid rgba(5,150,105,0.25); }
        .status-banner.err { background:rgba(239,68,68,0.1);  color:#ef4444; border:1px solid rgba(239,68,68,0.25); }

        /* ── CREATE CARD ────────────────── */
        .create-card { background:var(--bg-card); border:1.5px solid var(--border); border-radius:24px; padding:32px; margin-bottom:28px; box-shadow:0 8px 32px -8px rgba(0,0,0,0.08); animation:slideDown 0.25s ease; }
        @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        .create-title { font-size:1.1rem; font-weight:800; margin-bottom:24px; color:var(--text-main); }
        .create-form { display:flex; flex-direction:column; gap:20px; }
        .form-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        @media(max-width:680px){ .form-row { grid-template-columns:1fr; } }
        .form-group { display:flex; flex-direction:column; gap:8px; }
        .form-group label { font-size:0.78rem; font-weight:800; text-transform:uppercase; letter-spacing:0.6px; color:var(--text-muted); }
        .req { color:#ef4444; }
        .form-input { background:var(--bg-main); border:1.5px solid var(--border); border-radius:12px; padding:12px 16px; font-size:0.9rem; color:var(--text-main) !important; outline:none; width:100%; transition:all 0.2s; font-family:inherit; }
        .form-input::placeholder { color:#475569 !important; opacity:0.85 !important; }
        :global(.dark) .form-input::placeholder { color:#94a3b8 !important; opacity:0.7 !important; }
        .form-input:focus { border-color:var(--indigo); box-shadow:0 0 0 3px rgba(99,102,241,0.12); background:#ffffff; }
        :global(.dark) .form-input:focus { background:rgba(15,23,42,0.4); }

        .pwd-wrap { position:relative; }
        .pwd-wrap .form-input { padding-right:48px; }
        .pwd-eye { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; font-size:1.1rem; line-height:1; }

        /* Role chips */
        .role-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .role-chip { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:12px; border:2px solid var(--border); background:var(--bg-main); cursor:pointer; transition:all 0.2s; color:var(--text-main); font-size:0.82rem; font-weight:700; text-align:left; }
        .role-chip:hover { border-color:var(--indigo); background:rgba(99,102,241,0.05); }
        .role-chip.active { border-color:var(--indigo); background:rgba(99,102,241,0.12); color:var(--indigo); box-shadow:0 0 0 3px rgba(99,102,241,0.1); }
        .role-chip-icon { font-size:1.2rem; flex-shrink:0; }
        .role-chip-label { line-height:1.3; }

        .create-footer { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; border-top:1.5px solid var(--border); padding-top:20px; }
        .selected-role-preview { font-size:0.85rem; color:var(--text-muted); }
        .selected-role-preview strong { color:var(--indigo); }
        .btn-create-submit { background:linear-gradient(135deg, var(--green) 0%, #047857 100%); color:#fff; border:none; padding:13px 28px; border-radius:14px; font-weight:800; font-size:0.9rem; cursor:pointer; box-shadow:0 6px 18px rgba(5,150,105,0.3); transition:all 0.2s; }
        .btn-create-submit:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 24px rgba(5,150,105,0.4); }
        .btn-create-submit:disabled { opacity:0.6; cursor:not-allowed; }

        /* ── TABLE ──────────────────────── */
        .users-table-wrap { background:var(--bg-card); border:1.5px solid var(--border); border-radius:20px; overflow:hidden; box-shadow:0 8px 32px -12px rgba(0,0,0,0.06); }
        .users-table { width:100%; border-collapse:collapse; text-align:left; }
        .users-table th { background:var(--bg-main); padding:18px 20px; font-size:0.72rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; border-bottom:2px solid var(--border); letter-spacing:0.7px; }
        .users-table td { padding:18px 20px; border-bottom:1px solid var(--border); font-size:0.9rem; color:var(--text-main); vertical-align:middle; }
        .users-table tbody tr { transition:background 0.15s; }
        .users-table tbody tr:hover { background:rgba(99,102,241,0.025); }
        .users-table tbody tr:last-child td { border-bottom:none; }
        .users-table tr.is-admin-row { background:rgba(99,102,241,0.015); }

        .user-name-cell { display:flex; align-items:center; gap:12px; }
        .avatar-mini {
          width:36px; height:36px; border-radius:10px; display:flex; align-items:center;
          justify-content:center; font-weight:800; font-size:0.85rem; color:#fff; flex-shrink:0;
          background:linear-gradient(135deg,#6366f1,#4f46e5);
        }
        .avatar-mini[data-role="animals"]     { background:linear-gradient(135deg,#f59e0b,#d97706); }
        .avatar-mini[data-role="water"]       { background:linear-gradient(135deg,#0ea5e9,#0284c7); }
        .avatar-mini[data-role="electricity"] { background:linear-gradient(135deg,#a78bfa,#7c3aed); }

        .email-cell { color:var(--text-muted); font-size:0.85rem; }
        .date-cell  { color:var(--text-muted); font-size:0.82rem; }
        .empty-row  { text-align:center; color:var(--text-muted); padding:40px; }

        /* Role pill */
        .role-pill { padding:5px 13px; border-radius:50px; font-size:0.72rem; font-weight:800; display:inline-flex; align-items:center; gap:4px; border:1.5px solid transparent; white-space:nowrap; }
        .role-pill.admin { background:rgba(99,102,241,0.1); color:#4f46e5; border-color:rgba(99,102,241,0.2); }
        .role-pill.plain { background:rgba(100,116,139,0.08); color:#64748b; border-color:rgba(100,116,139,0.15); }

        /* Inline role editor */
        .inline-role-editor { display:flex; align-items:center; gap:6px; }
        .role-select { background:var(--bg-main); border:1.5px solid var(--indigo); border-radius:10px; padding:6px 10px; font-size:0.82rem; color:var(--text-main); outline:none; font-family:inherit; cursor:pointer; }
        .btn-save-role   { background:#059669; color:#fff; border:none; border-radius:8px; padding:6px 12px; font-weight:800; cursor:pointer; font-size:0.85rem; }
        .btn-cancel-role { background:var(--bg-main); color:var(--text-muted); border:1.5px solid var(--border); border-radius:8px; padding:6px 10px; font-weight:800; cursor:pointer; font-size:0.85rem; }
        .btn-save-role:hover   { background:#047857; }
        .btn-cancel-role:hover { background:#fee2e2; color:#ef4444; border-color:#fca5a5; }

        /* Action buttons */
        .actions-group { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .btn-action { padding:7px 14px; border-radius:10px; border:1.5px solid var(--border); font-weight:800; font-size:0.76rem; cursor:pointer; transition:all 0.2s; background:var(--bg-main); color:var(--text-main); }
        .btn-action.edit   { border-color:rgba(99,102,241,0.3); color:var(--indigo); background:rgba(99,102,241,0.06); }
        .btn-action.edit:hover { background:var(--indigo); color:#fff; border-color:var(--indigo); }
        .btn-action.demote:hover { background:#fee2e2; color:#ef4444; border-color:#fca5a5; }
        .btn-delete { padding:7px 12px; border-radius:10px; border:1.5px solid rgba(239,68,68,0.2); background:rgba(239,68,68,0.06); color:#ef4444; font-size:0.82rem; cursor:pointer; transition:all 0.2s; font-weight:800; }
        .btn-delete:hover { background:#ef4444; color:#fff; border-color:#ef4444; box-shadow:0 4px 12px rgba(239,68,68,0.2); }
        .you-badge { padding:5px 12px; border-radius:50px; background:rgba(5,150,105,0.1); color:#059669; border:1.5px solid rgba(5,150,105,0.2); font-size:0.72rem; font-weight:800; }
        .protected-badge { padding:5px 12px; border-radius:50px; background:rgba(245,158,11,0.12); color:#b45309; border:1.5px solid rgba(245,158,11,0.25); font-size:0.72rem; font-weight:800; white-space:nowrap; }

        /* Loader */
        .loader-screen { min-height:100vh; display:flex; justify-content:center; align-items:center; background:var(--bg-main); }
        .loader-orb { width:44px; height:44px; border:4px solid var(--border); border-top-color:var(--indigo); border-radius:50%; animation:spin 1s infinite linear; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* Dark tweaks */
        :global(.dark) .admin-nav { background:rgba(10,15,30,0.85) !important; backdrop-filter:blur(20px); }
        :global(.dark) .create-card { background:rgba(15,23,42,0.6) !important; backdrop-filter:blur(16px); box-shadow:0 20px 40px -20px rgba(0,0,0,0.5) !important; }
        :global(.dark) .users-table-wrap { background:rgba(15,23,42,0.6) !important; backdrop-filter:blur(12px); box-shadow:0 20px 40px -20px rgba(0,0,0,0.5) !important; }
        :global(.dark) .users-table th { background:rgba(10,15,30,0.5) !important; }
        :global(.dark) .role-pill.admin { background:rgba(99,102,241,0.18) !important; color:#a5b4fc !important; border-color:rgba(99,102,241,0.35) !important; }
        :global(.dark) .role-chip.active { color:#a5b4fc !important; }
        :global(.dark) .btn-action.edit { color:#a5b4fc !important; }
        :global(.dark) .status-banner.ok  { background:rgba(5,150,105,0.15) !important; color:#34d399 !important; }
        :global(.dark) .status-banner.err { background:rgba(239,68,68,0.15) !important; color:#f87171 !important; }

        @media (max-width: 768px) {
          .admin-nav {
            height: auto;
            padding: 15px 20px;
          }
          .nav-container {
            flex-direction: column;
            gap: 12px;
          }
          .nav-actions {
            width: 100%;
            justify-content: space-between;
          }
          .theme-toggle-wrap {
            width: 130px;
          }
          .main-content {
            margin: 20px auto;
            padding: 0 16px;
          }
          .page-header h2 {
            font-size: 1.6rem;
          }
          .header-row {
            flex-direction: column;
            align-items: stretch;
            gap: 15px;
          }
          .btn-create-toggle {
            width: 100%;
            text-align: center;
          }
          .create-card {
            padding: 20px;
          }
          .role-grid {
            grid-template-columns: 1fr;
          }
          .create-footer {
            flex-direction: column;
            align-items: stretch;
            gap: 15px;
          }
          .btn-create-submit {
            width: 100%;
          }
          .users-table-wrap {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .users-table {
            min-width: 600px;
          }
        }
      `}</style>
    </div>
  );
}
