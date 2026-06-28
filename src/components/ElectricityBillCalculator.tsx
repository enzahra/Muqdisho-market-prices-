"use client";

import { useState, type CSSProperties } from "react";
import { Calculator } from "lucide-react";
import { calcUtilityBill, type ElectricityRateRow } from "@/lib/utility-rates";
import { UtilityCalculatorModal } from "@/components/UtilityCalculatorModal";
import { UTILITY_CALC_SECTION_STYLES } from "@/components/utility-calculator-styles";

const RATE_ACCENTS: Record<string, string> = {
  home: "#f59e0b",
  multi: "#3b82f6",
  single: "#10b981",
};

type ElectricityBillCalculatorProps = {
  companyName: string;
  rates: ElectricityRateRow[];
};

export function ElectricityBillCalculator({ companyName, rates }: ElectricityBillCalculatorProps) {
  const defaultRateId = rates.find((r) => r.rateId === "home")?.rateId ?? rates[0]?.rateId ?? "";
  const [open, setOpen] = useState(false);
  const [selectedRateId, setSelectedRateId] = useState(defaultRateId);
  const [cr, setCr] = useState("");
  const [lr, setLr] = useState("");

  const selectedRate = rates.find((r) => r.rateId === selectedRateId) ?? rates[0];
  const unitPrice = selectedRate?.price ?? 0;

  const crNum = parseFloat(cr);
  const lrNum = parseFloat(lr);
  const hasValidInputs =
    cr.trim() !== "" &&
    lr.trim() !== "" &&
    !Number.isNaN(crNum) &&
    !Number.isNaN(lrNum) &&
    crNum >= lrNum &&
    unitPrice > 0;
  const usage = hasValidInputs ? crNum - lrNum : null;
  const total = hasValidInputs ? calcUtilityBill(crNum, lrNum, unitPrice) : null;

  if (rates.length === 0) return null;

  return (
    <>
      <button
        type="button"
        className="uc-trigger uc-trigger-electricity"
        aria-label={`Xisaabi biilka korontada — ${companyName}`}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Calculator size={14} strokeWidth={2.5} aria-hidden="true" />
        <span>Xisaabi</span>
      </button>

      <UtilityCalculatorModal
        open={open}
        onClose={() => setOpen(false)}
        theme="electricity"
        size="wide"
        companyName={companyName}
        title="Xisaabiyaha biilka korontada"
        formula="(CR − LR) × qiimaha la doortay"
      >
        <div className="uc-section">
          <span className="uc-section-label">Nooca isticmaalka</span>
          <div className="elec-rate-grid" role="radiogroup" aria-label="Dooro nooca korontada">
            {rates.map((rate) => {
              const accent = RATE_ACCENTS[rate.rateId] ?? "#eab308";
              const isActive = selectedRateId === rate.rateId;
              return (
                <button
                  key={rate.rateId}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  className={`elec-rate-card${isActive ? " is-active" : ""}`}
                  style={{ "--rate-accent": accent } as CSSProperties}
                  onClick={() => setSelectedRateId(rate.rateId)}
                >
                  <span className="elec-rate-dot" aria-hidden="true" />
                  <span className="elec-rate-label">{rate.label}</span>
                  <span className="elec-rate-amount">${rate.price.toFixed(2)}<small>/kWh</small></span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="uc-section">
          <span className="uc-section-label">Akhriska mitirka korontada</span>
          <p className="uc-section-hint">
            Ka eeg mitirka korontada — waa tiro ku qoran kWh. CR waa lambarka hadda, LR waa lambarka bill-kii hore.
          </p>
          <div className="uc-fields">
            <label className="uc-field">
              <span>CR — Lambarka mitirka HADDA</span>
              <small className="uc-field-hint">Current Reading · akhriska maanta / bill-ka cusub</small>
              <input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                placeholder="0 kWh"
                value={cr}
                onChange={(e) => setCr(e.target.value)}
              />
            </label>
            <label className="uc-field">
              <span>LR — Lambarka mitirka HORE</span>
              <small className="uc-field-hint">Last Reading · akhriskii bill-kii hore</small>
              <input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                placeholder="0 kWh"
                value={lr}
                onChange={(e) => setLr(e.target.value)}
              />
            </label>
          </div>
        </div>

        {selectedRate ? (
          <div className="uc-meta uc-meta-electricity">
            <span>Qiimaha la doortay</span>
            <strong>{selectedRate.label} · ${unitPrice.toFixed(2)}/kWh</strong>
          </div>
        ) : null}

        {cr.trim() !== "" && lr.trim() !== "" && crNum < lrNum ? (
          <p className="uc-error">Lambarka hadda (CR) waa inuu ka weyn yahay ama la mid yahay kan hore (LR)</p>
        ) : null}

        {hasValidInputs && usage !== null && total !== null ? (
          <div className="uc-result">
            <div className="uc-result-row">
              <span>Isticmaalka</span>
              <strong>{usage.toLocaleString("en-US", { maximumFractionDigits: 2 })} kWh</strong>
            </div>
            <div className="uc-result-total uc-result-total-electricity">
              <span>Wadarta biilka</span>
              <strong>${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          </div>
        ) : null}
      </UtilityCalculatorModal>

      <style jsx>{`
        ${UTILITY_CALC_SECTION_STYLES}
        .uc-trigger-electricity {
          border: 1px solid rgba(234, 179, 8, 0.45);
          background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%);
          color: #a16207;
          box-shadow: 0 2px 8px rgba(234, 179, 8, 0.12);
        }
        .uc-trigger-electricity:hover {
          border-color: #eab308;
          background: #fef9c3;
          transform: translateY(-1px);
        }
        .elec-rate-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          width: 100%;
        }
        @media (max-width: 560px) {
          .elec-rate-grid { grid-template-columns: 1fr; }
        }
        .elec-rate-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          padding: 12px 12px;
          width: 100%;
          border-radius: 14px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          cursor: pointer;
          text-align: left;
          transition: all 0.18s ease;
          font-family: inherit;
          min-width: 0;
        }
        .elec-rate-card:hover {
          border-color: var(--rate-accent, #eab308);
          background: #fff;
        }
        .elec-rate-card.is-active {
          border-color: var(--rate-accent, #eab308);
          background: #fff;
          box-shadow:
            0 0 0 1px var(--rate-accent, #eab308),
            0 6px 16px color-mix(in srgb, var(--rate-accent, #eab308) 22%, transparent);
        }
        .elec-rate-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--rate-accent, #eab308);
        }
        .elec-rate-label {
          font-size: 0.72rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.35;
          word-break: break-word;
          overflow-wrap: anywhere;
          width: 100%;
        }
        .elec-rate-amount {
          font-size: 0.82rem;
          font-weight: 800;
          color: #475569;
        }
        .elec-rate-amount small {
          font-size: 0.65rem;
          font-weight: 600;
          color: #94a3b8;
          margin-left: 1px;
        }
        .uc-meta-electricity {
          background: linear-gradient(180deg, #fffef5 0%, #fef9c3 100%);
          border: 1px solid rgba(234, 179, 8, 0.22);
        }
        .uc-meta-electricity strong { color: #92400e; }
        .uc-field input:focus {
          border-color: #eab308;
          box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.18);
        }
        .uc-result-total-electricity {
          background: linear-gradient(135deg, #fef9c3 0%, #fde68a 100%);
          border: 1px solid rgba(234, 179, 8, 0.35);
        }
        .uc-result-total-electricity span { color: #92400e; }
        .uc-result-total-electricity strong { color: #78350f; }
        :global(html.dark) .uc-trigger-electricity {
          background: rgba(234, 179, 8, 0.12);
          border-color: rgba(250, 204, 21, 0.4);
          color: #fde68a;
        }
        :global(html.dark) .elec-rate-card {
          background: #1e293b;
          border-color: #334155;
        }
        :global(html.dark) .elec-rate-label { color: #f1f5f9; }
        :global(html.dark) .uc-meta-electricity {
          background: rgba(234, 179, 8, 0.1);
          border-color: rgba(250, 204, 21, 0.2);
        }
        :global(html.dark) .uc-meta-electricity strong { color: #fde68a; }
        :global(html.dark) .uc-result-total-electricity {
          background: rgba(234, 179, 8, 0.15);
          border-color: rgba(250, 204, 21, 0.25);
        }
        :global(html.dark) .uc-result-total-electricity strong { color: #fde68a; }
      `}</style>
    </>
  );
}
