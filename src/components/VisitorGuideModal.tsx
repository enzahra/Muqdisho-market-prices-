"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ArrowLeft, ArrowRight, BookOpen, Check, Hand, X } from "lucide-react";

type VisitorGuideModalProps = {
  open: boolean;
  onClose: () => void;
};

type Slide = {
  id: string;
  emoji: string;
  color: string;
  bg: string;
  tag: string;
  title: string;
  subtitle: string;
  steps: string[];
  tip?: string;
  image?: string;
};

const SLIDES: Slide[] = [
  {
    id: "welcome",
    emoji: "👋",
    color: "#2563eb",
    bg: "linear-gradient(160deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)",
    tag: "Bilow",
    title: "Ku soo dhawoow!",
    subtitle:
      "Halkan waxaad ka helaysaa qiimaha rasmiga ah ee xoolaha, biyaha, iyo korontada Muqdisho. Ma u baahnid diiwaangelin.",
    steps: [
      "🐄 Xoolaha — Geel, Lo', Ari'",
      "💧 Biyaha — qiimaha shirkadaha + xisaabiyaha",
      "⚡ Korontada — qiimaha kWh + xisaabiyaha",
    ],
    tip: "Riix «Xiga» si aad tallaabo kasta u aragto.",
  },
  {
    id: "pick",
    emoji: "👈",
    color: "#4f46e5",
    bg: "linear-gradient(160deg, #eef2ff 0%, #e0e7ff 100%)",
    tag: "Tallaabo 1",
    title: "Dooro qaybta",
    subtitle: "Bidix (sidebar) waxaa ku yaal saddex qaybood. Riix mid kasta si aad u gasho.",
    steps: [
      "Riix «Sicirka xoolaha» → Geel, Lo', Ari'",
      "Riix «Sicirka Biyaha» → shirkadaha biyaha",
      "Riix «Sicirka Korontada» → shirkadaha korontada",
    ],
    image: "/images/guide/01-sidebar.png",
    tip: "Qaybta aad doorato waxay iftiiminaysaa buluug.",
  },
  {
    id: "livestock",
    emoji: "🐄",
    color: "#16a34a",
    bg: "linear-gradient(160deg, #f0fdf4 0%, #dcfce7 100%)",
    tag: "Tallaabo 2",
    title: "Xoolaha",
    subtitle: "Dooro nooca xoolaha, riix «Guji», kadib eeg qiimaha Birimo ama Sugunto.",
    steps: [
      "Dooro Geel, Lo', ama Ari'",
      "Riix badhanka «Guji»",
      "Eeg qiimaha · Riix «Reports» haddii aad daabacdo",
    ],
    image: "/images/guide/02-xoolaha.png",
  },
  {
    id: "water",
    emoji: "💧",
    color: "#0284c7",
    bg: "linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%)",
    tag: "Tallaabo 3",
    title: "Biyaha",
    subtitle: "Eeg qiimaha shirkadda ($/m³). Riix «Xisaabi» si aad biilkaaga u ogaato.",
    steps: [
      "Dooro shirkadda biyaha",
      "Riix «Xisaabi»",
      "Geli CR (hadda) iyo LR (hore)",
      "Biilka = (CR − LR) × qiimaha",
    ],
    image: "/images/guide/03-biyaha.png",
    tip: "Tusaale: CR=150, LR=120 → 30 m³ × qiimaha = biilkaaga",
  },
  {
    id: "electricity",
    emoji: "⚡",
    color: "#d97706",
    bg: "linear-gradient(160deg, #fffbeb 0%, #fef3c7 100%)",
    tag: "Tallaabo 4",
    title: "Korontada",
    subtitle: "Shirkad kasta waxay leedahay 3 qiimo: Guri, Laamo badan, Hal laan.",
    steps: [
      "Dooro shirkadda korontada",
      "Riix «Xisaabi» + dooro noocaaga",
      "Geli CR iyo LR mitirka",
      "Biilka = (CR − LR) × qiimaha kWh",
    ],
    image: "/images/guide/05-korontada.png",
  },
  {
    id: "report",
    emoji: "📄",
    color: "#7c3aed",
    bg: "linear-gradient(160deg, #f5f3ff 0%, #ede9fe 100%)",
    tag: "Tallaabo 5",
    title: "Warbixin",
    subtitle: "Markaad shirkad doorato, riix «Reports» si aad u daabacdo qiimaha sanadlaha ah.",
    steps: [
      "Dooro shirkadda",
      "Riix 📄 Reports",
      "Dooro sanad · Daabac warbixinta",
    ],
    image: "/images/guide/04-warbixin-biyaha.png",
  },
  {
    id: "done",
    emoji: "🎉",
    color: "#059669",
    bg: "linear-gradient(160deg, #ecfdf5 0%, #d1fae5 100%)",
    tag: "Dhammaad",
    title: "Waad diyaar tahay!",
    subtitle: "Hadda waxaad isticmaali kartaa dashboard-ka si fudud.",
    steps: [
      "🔍 Raadi — sanduuqa «Raadi...» kore",
      "🌙 Beddel mugdi/iftiin — hoos sidebar-ka",
      "💲 Qiimayaasha waa kuwa rasmiga ah ee nidaamka",
    ],
    tip: "Dib u fur hagahan markaad u baahato.",
  },
];

