"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", duration = 4500) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  return { toasts, showToast, dismiss };
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div key={toast.id} className={`toast-item toast-${toast.type}`}>
            <Icon className="toast-icon" size={18} strokeWidth={2.25} />
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Close"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        );
      })}
      <style jsx>{`
        .toast-stack {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: min(380px, calc(100vw - 40px));
          pointer-events: none;
        }
        .toast-item {
          pointer-events: auto;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          line-height: 1.4;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.06);
          border: 1px solid transparent;
          animation: toast-in 0.28s ease-out;
        }
        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateX(16px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .toast-success {
          background: #ecfdf5;
          color: #065f46;
          border-color: #a7f3d0;
        }
        .toast-error {
          background: #fef2f2;
          color: #991b1b;
          border-color: #fecaca;
        }
        .toast-info {
          background: #eff6ff;
          color: #1e40af;
          border-color: #bfdbfe;
        }
        .toast-icon {
          flex-shrink: 0;
          margin-top: 1px;
        }
        .toast-message {
          flex: 1;
        }
        .toast-close {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          margin: -2px -2px 0 0;
          padding: 0;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: inherit;
          opacity: 0.55;
          cursor: pointer;
          transition: opacity 0.15s, background 0.15s;
        }
        .toast-close:hover {
          opacity: 1;
          background: rgba(0, 0, 0, 0.06);
        }
        :global(.dark) .toast-success {
          background: rgba(16, 185, 129, 0.12);
          color: #6ee7b7;
          border-color: rgba(16, 185, 129, 0.25);
        }
        :global(.dark) .toast-error {
          background: rgba(239, 68, 68, 0.12);
          color: #fca5a5;
          border-color: rgba(239, 68, 68, 0.25);
        }
        :global(.dark) .toast-info {
          background: rgba(59, 130, 246, 0.12);
          color: #93c5fd;
          border-color: rgba(59, 130, 246, 0.25);
        }
      `}</style>
    </div>
  );
}
