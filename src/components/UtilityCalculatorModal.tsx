"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Calculator, X } from "lucide-react";

export type CalculatorTheme = "water" | "electricity";

type UtilityCalculatorModalProps = {
  open: boolean;
  onClose: () => void;
  theme: CalculatorTheme;
  companyName: string;
  title: string;
  formula: string;
  /** wide = electricity (3 rate columns); default = water */
  size?: "default" | "wide";
  children: ReactNode;
};

export function UtilityCalculatorModal({
  open,
  onClose,
  theme,
  companyName,
  title,
  formula,
  size = "default",
  children,
}: UtilityCalculatorModalProps) {
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
    <div
      className={`util-calc-backdrop theme-${theme}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`util-calc-dialog${size === "wide" ? " is-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="util-calc-dialog-head">
          <div className="util-calc-dialog-icon" aria-hidden="true">
            <Calculator size={20} strokeWidth={2.25} />
          </div>
          <div className="util-calc-dialog-titles">
            <p className="util-calc-dialog-company">{companyName}</p>
            <h2 className="util-calc-dialog-title">{title}</h2>
            <p className="util-calc-dialog-formula">{formula}</p>
          </div>
          <button
            type="button"
            className="util-calc-dialog-close"
            aria-label="Xir xisaabiyaha"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </header>
        <div className="util-calc-dialog-body">{children}</div>
      </div>

      <style jsx global>{`
        .util-calc-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 16px;
          background: rgba(15, 23, 42, 0.52);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: utilCalcFadeIn 0.2s ease;
        }
        @keyframes utilCalcFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes utilCalcSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .util-calc-dialog {
          width: min(520px, calc(100vw - 32px));
          max-height: min(90vh, 720px);
          display: flex;
          flex-direction: column;
          border-radius: 20px;
          background: #ffffff;
          box-shadow:
            0 24px 64px -16px rgba(15, 23, 42, 0.45),
            0 0 0 1px rgba(255, 255, 255, 0.08);
          animation: utilCalcSlideUp 0.24s ease;
          overflow: hidden;
          box-sizing: border-box;
        }
        .util-calc-dialog.is-wide {
          width: min(680px, calc(100vw - 32px));
        }
        .util-calc-backdrop.theme-water .util-calc-dialog {
          border: 1px solid rgba(14, 165, 233, 0.2);
        }
        .util-calc-backdrop.theme-electricity .util-calc-dialog {
          border: 1px solid rgba(234, 179, 8, 0.28);
        }
        .util-calc-dialog-head {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 20px 20px 16px;
          border-bottom: 1px solid #f1f5f9;
          flex-shrink: 0;
        }
        .util-calc-backdrop.theme-water .util-calc-dialog-head {
          background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%);
        }
        .util-calc-backdrop.theme-electricity .util-calc-dialog-head {
          background: linear-gradient(180deg, #fffbeb 0%, #ffffff 100%);
        }
        .util-calc-dialog-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          flex-shrink: 0;
        }
        .util-calc-backdrop.theme-water .util-calc-dialog-icon {
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          color: #fff;
          box-shadow: 0 4px 14px rgba(14, 165, 233, 0.35);
        }
        .util-calc-backdrop.theme-electricity .util-calc-dialog-icon {
          background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
          color: #fff;
          box-shadow: 0 4px 14px rgba(234, 179, 8, 0.35);
        }
        .util-calc-dialog-titles {
          flex: 1;
          min-width: 0;
        }
        .util-calc-dialog-company {
          margin: 0 0 2px;
          font-size: 0.68rem;
          font-weight: 700;
          color: #64748b;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .util-calc-dialog-title {
          margin: 0 0 4px;
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          line-height: 1.25;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .util-calc-dialog-formula {
          margin: 0;
          font-size: 0.78rem;
          font-weight: 600;
          color: #64748b;
          word-break: break-word;
        }
        .util-calc-dialog-close {
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
          transition: background 0.15s ease, color 0.15s ease;
        }
        .util-calc-dialog-close:hover {
          background: rgba(15, 23, 42, 0.1);
          color: #0f172a;
        }
        .util-calc-dialog-body {
          padding: 18px 24px 24px;
          overflow-x: hidden;
          overflow-y: auto;
          flex: 1;
          box-sizing: border-box;
          min-width: 0;
        }
        .util-calc-dialog-body :global(*) {
          box-sizing: border-box;
        }
        html.dark .util-calc-dialog {
          background: #0f172a;
          box-shadow: 0 24px 64px -16px rgba(0, 0, 0, 0.6);
        }
        html.dark .util-calc-dialog-head {
          border-bottom-color: #1e293b;
          background: #0f172a !important;
        }
        html.dark .util-calc-dialog-title {
          color: #f1f5f9;
        }
        html.dark .util-calc-dialog-close {
          background: rgba(255, 255, 255, 0.08);
          color: #94a3b8;
        }
        html.dark .util-calc-dialog-close:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #f1f5f9;
        }
      `}</style>
    </div>,
    document.body
  );
}
