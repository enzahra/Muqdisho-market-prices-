"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Droplets,
  FileText,
  LayoutGrid,
  Lightbulb,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

type VisitorGuideModalProps = {
  open: boolean;
  onClose: () => void;
};

type GuideTheme = "intro" | "livestock" | "water" | "report" | "electricity" | "tips";

type GuideStep = {
  id: string;
  theme: GuideTheme;
  navLabel: string;
  stepLabel: string;
  title: string;
  simpleLine: string;
  body: string;
  actions: { num: number; text: string }[];
  tip?: string;
  image?: string;
  imageAlt?: string;
};

const GUIDE_STEPS: GuideStep[] = [
  {
    id: "intro",
    theme: "intro",
    navLabel: "Bilow",
    stepLabel: "Bilow",
    title: "Ku soo dhawoow!",
    simpleLine: "Qiimaha rasmiga ah ee Muqdisho — si fudud, bilaash, Af-Soomaali.",
    body: "Ma u baahnid diiwaangelin. Dooro waxaad rabto, raac tallaabooyinkan.",
    actions: [
      { num: 1, text: "Xoolaha — Geel, Lo', Ari'" },
      { num: 2, text: "Biyaha — qiimo + xisaabiyaha biilka" },
      { num: 3, text: "Korontada — 3 nooc + xisaabiyaha" },
      { num: 4, text: "Warbixin — daabac qiimaha sanadlaha ah" },
    ],
    tip: "Riix «Bilow» ama dooro tallaabo bidix si aad u socoto.",
  },
  {
    id: "sidebar",
    theme: "intro",
    navLabel: "Doorashada",
    stepLabel: "Tallaabo 1",
    title: "Dooro qaybta",
    simpleLine: "Bidix waxaa ku yaal saddex qaybood — riix mid kasta.",
    body: "Doorashada qaybta ayaa ku tusaysa qiimaha la xiriira.",
    actions: [
      { num: 1, text: "Sicirka xoolaha → Geel, Lo', Ari'" },
      { num: 2, text: "Sicirka Biyaha → shirkadaha biyaha" },
      { num: 3, text: "Sicirka Korontada → shirkadaha korontada" },
    ],
    image: "/images/guide/01-sidebar.png",
    imageAlt: "Sidebar-ka iyo saddexda qaybood",
    tip: "Qaybta la doortay waxay iftiiminaysaa buluug.",
  },
  {
    id: "livestock",
    theme: "livestock",
    navLabel: "Xoolaha",
    stepLabel: "Tallaabo 2",
    title: "Sicirka xoolaha",
    simpleLine: "Dooro nooca, riix «Guji», eeg qiimaha.",
    body: "Saddex kaar: Geel, Lo', Ari'. Kaarka kasta wuxuu muujinayaa qiimaha rasmiga ah.",
    actions: [
      { num: 1, text: "Dooro Geel, Lo', ama Ari'" },
      { num: 2, text: "Riix «Guji» ee kaarka" },
      { num: 3, text: "Dooro Birimo ama Sugunto" },
      { num: 4, text: "Reports → daabac warbixin" },
    ],
    image: "/images/guide/02-xoolaha.png",
    imageAlt: "Kaararka Geel, Lo' iyo Ari'",
    tip: "Isticmaal «Raadi...» si aad si degdeg ah u hesho nooc.",
  },
  {
    id: "water",
    theme: "water",
    navLabel: "Biyaha",
    stepLabel: "Tallaabo 3",
    title: "Sicirka biyaha",
    simpleLine: "Eeg qiimaha shirkadda, riix «Xisaabi» biilkaaga.",
    body: "Qiimaha waa $/m³. Xisaabiyuhu wuxuu ku caawinayaa inaad ogaato inta aad bixin doontid.",
    actions: [
      { num: 1, text: "Eeg magaca shirkadda iyo qiimaha" },
      { num: 2, text: "Riix «Xisaabi»" },
      { num: 3, text: "Geli CR (hadda) iyo LR (hore)" },
      { num: 4, text: "Biilka = (CR − LR) × qiimaha" },
    ],
    image: "/images/guide/03-biyaha.png",
    imageAlt: "Kaararka shirkadaha biyaha",
    tip: "Tusaale: CR=150, LR=120 → 30 m³ la isticmaalay.",
  },
  {
    id: "report",
    theme: "report",
    navLabel: "Warbixin",
    stepLabel: "Tallaabo 4",
    title: "Warbixin & daabacaad",
    simpleLine: "Dooro shirkad, riix «Reports», daabac.",
    body: "Waxaad daabici kartaa hal sanad ama dhammaan sanadaha.",
    actions: [
      { num: 1, text: "Dooro shirkadda" },
      { num: 2, text: "Riix 📄 Reports" },
      { num: 3, text: "Dooro sanad ama dhammaan" },
      { num: 4, text: "Daabac ama keydi warbixinta" },
    ],
    image: "/images/guide/04-warbixin-biyaha.png",
    imageAlt: "Modal-ka warbixinta",
    tip: "Warbixintu waa ku habboon daabacaad ama wadaag.",
  },
  {
    id: "electricity",
    theme: "electricity",
    navLabel: "Korontada",
    stepLabel: "Tallaabo 5",
    title: "Sicirka korontada",
    simpleLine: "3 qiimo shirkad kasta — xisaabi biilka kWh.",
    body: "Home Guri, Laamo badan, Hal laan. Dooro noocaaga ka hor xisaabinta.",
    actions: [
      { num: 1, text: "Eeg saddexda qiimo ($/kWh)" },
      { num: 2, text: "Riix «Xisaabi» + dooro nooca" },
      { num: 3, text: "Geli CR iyo LR mitirka" },
      { num: 4, text: "Biilka = (CR − LR) × qiimaha" },
    ],
    image: "/images/guide/05-korontada.png",
    imageAlt: "Kaararka shirkadaha korontada",
    tip: "Dooro qiimaha ku habboon gurigaaga ama shirkaddaada.",
  },
  {
    id: "tips",
    theme: "tips",
    navLabel: "Dhammaad",
    stepLabel: "Dhammaad",
    title: "Waad diyaar tahay!",
    simpleLine: "Hadda isticmaal dashboard-ka si xor ah.",
    body: "Talooyin yar oo kaa caawin doona:",
    actions: [
      { num: 1, text: "Raadi — sanduuqa «Raadi...» kore" },
      { num: 2, text: "Mugdi/Iftiin — hoos sidebar-ka" },
      { num: 3, text: "Qiimayaasha waa kuwa rasmiga ah" },
      { num: 4, text: "CR = akhriska hadda · LR = akhriskii hore" },
    ],
    tip: "Dib u fur hagahan markaad u baahato.",
  },
];

