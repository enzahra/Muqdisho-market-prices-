"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { BookOpen, X } from "lucide-react";

type VisitorGuideModalProps = {
  open: boolean;
  onClose: () => void;
};

type GuideStep = {
  title: string;
  body: string;
  actions: string[];
  image: string;
  imageAlt: string;
};

const GUIDE_STEPS: GuideStep[] = [
  {
    title: "1. Dooro qaybta — Sidebar",
    body: "Markaad furto dashboard-ka, bidix waxaad ka aragtaa saddexda qaybood ee ugu muhiimsan. Riix mid kasta si aad u gasho sicirada rasmiga ah.",
    actions: [
      "🐄 Sicirka xoolaha — Geel, Lo', Ari'",
      "💧 Sicirka Biyaha — shirkadaha biyaha Muqdisho",
      "⚡ Sicirka Korontada — shirkadaha korontada",
    ],
    image: "/images/guide/01-sidebar.png",
    imageAlt: "Sawirka sidebar-ka iyo qaybaha",
  },
  {
    title: "2. Sicirka rasmiga ah ee xoolaha",
    body: "Markaad doorato Sicirka xoolaha, waxaad arki doontaa saddex kaar: Geel, Lo', iyo Ari'. Riix badhanka Guji ee kaarka aad rabto si aad u gasho noocyada iyo qiimaha Birimo / Sugunto.",
    actions: [
      "Dooro Geel, Lo', ama Ari'",
      "Riix Guji si aad u sii gasho",
      "Dooro nooca (Birimo ama Sugunto) oo eeg qiimaha",
      "Riix Reports haddii aad rabto inaad daabacdo warbixin",
    ],
    image: "/images/guide/02-xoolaha.png",
    imageAlt: "Kaararka Geel, Lo' iyo Ari'",
  },
  {
    title: "3. Sicirka rasmiga ah ee Biyaha muqdisho",
    body: "Halkan waxaad ka arki kartaa shirkadaha biyaha iyo qiimaha rasmiga ah ee m³. Shirkad kasta waxay leedahay badhan Xisaabi oo kuu xisaabinaya biilka biyaha.",
    actions: [
      "Eeg magaca shirkadda iyo qiimaha biyaha ($/m³)",
      "Riix Xisaabi si aad u furto xisaabiyaha",
      "Geli CR (akhriska hadda) iyo LR (akhriskii hore)",
      "Nidaamku wuxuu xisaabinayaa: (CR − LR) × qiimaha biyaha",
    ],
    image: "/images/guide/03-biyaha.png",
    imageAlt: "Kaararka shirkadaha biyaha",
  },
  {
    title: "4. Warbixin / Reports — Daabacaadda qiimaha",
    body: "Markaad shirkad doorato (biyo ama koronto), hoosta ka eeg qaybta Warbixin / Reports. Riix Reports si aad u aragto qiimaha sanadlaha ah oo aad daabacdo.",
    actions: [
      "Dooro shirkadda aad rabto",
      "Riix badhanka 📄 Reports",
      "Dooro sanad gaar ah ama Daabac Dhammaan Sanadaha",
      "Warbixintu waxay muujinaysaa sanadka, qiimaha, iyo cutubka (m³ ama kWh)",
    ],
    image: "/images/guide/04-warbixin-biyaha.png",
    imageAlt: "Modal-ka warbixinta shirkadda biyaha",
  },
  {
    title: "5. Sicirka rasmiga ah ee Korontada muqdisho",
    body: "Shirkad kasta waxay muujinaysaa saddex nooc oo qiimo ah: Home Guri, Shirkad Laamo badan, iyo Shirkad Hal laan. Isticmaal Xisaabi si aad u xisaabiso biilka kWh.",
    actions: [
      "Eeg qiimaha kWh ee shirkad kasta",
      "Riix Xisaabi kadib dooro nooca isticmaalkaaga",
      "Geli CR iyo LR ee mitirka korontada",
      "Hel wadarta biilka: (CR − LR) × qiimaha la doortay",
    ],
    image: "/images/guide/05-korontada.png",
    imageAlt: "Kaararka shirkadaha korontada",
  },
];

