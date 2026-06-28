/** Shared section styles for water & electricity bill calculators (used with styled-jsx) */
export const UTILITY_CALC_SECTION_STYLES = `
  .uc-section { margin-bottom: 18px; }
  .uc-section:last-child { margin-bottom: 0; }
  .uc-section-label {
    display: block;
    margin-bottom: 10px;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #94a3b8;
  }
  .uc-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    width: 100%;
  }
  @media (max-width: 420px) {
    .uc-fields { grid-template-columns: 1fr; }
  }
  .uc-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .uc-field span {
    font-size: 0.75rem;
    font-weight: 700;
    color: #475569;
  }
  .uc-field input {
    width: 100%;
    min-width: 0;
    height: 44px;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    padding: 0 14px;
    font-size: 0.95rem;
    font-weight: 600;
    color: #0f172a;
    outline: none;
    background: #f8fafc;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  }
  .uc-field input:focus {
    background: #fff;
  }
  .uc-field input::placeholder {
    color: #94a3b8;
    font-weight: 500;
  }
  .uc-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 8px 16px;
    padding: 12px 14px;
    border-radius: 12px;
    margin-bottom: 4px;
    width: 100%;
  }
  .uc-meta span {
    font-size: 0.72rem;
    font-weight: 700;
    color: #64748b;
    flex-shrink: 0;
  }
  .uc-meta strong {
    font-size: 0.82rem;
    font-weight: 800;
    text-align: right;
    flex: 1;
    min-width: 0;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .uc-error {
    margin: 10px 0 0;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 700;
    color: #b91c1c;
    background: #fef2f2;
    border: 1px solid #fecaca;
  }
  .uc-result {
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1.5px solid #f1f5f9;
    display: grid;
    gap: 10px;
  }
  .uc-result-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .uc-result-row span {
    font-size: 0.78rem;
    font-weight: 700;
    color: #64748b;
  }
  .uc-result-row strong {
    font-size: 0.95rem;
    font-weight: 800;
    color: #0f172a;
  }
  .uc-result-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 14px;
    margin-top: 4px;
  }
  .uc-result-total span {
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .uc-result-total strong {
    font-size: 1.25rem;
    font-weight: 900;
    letter-spacing: -0.02em;
  }
  .uc-trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 11px;
    border-radius: 999px;
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    font-family: inherit;
  }
  html.dark .uc-field input {
    background: #1e293b;
    border-color: #334155;
    color: #f1f5f9;
  }
  html.dark .uc-field input:focus {
    background: #0f172a;
  }
  html.dark .uc-result-row strong,
  html.dark .uc-result-total strong {
    color: #f1f5f9;
  }
  html.dark .uc-error {
    background: rgba(220, 38, 38, 0.12);
    border-color: rgba(248, 113, 113, 0.3);
    color: #fca5a5;
  }
`;
