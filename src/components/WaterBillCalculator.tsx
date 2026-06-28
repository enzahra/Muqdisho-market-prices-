"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { calcUtilityBill } from "@/lib/utility-rates";
import { UtilityCalculatorModal } from "@/components/UtilityCalculatorModal";
import { UTILITY_CALC_SECTION_STYLES } from "@/components/utility-calculator-styles";

type WaterBillCalculatorProps = {
  companyName: string;
  pricePerM3: number;
};

export function WaterBillCalculator({ companyName, pricePerM3 }: WaterBillCalculatorProps) {
  const [open, setOpen] = useState(false);
  const [cr, setCr] = useState("");
  const [lr, setLr] = useState("");

  const crNum = parseFloat(cr);
  const lrNum = parseFloat(lr);
  const hasValidInputs =
    cr.trim() !== "" &&
    lr.trim() !== "" &&
    !Number.isNaN(crNum) &&
    !Number.isNaN(lrNum) &&
    crNum >= lrNum &&
    pricePerM3 > 0;
  const usage = hasValidInputs ? crNum - lrNum : null;
  const total = hasValidInputs ? calcUtilityBill(crNum, lrNum, pricePerM3) : null;

  return (
    <>
      <button
        type="button"
        className="uc-trigger uc-trigger-water"
        aria-label={`Xisaabi biilka biyaha — ${companyName}`}
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
        theme="water"
        companyName={companyName}
        title="Xisaabiyaha biilka biyaha"
        formula="(CR − LR) × qiimaha biyaha"
      >
        <div className="uc-section">
          <span className="uc-section-label">Akhriska mitirka</span>
          <div className="uc-fields">
            <label className="uc-field">
              <span>CR — Akhriska hadda</span>
              <input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                placeholder="0 m³"
                value={cr}
                onChange={(e) => setCr(e.target.value)}
              />
            </label>
            <label className="uc-field">
              <span>LR — Akhriskii hore</span>
              <input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                placeholder="0 m³"
                value={lr}
                onChange={(e) => setLr(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="uc-meta uc-meta-water">
          <span>Qiimaha biyaha</span>
          <strong>{pricePerM3 > 0 ? `$${pricePerM3.toFixed(2)} / m³` : "—"}</strong>
        </div>

        {cr.trim() !== "" && lr.trim() !== "" && crNum < lrNum ? (
          <p className="uc-error">CR waa inuu ka weyn yahay ama la mid yahay LR</p>
        ) : null}

        {hasValidInputs && usage !== null && total !== null ? (
          <div className="uc-result">
            <div className="uc-result-row">
              <span>Isticmaalka</span>
              <strong>{usage.toLocaleString("en-US", { maximumFractionDigits: 2 })} m³</strong>
            </div>
            <div className="uc-result-total uc-result-total-water">
              <span>Wadarta biilka</span>
              <strong>${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          </div>
        ) : null}
      </UtilityCalculatorModal>

      <style jsx>{`
        ${UTILITY_CALC_SECTION_STYLES}
        .uc-trigger-water {
          border: 1px solid rgba(14, 165, 233, 0.35);
          background: linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);
          color: #0369a1;
          box-shadow: 0 2px 8px rgba(14, 165, 233, 0.12);
        }
        .uc-trigger-water:hover {
          border-color: #0ea5e9;
          background: #e0f2fe;
          transform: translateY(-1px);
        }
        .uc-meta-water {
          background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid rgba(14, 165, 233, 0.18);
        }
        .uc-meta-water strong { color: #0369a1; }
        .uc-field input:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
        }
        .uc-result-total-water {
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
          border: 1px solid rgba(14, 165, 233, 0.3);
        }
        .uc-result-total-water span { color: #0369a1; }
        .uc-result-total-water strong { color: #0c4a6e; }
        :global(html.dark) .uc-trigger-water {
          background: rgba(14, 165, 233, 0.12);
          border-color: rgba(56, 189, 248, 0.35);
          color: #7dd3fc;
        }
        :global(html.dark) .uc-meta-water {
          background: rgba(14, 165, 233, 0.12);
          border-color: rgba(56, 189, 248, 0.2);
        }
        :global(html.dark) .uc-meta-water strong { color: #7dd3fc; }
        :global(html.dark) .uc-result-total-water {
          background: rgba(14, 165, 233, 0.15);
          border-color: rgba(56, 189, 248, 0.25);
        }
        :global(html.dark) .uc-result-total-water strong { color: #bae6fd; }
      `}</style>
    </>
  );
}
