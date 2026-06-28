"use client";

import Image from "next/image";
import {
  formatElectricityRateDisplay,
  getElectricityCompanyDisplayName,
  getUtilityCompanyLogo,
  getUtilityLogoVariant,
  getWaterCompanyDisplayName,
  type UtilityCompanyView,
} from "@/lib/utility-rates";

type Props = {
  open: boolean;
  onClose: () => void;
  categoryLabel: string;
  unit: string;
  accent: string;
  company: UtilityCompanyView | null;
};

function getDisplayName(company: UtilityCompanyView): string {
  if (company.isElectricity) return getElectricityCompanyDisplayName(company.name);
  return getWaterCompanyDisplayName(company.name);
}

export function UtilityReportModal({
  open,
  onClose,
  categoryLabel,
  unit,
  accent,
  company,
}: Props) {
  if (!open || !company) return null;

  const displayName = getDisplayName(company);
  const companyLogo = getUtilityCompanyLogo(company.name, company.isElectricity);
  const logoVariant = companyLogo ? getUtilityLogoVariant(companyLogo) : null;
  const logoTheme = company.isElectricity ? "electricity" : "water";

  const printReport = (yearFilter: string | "all") => {
    const years =
      yearFilter === "all"
        ? company.years
        : company.years.filter((y) => y.year === yearFilter);

    const title = yearFilter === "all" ? "Dhammaan Sanadaha" : `Sanadka ${yearFilter}`;
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    let tableRows = "";
    if (company.isElectricity) {
      tableRows = years
        .flatMap((yearEntry) =>
          yearEntry.rates.map(
            (rate) => `
            <tr>
              <td>${yearEntry.year}</td>
              <td><strong>${formatElectricityRateDisplay(rate.label, rate.price)}</strong></td>
            </tr>
          `
          )
        )
        .join("");
    } else {
      tableRows = years
        .map(
          (row) => `
          <tr>
            <td>${row.year}</td>
            <td class="price">${row.price > 0 ? `$${row.price.toLocaleString()}` : "—"}</td>
            <td>/${unit}</td>
          </tr>
        `
        )
        .join("");
    }

    const tableHead = company.isElectricity
      ? "<tr><th>Sanadka</th><th>Qiimaha</th></tr>"
      : "<tr><th>Sanadka</th><th>Qiimaha (USD)</th><th>Cutubka</th></tr>";

    const logoBlock = companyLogo
      ? `<div class="logo-frame logo-${logoTheme} logo-${logoVariant}">
           <img src="${origin}${companyLogo}" alt="${displayName}" class="company-logo logo-${logoVariant}" />
         </div>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="so">
<head>
  <meta charset="utf-8" />
  <title>Warbixin - ${displayName}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 40px; color: #0f172a; background: #fff; }
    .header { border-bottom: 3px solid ${accent}; padding-bottom: 16px; margin-bottom: 28px; }
    .header-top { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }
    .brand { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; }
    h1 { margin: 8px 0 4px; font-size: 1.75rem; font-weight: 800; }
    .meta { color: #64748b; font-size: 0.9rem; }
    .badge { display: inline-block; margin-top: 10px; padding: 6px 14px; border-radius: 999px; background: ${accent}18; color: ${accent}; font-weight: 700; font-size: 0.8rem; }
    .logo-frame { display: inline-flex; align-items: center; justify-content: center; line-height: 0; }
    .logo-frame.logo-electricity { padding: 6px 12px; border-radius: 11px; background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%); border: 1px solid rgba(234, 179, 8, 0.22); box-shadow: 0 3px 10px rgba(234, 179, 8, 0.12); }
    .logo-frame.logo-water { padding: 6px 12px; border-radius: 11px; background: linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%); border: 1px solid rgba(14, 165, 233, 0.18); box-shadow: 0 3px 10px rgba(14, 165, 233, 0.1); }
    .logo-frame.logo-round { width: 52px; height: 52px; padding: 3px; border-radius: 50%; }
    .company-logo { display: block; object-fit: contain; }
    .company-logo.logo-wide { height: 36px; max-width: 96px; }
    .company-logo.logo-compact { height: 28px; max-width: 110px; }
    .company-logo.logo-wabax { height: 36px; max-width: 44px; object-position: center bottom; }
    .company-logo.logo-round { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
    td.price { font-weight: 800; font-size: 1.1rem; color: #0f172a; }
    .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 0.78rem; color: #94a3b8; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      ${logoBlock}
      <div>
        <div class="brand">Muqdisho Market Prices</div>
        <h1>${displayName}</h1>
        <div class="meta">${categoryLabel}</div>
      </div>
    </div>
    <span class="badge">${title}</span>
  </div>
  <table>
    <thead>${tableHead}</thead>
    <tbody>${tableRows || `<tr><td colspan="${company.isElectricity ? 2 : 3}">Wax xog ah lagama hayo</td></tr>`}</tbody>
  </table>
  <div class="footer">Waxaa la daabacay ${new Date().toLocaleString("so-SO")} · Xog rasmiga ah</div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-head">
          <div className="report-modal-title-row">
            {companyLogo && logoVariant && (
              <div className={`report-logo-frame variant-${logoVariant} theme-${logoTheme}`}>
                <Image
                  src={companyLogo}
                  alt={displayName}
                  width={120}
                  height={40}
                  quality={95}
                  className="report-logo-img"
                />
              </div>
            )}
            <div>
              <p className="report-modal-brand">Warbixin / Reports</p>
              <h2>{displayName}</h2>
              <p className="report-modal-meta">{categoryLabel}</p>
            </div>
          </div>
          <button type="button" className="report-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className="report-modal-desc">Dooro sanadka aad rabto inaad daabacdo ama daabac dhammaan sanadaha.</p>

        <div className="report-modal-actions">
          <button
            type="button"
            className="report-print-btn report-print-btn-primary"
            style={{ borderColor: accent, color: accent }}
            onClick={() => printReport("all")}
          >
            Daabac Dhammaan Sanadaha
          </button>
          {company.years.map((row) => (
            <button key={row.year} type="button" className="report-print-btn" onClick={() => printReport(row.year)}>
              {row.year}
            </button>
          ))}
        </div>

        <div className="report-preview">
          <table>
            <thead>
              {company.isElectricity ? (
                <tr>
                  <th>Sanadka</th>
                  <th>Qiimaha</th>
                </tr>
              ) : (
                <tr>
                  <th>Sanadka</th>
                  <th>Qiimaha (USD)</th>
                  <th>Cutubka</th>
                </tr>
              )}
            </thead>
            <tbody>
              {company.years.length === 0 ? (
                <tr>
                  <td colSpan={company.isElectricity ? 2 : 3}>Weli sanad lama diiwaangelin</td>
                </tr>
              ) : company.isElectricity ? (
                company.years.flatMap((yearEntry) =>
                  yearEntry.rates.map((rate) => (
                    <tr key={`${yearEntry.year}-${rate.rateId}`}>
                      <td><strong>{yearEntry.year}</strong></td>
                      <td><strong>{formatElectricityRateDisplay(rate.label, rate.price)}</strong></td>
                    </tr>
                  ))
                )
              ) : (
                company.years.map((row) => (
                  <tr key={row.year}>
                    <td><strong>{row.year}</strong></td>
                    <td>{row.price > 0 ? `$${row.price.toLocaleString()}` : "—"}</td>
                    <td>/{unit}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <style jsx>{`
          .report-modal-overlay {
            position: fixed; inset: 0; z-index: 2000;
            background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center; padding: 20px;
          }
          .report-modal {
            width: min(720px, 100%); max-height: 90vh; overflow-y: auto;
            background: #fff; border-radius: 20px; padding: 28px;
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
          }
          .report-modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 12px; }
          .report-modal-title-row { display: flex; align-items: center; gap: 14px; }
          .report-logo-frame {
            display: inline-flex; align-items: center; justify-content: center;
            flex-shrink: 0; line-height: 0;
          }
          .report-logo-frame.variant-wide {
            padding: 6px 12px; border-radius: 11px;
            background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
            border: 1px solid rgba(15, 23, 42, 0.07);
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
          }
          .report-logo-frame.variant-wide :global(.report-logo-img) {
            height: 34px !important; width: auto !important; max-width: 88px !important;
            object-fit: contain;
          }
          .report-logo-frame.variant-compact :global(.report-logo-img) {
            height: 28px !important; width: auto !important; max-width: 110px !important;
            object-fit: contain;
          }
          .report-logo-frame.theme-electricity.variant-wide,
          .report-logo-frame.theme-electricity.variant-compact {
            background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%);
            border-color: rgba(234, 179, 8, 0.22);
            box-shadow: 0 3px 10px rgba(234, 179, 8, 0.12);
          }
          .report-logo-frame.theme-water.variant-wide,
          .report-logo-frame.theme-water.variant-round {
            background: linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);
            border: 1px solid rgba(14, 165, 233, 0.18);
            box-shadow: 0 3px 10px rgba(14, 165, 233, 0.1);
          }
          .report-logo-frame.variant-round {
            width: 52px; height: 52px; padding: 3px; border-radius: 50%;
          }
          .report-logo-frame.variant-round :global(.report-logo-img) {
            width: 100% !important; height: 100% !important; max-width: none !important;
            border-radius: 50%; object-fit: cover;
          }
          .report-logo-frame.variant-wabax {
            padding: 4px 8px; border-radius: 10px;
            background: linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);
            border: 1px solid rgba(14, 165, 233, 0.18);
          }
          .report-logo-frame.variant-wabax :global(.report-logo-img) {
            height: 36px !important; width: auto !important; max-width: 44px !important;
            object-fit: contain; object-position: center bottom;
          }
          .report-modal-brand { margin: 0 0 4px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; }
          .report-modal-meta { margin: 4px 0 0; font-size: 0.85rem; color: #64748b; }
          .report-modal-head h2 { margin: 0; font-size: 1.35rem; font-weight: 800; color: #0f172a; }
          .report-modal-close { border: none; background: #f1f5f9; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; flex-shrink: 0; }
          .report-modal-desc { margin: 0 0 20px; font-size: 0.88rem; color: #64748b; }
          .report-modal-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
          .report-print-btn {
            padding: 8px 16px; border-radius: 999px; border: 1.5px solid #e2e8f0;
            background: #fff; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
          }
          .report-print-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
          .report-preview { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
          .report-preview table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
          .report-preview th, .report-preview td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #f1f5f9; }
          .report-preview th { background: #f8fafc; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
        `}</style>
      </div>
    </div>
  );
}
