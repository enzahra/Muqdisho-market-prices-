"use client";

import { PRICE_SEASONS, PRICE_SEASON_LABELS, type PriceSeason } from "@/lib/season";

type SeasonalItem = {
  priceGu?: number | null;
  priceXagaa?: number | null;
  priceDayr?: number | null;
  priceJiilaal?: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  animalLabel: string;
  breedLabel: string;
  accent: string;
  birimo?: SeasonalItem | null;
  sugunto?: SeasonalItem | null;
  focusType?: "birimo" | "sugunto" | "both";
};

type SeasonFilter = PriceSeason | "all";

function seasonValue(item: SeasonalItem | null | undefined, season: PriceSeason): number | null {
  if (!item) return null;
  const map: Record<PriceSeason, number | null | undefined> = {
    gu: item.priceGu,
    xagaa: item.priceXagaa,
    dayr: item.priceDayr,
    jiilaal: item.priceJiilaal,
  };
  const v = map[season];
  return v != null && !Number.isNaN(Number(v)) ? Number(v) : null;
}

export function LivestockReportModal({
  open,
  onClose,
  animalLabel,
  breedLabel,
  accent,
  birimo,
  sugunto,
  focusType = "both",
}: Props) {
  if (!open) return null;

  const includeBirimo = focusType === "both" || focusType === "birimo";
  const includeSugunto = focusType === "both" || focusType === "sugunto";
  const tierLabel = focusType === "birimo" ? "Birimo" : focusType === "sugunto" ? "Sugunto" : "Birimo & Sugunto";

  const printReport = (seasonFilter: SeasonFilter, includeBirimo: boolean, includeSugunto: boolean) => {
    const seasons: PriceSeason[] = seasonFilter === "all" ? [...PRICE_SEASONS] : [seasonFilter];
    const seasonTitle = seasonFilter === "all" ? "Dhammaan Xilliyada" : PRICE_SEASON_LABELS[seasonFilter];
    const rows: string[] = [];

    for (const season of seasons) {
      if (includeBirimo) {
        const p = seasonValue(birimo, season);
        rows.push(`
          <tr>
            <td>Birimo</td>
            <td>${PRICE_SEASON_LABELS[season]}</td>
            <td class="price">${p != null ? `$${p.toLocaleString()}` : "—"}</td>
          </tr>
        `);
      }
      if (includeSugunto) {
        const p = seasonValue(sugunto, season);
        rows.push(`
          <tr>
            <td>Sugunto</td>
            <td>${PRICE_SEASON_LABELS[season]}</td>
            <td class="price">${p != null ? `$${p.toLocaleString()}` : "—"}</td>
          </tr>
        `);
      }
    }

    const html = `<!DOCTYPE html>
<html lang="so">
<head>
  <meta charset="utf-8" />
  <title>Warbixin - ${breedLabel} - ${animalLabel}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 40px; color: #0f172a; background: #fff; }
    .header { border-bottom: 3px solid ${accent}; padding-bottom: 16px; margin-bottom: 28px; }
    .brand { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; }
    h1 { margin: 8px 0 4px; font-size: 1.75rem; font-weight: 800; }
    .meta { color: #64748b; font-size: 0.9rem; }
    .badge { display: inline-block; margin-top: 10px; padding: 6px 14px; border-radius: 999px; background: ${accent}18; color: ${accent}; font-weight: 700; font-size: 0.8rem; }
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
    <div class="brand">Muqdisho Market Prices</div>
    <h1>${breedLabel}</h1>
    <div class="meta">${animalLabel} · Sicirka Rasmiga ah</div>
    <span class="badge">${seasonTitle}</span>
  </div>
  <table>
    <thead><tr><th>Heerka</th><th>Xilliga</th><th>Qiimaha (USD)</th></tr></thead>
    <tbody>${rows.join("")}</tbody>
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
          <div>
            <p className="report-modal-brand">Warbixin / Reports</p>
            <h2>{breedLabel} — {animalLabel}</h2>
          </div>
          <button type="button" className="report-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className="report-modal-desc">Dooro xilliga aad rabto inaad daabacdo — <strong>{tierLabel}</strong>.</p>

        <div className="report-modal-actions">
          <button type="button" className="report-print-btn" style={{ borderColor: accent, color: accent }} onClick={() => printReport("all", includeBirimo, includeSugunto)}>
            Daabac Dhammaan
          </button>
          {PRICE_SEASONS.map((season) => (
            <button
              key={season}
              type="button"
              className="report-print-btn"
              onClick={() => printReport(season, includeBirimo, includeSugunto)}
            >
              {PRICE_SEASON_LABELS[season]}
            </button>
          ))}
        </div>

        <div className="report-preview">
          <table>
            <thead>
              <tr>
                <th>Heerka</th>
                {PRICE_SEASONS.map((s) => (
                  <th key={s}>{PRICE_SEASON_LABELS[s]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {includeBirimo && birimo && (
                <tr>
                  <td><strong>Birimo</strong></td>
                  {PRICE_SEASONS.map((s) => (
                    <td key={s}>{seasonValue(birimo, s) != null ? `$${seasonValue(birimo, s)!.toLocaleString()}` : "—"}</td>
                  ))}
                </tr>
              )}
              {includeSugunto && sugunto && (
                <tr>
                  <td><strong>Sugunto</strong></td>
                  {PRICE_SEASONS.map((s) => (
                    <td key={s}>{seasonValue(sugunto, s) != null ? `$${seasonValue(sugunto, s)!.toLocaleString()}` : "—"}</td>
                  ))}
                </tr>
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
            width: min(640px, 100%); max-height: 90vh; overflow-y: auto;
            background: #fff; border-radius: 20px; padding: 28px;
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
          }
          .report-modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 12px; }
          .report-modal-brand { margin: 0 0 4px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; }
          .report-modal-head h2 { margin: 0; font-size: 1.35rem; font-weight: 800; color: #0f172a; }
          .report-modal-close { border: none; background: #f1f5f9; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; }
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
