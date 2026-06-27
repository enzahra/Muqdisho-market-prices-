"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


export default function AdminLoginPage() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();


  const [emailFieldReady, setEmailFieldReady] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEmail("");
    setPassword("");
    const readyTimer = window.setTimeout(() => setEmailFieldReady(true), 150);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errParam = params.get("error");
      if (errParam) {
        setError(decodeURIComponent(errParam));
      }
    }
    return () => window.clearTimeout(readyTimer);
  }, []);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError("Fadlan isticmaal email sax ah (Tusaale: admin@example.com)");
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          forAdmin: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Cilad ayaa dhacday');
      }

      if (!data.user?.isAdmin) {
        throw new Error(
          'Koontadaadan ma ahan admin. Hubi email/password-ka aad super admin kuu abuuray.'
        );
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      router.push("/admin");

    } catch (err: any) {
      setError(err.message || "Email-ka ama Password-ka ayaa qaldan.");
    } finally {
      setLoading(false);
    }

  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#172554] p-0 sm:p-6 transition-all duration-700">
      {/* Mobile App Frame */}
      <div 
        className="w-full max-w-[420px] h-[100dvh] sm:h-[860px] bg-white/[0.1] backdrop-blur-2xl sm:rounded-[3rem] shadow-[0_24px_60px_rgba(15,23,42,0.55)] relative flex flex-col overflow-hidden border border-white/25 selection:bg-sky-400/30"
        style={{ fontFamily: "'Plus Jakarta Sans', 'Nunito', sans-serif" }}>
        
        {/* Animated Background Blob (Vibrant Theme) */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-sky-400/25 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-400/25 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-400/10 rounded-full blur-[90px]"></div>

        <div className={`flex-1 flex flex-col justify-between px-8 py-12 overflow-y-auto transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

          <div className="flex-1 flex flex-col justify-center mt-6">
            {/* Header */}
            <div className={`text-center mb-14 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              <div className="w-16 h-16 bg-gradient-to-br from-sky-500/20 to-indigo-600/20 border border-sky-400/40 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(56,189,248,0.35)]">
                <svg className="w-8 h-8 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-[2.2rem] font-black text-white mb-2 tracking-tight">
                System Access
              </h1>
              <p className="text-sky-300/90 text-xs tracking-[0.2em] uppercase font-black">
                Geli email-kaaga iyo password-kaaga
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleAdminAuth}
              className="flex flex-col mt-4"
              style={{ paddingLeft: '24px', paddingRight: '24px' }}
              autoComplete="off"
            >
              {/* Decoy fields — browsers often skip autofill on the real inputs below */}
              <input type="text" name="prevent_autofill_username" className="hidden" tabIndex={-1} aria-hidden="true" autoComplete="username" />
              <input type="password" name="prevent_autofill_password" className="hidden" tabIndex={-1} aria-hidden="true" autoComplete="current-password" />

              <div className={`relative mb-8 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} style={{ marginBottom: '24px' }}>
                <input
                  id="admin-access-email"
                  name="admin-access-email"
                  type="text"
                  inputMode="email"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  readOnly={!emailFieldReady}
                  onFocus={() => setEmailFieldReady(true)}
                  className="peer w-full bg-white/[0.08] border border-white/15 text-white placeholder-transparent text-[0.85rem] rounded-2xl py-3 h-[60px] focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400/50 focus:bg-white/[0.12] transition-all font-medium shadow-lg shadow-black/10"
                  placeholder="Email-kaaga"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ WebkitAppearance: 'none', paddingLeft: '18px', paddingTop: '18px' }}
                />
                <label 
                  htmlFor="admin-access-email"
                  className="absolute left-[18px] top-4 text-slate-300 text-[0.85rem] font-medium transition-all duration-200 pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-[0.85rem] peer-focus:top-2 peer-focus:text-[0.65rem] peer-focus:text-sky-300"
                  style={{ 
                    top: email ? '8px' : '18px',
                    fontSize: email ? '0.65rem' : '0.85rem',
                    opacity: email ? 1 : 0.7,
                    color: email ? '#7dd3fc' : '#cbd5e1'
                  }}
                >
                  Admin Email (Email-kaaga)
                </label>
              </div>

              <div className={`relative mb-8 transition-all duration-700 delay-[400ms] ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} style={{ marginBottom: '18px' }}>
                <input
                  id="admin-access-password"
                  name="admin-access-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  className="peer w-full bg-white/[0.08] border border-white/15 text-white placeholder-transparent text-[0.85rem] rounded-2xl py-3 h-[60px] focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400/50 focus:bg-white/[0.12] transition-all font-medium tracking-widest shadow-lg shadow-black/10 pr-14"
                  placeholder="Password-kaaga"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ WebkitAppearance: 'none', paddingLeft: '18px', paddingTop: '18px' }}
                />
                <label 
                  htmlFor="admin-access-password"
                  className="absolute left-[18px] text-slate-300 text-[0.85rem] font-medium transition-all duration-200 pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-[0.85rem] peer-focus:top-2 peer-focus:text-[0.65rem] peer-focus:text-sky-300"
                  style={{ 
                    top: password ? '8px' : '18px',
                    fontSize: password ? '0.65rem' : '0.85rem',
                    opacity: password ? 1 : 0.7,
                    color: password ? '#7dd3fc' : '#cbd5e1'
                  }}
                >
                  Password-kaaga
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[18px] text-slate-400 hover:text-sky-300 transition-colors p-2"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 1.053 0 2.062.18 3 .512M7.943 7.943A4 4 0 0112 8a4 4 0 014 4 4 4 0 01-.057.682m-1.398 3.02A4 4 0 0112 16a4 4 0 01-4-4 4 4 0 01.057-.682M3 3l18 18"/></svg>
                  )}
                </button>
              </div>

              <div className="flex justify-end mb-6 -mt-3 px-1 transition-all duration-700 delay-[450ms]">
                <button
                  type="button"
                  onClick={() => router.push("/forgot-password?type=admin")}
                  className="text-[0.7rem] font-bold text-slate-400 hover:text-sky-300 transition-all underline decoration-white/15 underline-offset-4"
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="text-red-300 mb-12 text-[0.8rem] font-bold text-center animate-in fade-in slide-in-from-bottom-1 duration-300 bg-red-500/10 border border-red-400/25 rounded-xl py-3 px-4">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-sky-400 to-sky-300 text-[#0f172a] hover:from-sky-300 hover:to-sky-200 font-bold py-3.5 h-[60px] rounded-2xl transition-all duration-500 text-[1.05rem] shadow-[0_12px_32px_rgba(56,189,248,0.4)] active:scale-[0.98] mt-2 relative overflow-hidden group"
                disabled={loading}
              >
                <div className="absolute inset-0 bg-white/25 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative z-10 transition-colors tracking-[0.2em] text-[0.85rem] uppercase font-black">
                  {loading ? "Decrypting..." : "Unlock System"}
                </span>
              </button>

              <p className="text-center text-[0.68rem] text-slate-400 mt-5 px-2 leading-relaxed">
                Admin cusub waxaa abuuri kara super admin kaliya (User Management).
              </p>
            </form>
          </div>

          {/* Bottom Back Link */}
          <div className="mt-8 pb-4 text-center">
            <a href="/" className="text-[0.7rem] font-bold text-slate-500 hover:text-sky-200 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
              <span>←</span> Return to Public Node
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
 