export function VisitorGuideModal({ open, onClose }: VisitorGuideModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="visitor-guide-backdrop" role="presentation" onClick={onClose}>
      <div
        className="visitor-guide-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Hagaha booqdayaasha"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="visitor-guide-head">
          <div className="visitor-guide-head-icon" aria-hidden="true">
            <BookOpen size={22} strokeWidth={2.25} />
          </div>
          <div>
            <h2>Hagaha Booqdayaasha</h2>
            <p>Muqdisho Market Prices — Tilmaamo dhamaystiran Af-Soomaali</p>
          </div>
          <button type="button" className="visitor-guide-close" aria-label="Xir" onClick={onClose}>
            <X size={18} strokeWidth={2.5} />
          </button>
        </header>

        <div className="visitor-guide-body">
          <section className="visitor-guide-intro">
            <h3>Waa maxay barnaamijkan?</h3>
            <p>
              <strong>Muqdisho Market Prices</strong> waa dashboard dadweynaha u furan oo muujinaya{" "}
              <strong>sicirka rasmiga ah</strong> ee xoolaha, biyaha, iyo korontada magaalada Muqdisho.
              Hagahan wuxuu ku tusi doonaa tallaabo kasta oo aad u baahan tahay si aad u hesho dhammaan
              macluumaadka aad u baahan tahay.
            </p>
            <ul className="visitor-guide-highlights">
              <li>✓ Sicirka xoolaha — Geel, Lo&apos;, Ari&apos; (Birimo &amp; Sugunto)</li>
              <li>✓ Sicirka biyaha — shirkadaha + xisaabiyaha biilka m³</li>
              <li>✓ Sicirka korontada — noocyada qiimaha + xisaabiyaha kWh</li>
              <li>✓ Raadi degdeg ah, warbixinno sanadeed &amp; daabacaad</li>
            </ul>
          </section>

          {GUIDE_STEPS.map((step) => (
            <section key={step.title} className="visitor-guide-step">
              <div className="visitor-guide-step-text">
                <h4>{step.title}</h4>
                <p>{step.body}</p>
                <ul className="visitor-guide-actions">
                  {step.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
              <figure className="visitor-guide-step-image">
                <Image
                  src={step.image}
                  alt={step.imageAlt}
                  width={900}
                  height={520}
                  quality={92}
                  className="guide-screenshot"
                />
                <figcaption className="guide-caption">{step.imageAlt}</figcaption>
              </figure>
            </section>
          ))}

          <section className="visitor-guide-notes">
            <h3>Talooyin dheeraad ah</h3>
            <ol>
              <li>
                <strong>Raadi:</strong> Isticmaal sanduuqa &ldquo;Raadi...&rdquo; kore midig si aad si degdeg ah
                u hesho shirkad ama nooc xoolo.
              </li>
              <li>
                <strong>Mugdi / Iftiin:</strong> Hoos sidebar-ka waxaa ku yaal badhanka beddelka muuqaalka
                (mugdi ama iftiin).
              </li>
              <li>
                <strong>Qiimayaasha:</strong> Waa kuwa rasmiga ah ee nidaamka — marka la cusbooneysiiyo,
                dashboard-ku si toos ah ayuu u is beddeli doonaa.
              </li>
              <li>
                <strong>Xisaabiyayaasha:</strong> CR = akhriska hadda, LR = akhriskii hore. CR waa inuu ka
                weyn yahay ama la mid yahay LR.
              </li>
            </ol>
          </section>
        </div>
      </div>

      <style jsx global>{`
        .visitor-guide-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .visitor-guide-dialog {
          width: min(820px, 100%);
          max-height: min(92vh, 920px);
          display: flex;
          flex-direction: column;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid rgba(14, 165, 233, 0.2);
          box-shadow: 0 24px 64px -16px rgba(15, 23, 42, 0.45);
          overflow: hidden;
        }
        .visitor-guide-head {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 18px 22px 14px;
          border-bottom: 1px solid #f1f5f9;
          background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%);
          flex-shrink: 0;
        }
        .visitor-guide-head-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          color: #fff;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(14, 165, 233, 0.35);
        }
        .visitor-guide-head h2 {
          margin: 0 0 4px;
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
        }
        .visitor-guide-head p {
          margin: 0;
          font-size: 0.78rem;
          font-weight: 600;
          color: #64748b;
        }
        .visitor-guide-close {
          margin-left: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.06);
          color: #475569;
          cursor: pointer;
          flex-shrink: 0;
        }
        .visitor-guide-close:hover {
          background: rgba(15, 23, 42, 0.1);
          color: #0f172a;
        }
        .visitor-guide-body {
          padding: 18px 22px 26px;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .visitor-guide-intro {
          margin-bottom: 22px;
          padding-bottom: 18px;
          border-bottom: 1.5px solid #f1f5f9;
        }
        .visitor-guide-intro h3,
        .visitor-guide-notes h3 {
          margin: 0 0 10px;
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
        }
        .visitor-guide-intro p {
          margin: 0 0 12px;
          font-size: 0.88rem;
          line-height: 1.65;
          color: #475569;
        }
        .visitor-guide-highlights {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 6px;
        }
        .visitor-guide-highlights li {
          font-size: 0.82rem;
          font-weight: 600;
          color: #0369a1;
          padding: 8px 12px;
          border-radius: 10px;
          background: #f0f9ff;
          border: 1px solid rgba(14, 165, 233, 0.15);
        }
        .visitor-guide-step {
          margin-bottom: 20px;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #fafafa;
        }
        .visitor-guide-step h4 {
          margin: 0 0 8px;
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
        }
        .visitor-guide-step p {
          margin: 0 0 10px;
          font-size: 0.84rem;
          line-height: 1.6;
          color: #475569;
        }
        .visitor-guide-actions {
          margin: 0 0 14px;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 5px;
        }
        .visitor-guide-actions li {
          font-size: 0.78rem;
          font-weight: 600;
          color: #334155;
          padding: 7px 10px;
          border-radius: 8px;
          background: #fff;
          border: 1px solid #e2e8f0;
          line-height: 1.4;
        }
        .visitor-guide-step-image {
          margin: 0;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #cbd5e1;
          background: #f1f5f9;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
        }
        .visitor-guide-step-image :global(.guide-screenshot) {
          width: 100% !important;
          height: auto !important;
          max-height: none;
          object-fit: contain !important;
          object-position: center top;
          display: block;
        }
        .guide-caption {
          display: block;
          padding: 9px 12px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #64748b;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          text-align: center;
        }
        .visitor-guide-notes {
          padding: 16px;
          border-radius: 14px;
          background: linear-gradient(180deg, #fffbeb 0%, #fef9c3 100%);
          border: 1px solid rgba(234, 179, 8, 0.25);
        }
        .visitor-guide-notes ol {
          margin: 0;
          padding-left: 20px;
          display: grid;
          gap: 10px;
        }
        .visitor-guide-notes li {
          font-size: 0.82rem;
          line-height: 1.55;
          color: #78350f;
          font-weight: 600;
        }
        html.dark .visitor-guide-dialog {
          background: #0f172a;
          border-color: rgba(56, 189, 248, 0.25);
        }
        html.dark .visitor-guide-head {
          background: #0f172a;
          border-bottom-color: #1e293b;
        }
        html.dark .visitor-guide-head h2,
        html.dark .visitor-guide-intro h3,
        html.dark .visitor-guide-notes h3,
        html.dark .visitor-guide-step h4 {
          color: #f1f5f9;
        }
        html.dark .visitor-guide-intro p,
        html.dark .visitor-guide-step p {
          color: #94a3b8;
        }
        html.dark .visitor-guide-step {
          background: #1e293b;
          border-color: #334155;
        }
        html.dark .visitor-guide-actions li {
          background: #0f172a;
          border-color: #334155;
          color: #cbd5e1;
        }
        html.dark .visitor-guide-step-image {
          background: #0f172a;
          border-color: #334155;
        }
        html.dark .guide-caption {
          background: #1e293b;
          border-color: #334155;
          color: #94a3b8;
        }
      `}</style>
    </div>,
    document.body
  );
}