const THEME: Record<
  GuideTheme,
  { accent: string; accent2: string; soft: string; glow: string; icon: ReactNode }
> = {
  intro: {
    accent: "#0ea5e9",
    accent2: "#6366f1",
    soft: "#f0f9ff",
    glow: "rgba(14,165,233,0.35)",
    icon: <Sparkles size={17} strokeWidth={2.2} />,
  },
  livestock: {
    accent: "#16a34a",
    accent2: "#059669",
    soft: "#f0fdf4",
    glow: "rgba(22,163,74,0.3)",
    icon: <span className="vg-emoji">🐄</span>,
  },
  water: {
    accent: "#0284c7",
    accent2: "#0ea5e9",
    soft: "#e0f2fe",
    glow: "rgba(2,132,199,0.35)",
    icon: <Droplets size={17} strokeWidth={2.2} />,
  },
  report: {
    accent: "#7c3aed",
    accent2: "#a855f7",
    soft: "#f5f3ff",
    glow: "rgba(124,58,237,0.35)",
    icon: <FileText size={17} strokeWidth={2.2} />,
  },
  electricity: {
    accent: "#d97706",
    accent2: "#f59e0b",
    soft: "#fffbeb",
    glow: "rgba(217,119,6,0.35)",
    icon: <Zap size={17} strokeWidth={2.2} />,
  },
  tips: {
    accent: "#059669",
    accent2: "#10b981",
    soft: "#ecfdf5",
    glow: "rgba(5,150,105,0.35)",
    icon: <Lightbulb size={17} strokeWidth={2.2} />,
  },
};

