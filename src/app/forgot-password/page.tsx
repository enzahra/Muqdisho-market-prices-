"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
// import { auth } from "../../lib/firebase";
// import { 
//   fetchSignInMethodsForEmail 
// } from "firebase/auth";

function ForgotPasswordContent() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1); // 1: Email, 2: New Password
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
   const [loading, setLoading] = useState(false);
   const router = useRouter();
   const searchParams = useSearchParams();
   const isAdmin = searchParams.get('type') === 'admin';

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError("Fadlan isticmaal email sax ah.");
        setLoading(false);
        return;
      }

      // Actual PostgreSQL check
      const response = await fetch('/api/auth/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || "Gmail-kan kuma dhex jiro website-ka. Fadlan marka hore Signup sameyso.");
        setLoading(false);
        return;
      }

      setStep(2);
    } catch {
      setError("Cilad ayaa dhacday. Fadlan mar kale isku day.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Password-yadu isma laha!");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password-ku waa inuu ka badnaadaa 6 xaraf.");
      return;
    }

    setLoading(true);

    try {
      // Actual PostgreSQL update
      const response = await fetch('/api/auth/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            newPassword: newPassword.trim(),
            forAdmin: isAdmin,
          })
      });

      if (!response.ok) throw new Error("Ma suuroobin in password-ka la beddelo.");
      
       setMessage("Waad guuleysatay! Password-kaagii waa la beddelay.");
       setTimeout(() => {
         router.push(isAdmin ? "/admin-login" : "/");
       }, 3000);
    } catch {
      setError("Ma suuroobin in password-ka la beddelo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#b58c82] via-[#c59a8e] to-[#a37a71] p-0 sm:p-6 transition-all duration-700">
      <div 
        className="w-full max-w-[420px] h-[100dvh] sm:h-[860px] bg-[#c59a8e]/95 backdrop-blur-md sm:rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative flex flex-col overflow-hidden border border-white/10"
        style={{ fontFamily: "'Plus Jakarta Sans', 'Nunito', sans-serif" }}>
        
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className={`flex-1 flex flex-col justify-center px-8 py-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

          <div className="text-center mb-12 px-4">
            <h1 className="text-[1.8rem] sm:text-[2.2rem] font-bold text-white mb-3 tracking-tight leading-tight">
              {step === 1 ? "Reset Password" : "New Password"}
            </h1>
            <p className="font-medium text-white/90 text-[0.8rem] sm:text-[0.85rem] tracking-wide">
              {step === 1 
                ? "Geli email-kaaga aad ku signup-garaysatay." 
                : `Hadda u samee password cusub email-ka ${email}`}
            </p>
          </div>

          <form onSubmit={step === 1 ? handleCheckEmail : handleResetPassword} className="flex flex-col gap-6 px-4">
            {step === 1 ? (
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  className="w-full bg-white/[0.12] border border-white/5 text-white placeholder-white/50 text-[0.85rem] rounded-2xl py-3 h-[60px] focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 transition-all font-medium shadow-inner"
                  placeholder="Geli Email-kaaga"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ WebkitAppearance: 'none', paddingLeft: '18px' }}
                />
              </div>
            ) : (
              <>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-white/[0.12] border border-white/5 text-white placeholder-white/50 text-[0.85rem] rounded-2xl py-3 h-[60px] focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 transition-all font-medium shadow-inner"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{ WebkitAppearance: 'none', paddingLeft: '18px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 1.053 0 2.062.18 3 .512M7.943 7.943A4 4 0 0112 8a4 4 0 014 4 4 4 0 01-.057.682m-1.398 3.02A4 4 0 0112 16a4 4 0 01-4-4 4 4 0 01.057-.682M3 3l18 18"/></svg>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    className="w-full bg-white/[0.12] border border-white/5 text-white placeholder-white/50 text-[0.85rem] rounded-2xl py-3 h-[60px] focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 transition-all font-medium shadow-inner"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ WebkitAppearance: 'none', paddingLeft: '18px' }}
                  />
                </div>
              </>
            )}

            {message && (
              <div className="bg-white/20 text-white p-4 rounded-2xl text-[0.8rem] font-bold text-center border border-white/20 animate-in fade-in zoom-in duration-300">
                {message}
              </div>
            )}

            {error && (
              <div className="text-[#ffefed] text-[0.8rem] font-bold text-center animate-in fade-in slide-in-from-bottom-1 duration-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-white text-[#b88c80] hover:bg-[#fcf9f8] font-bold py-3.5 h-[60px] rounded-2xl transition-all duration-500 text-[1.05rem] shadow-[0_10px_20px_rgba(0,0,0,0.1)] active:scale-[0.98] mt-2 relative overflow-hidden group"
              disabled={loading}
            >
              <div className="absolute inset-0 bg-black/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative z-10 uppercase tracking-widest text-[0.85rem]">
                {loading ? "Processing..." : (step === 1 ? "Next Step" : "Reset Now")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => step === 2 ? setStep(1) : router.push(isAdmin ? "/admin-login" : "/")}
              className="mt-4 text-[0.8rem] font-bold text-white hover:text-white/80 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <span>←</span> {step === 2 ? "Beddel Email-ka" : (isAdmin ? "Back to Admin Login" : "Back to Login")}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full flex items-center justify-center bg-[#c59a8e] text-white font-bold">Dallacaadda...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