export function VisitorGuideModal({ open, onClose }: VisitorGuideModalProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setIndex(0);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < SLIDES.length - 1) setIndex((i) => i + 1);
      if (e.key === "ArrowLeft" && index > 0) setIndex((i) => i - 1);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, index]);

  if (!open || typeof document === "undefined") return null;

  const slide = SLIDES[index];
  const isFirst = index === 0;
  const isLast = index === SLIDES.length - 1;

  return createPortal(
    <div className="hg-overlay" onClick={onClose} role="presentation">
      <div
        className="hg-card"
        role="dialog"
        aria-modal="true"
        aria-label="Hagaha isticmaalka"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="hg-top">
          <div className="hg-brand">
            <BookOpen size={18} strokeWidth={2.5} />
            <span>Hagaha & Tilmaamaha</span>
          </div>
          <button type="button" className="hg-x" onClick={onClose} aria-label="Xir">
            <X size={20} />
          </button>
        </div>

        {/* Progress segments */}
        <div className="hg-segments" aria-hidden="true">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`hg-seg${i === index ? " on" : ""}${i < index ? " done" : ""}`}
              style={i <= index ? { background: slide.color } : undefined}
              onClick={() => setIndex(i)}
              aria-label={`Tallaabo ${i + 1}`}
            />
          ))}
        </div>

        {/* Slide body */}
        <div className="hg-body" key={slide.id} style={{ background: slide.bg }}>
          <div className="hg-slide-head">
            <span className="hg-emoji">{slide.emoji}</span>
            <span className="hg-tag" style={{ color: slide.color, background: `${slide.color}18` }}>
              {slide.tag}
            </span>
            <h2>{slide.title}</h2>
            <p className="hg-sub">{slide.subtitle}</p>
          </div>

          {slide.image ? (
            <div className="hg-visual">
              <Image
                src={slide.image}
                alt={slide.title}
                width={880}
                height={500}
                quality={90}
                className="hg-img"
                priority={index <= 1}
              />
            </div>
          ) : index === 0 ? (
            <div className="hg-tiles">
              <div className="hg-tile hg-tile-green">
                <span>🐄</span>
                <strong>Xoolaha</strong>
                <small>Geel · Lo&apos; · Ari&apos;</small>
              </div>
              <div className="hg-tile hg-tile-blue">
                <span>💧</span>
                <strong>Biyaha</strong>
                <small>Qiimo + Xisaabi</small>
              </div>
              <div className="hg-tile hg-tile-gold">
                <span>⚡</span>
                <strong>Korontada</strong>
                <small>Qiimo + Xisaabi</small>
              </div>
            </div>
          ) : null}

          <ul className="hg-list">
            {slide.steps.map((text, i) => (
              <li key={i}>
                <span className="hg-list-n" style={{ background: slide.color }}>
                  {i + 1}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>

          {slide.tip && (
            <div className="hg-tip" style={{ borderColor: `${slide.color}40`, color: slide.color }}>
              <Hand size={16} strokeWidth={2.2} />
              <span>{slide.tip}</span>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="hg-foot">
          <button
            type="button"
            className="hg-btn-back"
            disabled={isFirst}
            onClick={() => setIndex((i) => i - 1)}
          >
            <ArrowLeft size={18} />
            Dib
          </button>

          <span className="hg-counter">
            {index + 1} / {SLIDES.length}
          </span>

          {isLast ? (
            <button
              type="button"
              className="hg-btn-next"
              style={{ background: slide.color }}
              onClick={onClose}
            >
              <Check size={18} strokeWidth={2.5} />
              Fahamtay!
            </button>
          ) : (
            <button
              type="button"
              className="hg-btn-next"
              style={{ background: slide.color }}
              onClick={() => setIndex((i) => i + 1)}
            >
              {isFirst ? "Bilow" : "Xiga"}
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        .hg-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(10px);
        }
        .hg-card {
          width: min(540px, 100%);
          max-height: min(94vh, 780px);
          display: flex;
          flex-direction: column;
          border-radius: 28px;
          background: #fff;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.12),
            0 40px 100px -20px rgba(0,0,0,0.45);
          animation: hgIn 0.4s cubic-bezier(0.34, 1.4, 0.64, 1);
        }
        @keyframes hgIn {
          from { opacity: 0; transform: scale(0.9) translateY(24px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .hg-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px 12px;
          background: #fff;
        }
        .hg-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          font-weight: 800;
          color: #334155;
        }
        .hg-brand svg { color: #2563eb; }
        .hg-x {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          background: #f1f5f9;
          color: #64748b;
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: background 0.15s, color 0.15s;
        }
        .hg-x:hover { background: #e2e8f0; color: #0f172a; }
        .hg-segments {
          display: flex;
          gap: 5px;
          padding: 0 20px 14px;
          background: #fff;
        }
        .hg-seg {
          flex: 1;
          height: 5px;
          border: none;
          border-radius: 999px;
          background: #e2e8f0;
          padding: 0;
          cursor: pointer;
          transition: background 0.3s, transform 0.2s;
        }
        .hg-seg.on { transform: scaleY(1.3); }
        .hg-seg.done { opacity: 0.55; }
        .hg-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px 22px 20px;
          animation: hgFade 0.35s ease;
        }
        @keyframes hgFade {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .hg-slide-head { text-align: center; margin-bottom: 20px; }
        .hg-emoji {
          display: block;
          font-size: 3rem;
          line-height: 1;
          margin-bottom: 10px;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.08));
        }
        .hg-tag {
          display: inline-block;
          padding: 4px 14px;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .hg-slide-head h2 {
          margin: 0 0 8px;
          font-size: 1.65rem;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.03em;
          line-height: 1.15;
        }
        .hg-sub {
          margin: 0 auto;
          max-width: 380px;
          font-size: 0.95rem;
          font-weight: 600;
          line-height: 1.55;
          color: #475569;
        }
        .hg-visual {
          margin: 0 0 18px;
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.8);
          box-shadow: 0 8px 32px rgba(15,23,42,0.12);
          background: #fff;
        }
        .hg-visual :global(.hg-img) {
          width: 100% !important;
          height: auto !important;
          display: block;
          object-fit: contain !important;
        }
        .hg-tiles {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }
        .hg-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px 8px;
          border-radius: 18px;
          background: rgba(255,255,255,0.85);
          border: 2px solid rgba(255,255,255,0.9);
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          text-align: center;
        }
        .hg-tile span:first-child { font-size: 2rem; line-height: 1; }
        .hg-tile strong { font-size: 0.78rem; font-weight: 900; color: #0f172a; }
        .hg-tile small { font-size: 0.62rem; font-weight: 700; color: #64748b; }
        .hg-tile-green strong { color: #15803d; }
        .hg-tile-blue strong { color: #0369a1; }
        .hg-tile-gold strong { color: #b45309; }
        .hg-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .hg-list li {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(255,255,255,0.88);
          border: 1.5px solid rgba(255,255,255,0.95);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          font-size: 0.88rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.4;
        }
        .hg-list-n {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 0.75rem;
          font-weight: 900;
          color: #fff;
        }
        .hg-tip {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(255,255,255,0.75);
          border: 1.5px dashed;
          font-size: 0.82rem;
          font-weight: 700;
          line-height: 1.45;
        }
        .hg-foot {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px 20px;
          background: #fff;
          border-top: 1px solid #f1f5f9;
        }
        .hg-btn-back,
        .hg-btn-next {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px 20px;
          border-radius: 14px;
          border: none;
          font-size: 0.9rem;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s, box-shadow 0.15s;
        }
        .hg-btn-back {
          background: #f8fafc;
          color: #64748b;
          border: 1.5px solid #e2e8f0;
        }
        .hg-btn-back:not(:disabled):hover { background: #f1f5f9; color: #334155; }
        .hg-btn-back:disabled { opacity: 0.35; cursor: not-allowed; }
        .hg-btn-next {
          margin-left: auto;
          color: #fff;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .hg-btn-next:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
        .hg-counter {
          font-size: 0.75rem;
          font-weight: 800;
          color: #94a3b8;
        }
        html.dark .hg-card { background: #1e293b; }
        html.dark .hg-top, html.dark .hg-foot, html.dark .hg-segments { background: #1e293b; }
        html.dark .hg-brand { color: #e2e8f0; }
        html.dark .hg-slide-head h2 { color: #f8fafc; }
        html.dark .hg-sub { color: #94a3b8; }
        html.dark .hg-list li { background: rgba(15,23,42,0.5); border-color: rgba(255,255,255,0.08); color: #e2e8f0; }
        html.dark .hg-tip { background: rgba(15,23,42,0.4); }
        html.dark .hg-x { background: #334155; color: #cbd5e1; }
        html.dark .hg-btn-back { background: #334155; border-color: #475569; color: #cbd5e1; }
        html.dark .hg-foot { border-color: #334155; }
        @media (max-width: 480px) {
          .hg-overlay { padding: 10px; }
          .hg-card { border-radius: 22px; max-height: 96vh; }
          .hg-slide-head h2 { font-size: 1.35rem; }
          .hg-emoji { font-size: 2.5rem; }
          .hg-tiles { grid-template-columns: 1fr; }
          .hg-tile { flex-direction: row; padding: 12px 16px; text-align: left; }
          .hg-tile span:first-child { font-size: 1.6rem; }
        }
      `}</style>
    </div>,
    document.body
  );
}
