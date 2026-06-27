/**
 * Quick test: node scripts/test-excel-parse.js path/to/file.xlsx
 */
const fs = require('fs');
const path = require('path');

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.log('Usage: node scripts/test-excel-parse.js <file.xlsx>');
    process.exit(1);
  }

  // Dynamic import for TS module via build - use xlsx directly for smoke test
  const XLSX = require('xlsx');
  const buf = fs.readFileSync(file);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log('Sheet:', wb.SheetNames[0]);
  console.log('Rows:', rows.length);
  console.log('Headers:', rows[0] ? Object.keys(rows[0]) : []);
  console.log('Sample row:', rows[0]);
}

main().catch(console.error);