const NAV_ICONS: ReactNode[] = [
  <Sparkles key="i" size={16} />,
  <LayoutGrid key="s" size={16} />,
  <span key="l" className="vg-emoji">🐄</span>,
  <Droplets key="w" size={16} />,
  <FileText key="r" size={16} />,
  <Zap key="e" size={16} />,
  <Check key="t" size={16} />,
];

export function VisitorGuideModal({ open, onClose }: VisitorGuideModalProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && stepIndex < GUIDE_STEPS.length - 1) setStepIndex((i) => i + 1);
      if (e.key === "ArrowLeft" && stepIndex > 0) setStepIndex((i) => i - 1);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, stepIndex]);

  if (!open || typeof document === "undefined") return null;

  const step = GUIDE_STEPS[stepIndex];
  const t = THEME[step.theme];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === GUIDE_STEPS.length - 1;
  const progress = ((stepIndex + 1) / GUIDE_STEPS.length) * 100;

  return createPortal(
    <div className="vg-overlay" role="presentation" onClick={onClose}>
      <div
        className="vg-shell"
        role="dialog"
        aria-modal="true"
        aria-label="Hagaha booqdayaasha"
        onClick={(e) => e.stopPropagation()}
        style={{ "--vg-accent": t.accent, "--vg-accent2": t.accent2, "--vg-soft": t.soft, "--vg-glow": t.glow } as React.CSSProperties}
      >
        {/* Left rail — step navigation */}
        <aside className="vg-rail">
          <div className="vg-rail-brand">
            <div className="vg-rail-logo">
              <BookOpen size={20} strokeWidth={2.2} />
            </div>
            <div>
              <strong>Hagaha</strong>
              <span>Tilmaamaha</span>
            </div>
          </div>

          <nav className="vg-rail-nav" aria-label="Tallaabooyinka">
            {GUIDE_STEPS.map((s, i) => {
              const st = THEME[s.theme];
              const active = i === stepIndex;
              const done = i < stepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`vg-rail-item${active ? " is-active" : ""}${done ? " is-done" : ""}`}
                  onClick={() => setStepIndex(i)}
                  aria-current={active ? "step" : undefined}
                  style={active ? { borderColor: st.accent, background: st.soft } : undefined}
                >
                  <span
                    className="vg-rail-dot"
                    style={
                      active || done
                        ? { background: `linear-gradient(135deg, ${st.accent}, ${st.accent2})`, color: "#fff", borderColor: "transparent" }
                        : undefined
                    }
                  >
                    {done ? <Check size={12} strokeWidth={3} /> : NAV_ICONS[i]}
                  </span>
                  <span className="vg-rail-label">{s.navLabel}</span>
                </button>
              );
            })}
          </nav>

          <div className="vg-rail-progress">
            <div className="vg-rail-progress-bar">
              <div className="vg-rail-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>{stepIndex + 1} / {GUIDE_STEPS.length}</span>
          </div>
        </aside>

        {/* Main panel */}
        <div className="vg-main">
          <button type="button" className="vg-close" aria-label="Xir" onClick={onClose}>
            <X size={20} strokeWidth={2.5} />
          </button>

          <div className="vg-hero">
            <div className="vg-hero-blob vg-hero-blob-a" />
            <div className="vg-hero-blob vg-hero-blob-b" />
            <div className="vg-hero-inner">
              <span className="vg-hero-badge">{step.stepLabel}</span>
              <div className="vg-hero-icon">{t.icon}</div>
              <h2>{step.title}</h2>
              <p>{step.simpleLine}</p>
            </div>
          </div>

          <div className="vg-content" key={step.id}>
            <div className={`vg-split${step.image ? " has-image" : ""}`}>
              <div className="vg-copy">
                <p className="vg-lead">{step.body}</p>

                {stepIndex === 0 && (
                  <div className="vg-pills">
                    <div className="vg-pill vg-pill-green">
                      <span>🐄</span>
                      <div><strong>Xoolaha</strong><small>Geel · Lo&apos; · Ari&apos;</small></div>
                    </div>
                    <div className="vg-pill vg-pill-blue">
                      <span>💧</span>
                      <div><strong>Biyaha</strong><small>Qiimo + Xisaabi</small></div>
                    </div>
                    <div className="vg-pill vg-pill-amber">
                      <span>⚡</span>
                      <div><strong>Korontada</strong><small>3 nooc + Xisaabi</small></div>
                    </div>
                  </div>
                )}

                <div className="vg-steps-list">
                  {step.actions.map((a) => (
                    <div key={a.num} className="vg-step-row">
                      <span className="vg-step-num">{a.num}</span>
                      <span className="vg-step-text">{a.text}</span>
                    </div>
                  ))}
                </div>

                {step.tip && (
                  <div className="vg-callout">
                    <Lightbulb size={18} strokeWidth={2.2} />
                    <p>{step.tip}</p>
                  </div>
                )}
              </div>

              {step.image && (
                <figure className="vg-frame">
                  <div className="vg-frame-bar">
                    <span /><span /><span />
                    <em>Muqdisho Market Prices</em>
                  </div>
                  <div className="vg-frame-img">
                    <Image
                      src={step.image}
                      alt={step.imageAlt || step.title}
                      width={900}
                      height={520}
                      quality={92}
                      className="vg-shot"
                    />
                  </div>
                  {step.imageAlt && <figcaption>{step.imageAlt}</figcaption>}
                </figure>
              )}
            </div>
          </div>

          <footer className="vg-foot">
            <button type="button" className="vg-btn vg-btn-ghost" disabled={isFirst} onClick={() => setStepIndex((i) => i - 1)}>
              <ChevronLeft size={18} />
              Dib
            </button>
            {isLast ? (
              <button type="button" className="vg-btn vg-btn-primary" onClick={onClose}>
                <Check size={18} strokeWidth={2.5} />
                Fahamtay!
              </button>
            ) : (
              <button type="button" className="vg-btn vg-btn-primary" onClick={() => setStepIndex((i) => i + 1)}>
                {isFirst ? "Bilow" : "Xiga"}
                <ChevronRight size={18} />
              </button>
            )}
          </footer>
        </div>
      </div>

      <style jsx global>{`
        .vg-overlay {
          position: fixed;
          inset: 0;
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(8, 15, 30, 0.72);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .vg-shell {
          --vg-accent: #0ea5e9;
          --vg-accent2: #6366f1;
          --vg-soft: #f0f9ff;
          --vg-glow: rgba(14,165,233,0.35);
          display: grid;
          grid-template-columns: 220px 1fr;
          width: min(920px, 100%);
          max-height: min(92vh, 820px);
          border-radius: 24px;
          overflow: hidden;
          background: #fff;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.08),
            0 32px 80px -24px rgba(0,0,0,0.55),
            0 0 60px var(--vg-glow);
          animation: vgPop 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes vgPop {
          from { opacity: 0; transform: scale(0.94) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .vg-rail {
          display: flex;
          flex-direction: column;
          padding: 20px 14px 16px;
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
          border-right: 1px solid rgba(255,255,255,0.06);
        }
        .vg-rail-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 6px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 14px;
        }
        .vg-rail-logo {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--vg-accent), var(--vg-accent2));
          color: #fff;
          box-shadow: 0 4px 16px var(--vg-glow);
        }
        .vg-rail-brand strong {
          display: block;
          font-size: 0.82rem;
          font-weight: 800;
          color: #f8fafc;
          line-height: 1.2;
        }
        .vg-rail-brand span {
          font-size: 0.68rem;
          font-weight: 600;
          color: #94a3b8;
        }
        .vg-rail-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
        }
        .vg-rail-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 12px;
          border: 1.5px solid transparent;
          background: transparent;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
        }
        .vg-rail-item:hover:not(.is-active) {
          background: rgba(255,255,255,0.05);
        }
        .vg-rail-item.is-active {
          transform: translateX(3px);
        }
        .vg-rail-dot {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.1);
          color: #94a3b8;
          font-size: 0.85rem;
        }
        .vg-rail-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #cbd5e1;
        }
        .vg-rail-item.is-active .vg-rail-label { color: #f1f5f9; }
        .vg-rail-item.is-done .vg-rail-label { color: #64748b; }
        .vg-rail-progress {
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .vg-rail-progress-bar {
          height: 4px;
          border-radius: 999px;
          background: rgba(255,255,255,0.1);
          overflow: hidden;
          margin-bottom: 6px;
        }
        .vg-rail-progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--vg-accent), var(--vg-accent2));
          transition: width 0.4s ease;
        }
        .vg-rail-progress span {
          font-size: 0.65rem;
          font-weight: 700;
          color: #64748b;
        }
        .vg-main {
          display: flex;
          flex-direction: column;
          min-width: 0;
          position: relative;
          background: #fafbfc;
        }
        .vg-close {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 5;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(8px);
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          transition: background 0.15s, color 0.15s, transform 0.15s;
        }
        .vg-close:hover { background: #fff; color: #0f172a; transform: scale(1.05); }
        .vg-hero {
          position: relative;
          overflow: hidden;
          padding: 28px 28px 22px;
          background: linear-gradient(135deg, var(--vg-accent) 0%, var(--vg-accent2) 100%);
          flex-shrink: 0;
        }
        .vg-hero-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.45;
          pointer-events: none;
        }
        .vg-hero-blob-a { width: 180px; height: 180px; top: -60px; right: -40px; background: #fff; }
        .vg-hero-blob-b { width: 120px; height: 120px; bottom: -40px; left: 20%; background: rgba(255,255,255,0.5); }
        .vg-hero-inner {
          position: relative;
          z-index: 1;
          padding-right: 36px;
        }
        .vg-hero-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.22);
          backdrop-filter: blur(4px);
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #fff;
          margin-bottom: 10px;
        }
        .vg-hero-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 1.2rem;
          margin-bottom: 10px;
          border: 1px solid rgba(255,255,255,0.25);
        }
        .vg-hero h2 {
          margin: 0 0 6px;
          font-size: 1.55rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        .vg-hero p {
          margin: 0;
          font-size: 0.92rem;
          font-weight: 600;
          color: rgba(255,255,255,0.92);
          line-height: 1.45;
          max-width: 420px;
        }
        .vg-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          animation: vgSlide 0.3s ease;
        }
        @keyframes vgSlide {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .vg-split { display: flex; flex-direction: column; gap: 18px; }
        .vg-split.has-image {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: start;
        }
        .vg-lead {
          margin: 0 0 14px;
          font-size: 0.88rem;
          line-height: 1.6;
          color: #64748b;
          font-weight: 600;
        }
        .vg-pills {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        .vg-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1.5px solid transparent;
        }
        .vg-pill span:first-child { font-size: 1.4rem; line-height: 1; }
        .vg-pill strong { display: block; font-size: 0.82rem; font-weight: 800; color: #0f172a; }
        .vg-pill small { font-size: 0.68rem; font-weight: 600; color: #64748b; }
        .vg-pill-green { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-color: #bbf7d0; }
        .vg-pill-blue { background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-color: #bae6fd; }
        .vg-pill-amber { background: linear-gradient(135deg, #fffbeb, #fef3c7); border-color: #fde68a; }
        .vg-steps-list {
          display: flex;
          flex-direction: column;
          gap: 0;
          position: relative;
        }
        .vg-steps-list::before {
          content: "";
          position: absolute;
          left: 15px;
          top: 20px;
          bottom: 20px;
          width: 2px;
          background: linear-gradient(180deg, var(--vg-accent), var(--vg-accent2));
          opacity: 0.25;
          border-radius: 2px;
        }
        .vg-step-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
        }
        .vg-step-num {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 900;
          color: #fff;
          background: linear-gradient(135deg, var(--vg-accent), var(--vg-accent2));
          box-shadow: 0 3px 10px var(--vg-glow);
          position: relative;
          z-index: 1;
        }
        .vg-step-text {
          font-size: 0.84rem;
          font-weight: 700;
          color: #334155;
          line-height: 1.4;
        }
        .vg-callout {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 14px;
          background: var(--vg-soft);
          border: 1.5px solid color-mix(in srgb, var(--vg-accent) 30%, transparent);
          color: var(--vg-accent);
        }
        .vg-callout p {
          margin: 0;
          font-size: 0.8rem;
          font-weight: 700;
          line-height: 1.5;
        }
        .vg-frame {
          margin: 0;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          background: #fff;
          box-shadow: 0 12px 40px -8px rgba(15,23,42,0.18);
        }
        .vg-frame-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          background: linear-gradient(180deg, #f8fafc, #f1f5f9);
          border-bottom: 1px solid #e2e8f0;
        }
        .vg-frame-bar span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #cbd5e1;
        }
        .vg-frame-bar span:nth-child(1) { background: #fca5a5; }
        .vg-frame-bar span:nth-child(2) { background: #fde047; }
        .vg-frame-bar span:nth-child(3) { background: #86efac; }
        .vg-frame-bar em {
          margin-left: auto;
          font-size: 0.62rem;
          font-weight: 700;
          font-style: normal;
          color: #94a3b8;
        }
        .vg-frame-img { background: #f1f5f9; line-height: 0; }
        .vg-frame :global(.vg-shot) {
          width: 100% !important;
          height: auto !important;
          display: block;
          object-fit: contain !important;
        }
        .vg-frame figcaption {
          padding: 8px 12px;
          font-size: 0.68rem;
          font-weight: 700;
          color: #64748b;
          text-align: center;
          background: #fafafa;
          border-top: 1px solid #f1f5f9;
        }
        .vg-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 24px 18px;
          border-top: 1px solid #e2e8f0;
          background: #fff;
          flex-shrink: 0;
        }
        .vg-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 22px;
          border-radius: 14px;
          border: none;
          font-size: 0.88rem;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
        }
        .vg-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .vg-btn-ghost {
          background: #f1f5f9;
          color: #475569;
          border: 1.5px solid #e2e8f0;
        }
        .vg-btn-ghost:not(:disabled):hover { background: #e2e8f0; }
        .vg-btn-primary {
          margin-left: auto;
          color: #fff;
          background: linear-gradient(135deg, var(--vg-accent), var(--vg-accent2));
          box-shadow: 0 6px 20px var(--vg-glow);
        }
        .vg-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px var(--vg-glow);
        }
        .vg-emoji { font-size: 0.95rem; line-height: 1; }

        html.dark .vg-shell { background: #0f172a; }
        html.dark .vg-main { background: #0f172a; }
        html.dark .vg-lead { color: #94a3b8; }
        html.dark .vg-step-text { color: #cbd5e1; }
        html.dark .vg-pill strong { color: #f1f5f9; }
        html.dark .vg-foot { background: #1e293b; border-color: #334155; }
        html.dark .vg-btn-ghost { background: #1e293b; border-color: #334155; color: #cbd5e1; }
        html.dark .vg-frame { border-color: #334155; background: #1e293b; }
        html.dark .vg-frame-bar { background: #0f172a; border-color: #334155; }
        html.dark .vg-frame figcaption { background: #1e293b; color: #94a3b8; }

        @media (max-width: 720px) {
          .vg-shell {
            grid-template-columns: 1fr;
            max-height: 96vh;
          }
          .vg-rail {
            flex-direction: row;
            flex-wrap: nowrap;
            overflow-x: auto;
            padding: 12px;
            gap: 0;
            border-right: none;
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          .vg-rail-brand, .vg-rail-progress { display: none; }
          .vg-rail-nav {
            flex-direction: row;
            gap: 6px;
            overflow-x: auto;
          }
          .vg-rail-item {
            flex-direction: column;
            gap: 4px;
            padding: 8px 10px;
            min-width: 64px;
          }
          .vg-rail-label { font-size: 0.62rem; text-align: center; }
          .vg-hero { padding: 22px 20px 18px; }
          .vg-hero h2 { font-size: 1.25rem; }
          .vg-split.has-image { grid-template-columns: 1fr; }
          .vg-content { padding: 16px; }
          .vg-foot { padding: 12px 16px 16px; }
        }
      `}</style>
    </div>,
    document.body
  );
}
