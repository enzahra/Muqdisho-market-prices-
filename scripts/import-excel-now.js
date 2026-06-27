require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/import-excel-now.js <path-to.xlsx>');
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);
  const { parseExcelToDataset, saveLivestockDataset, applyLivestockDatasetToDatabase } =
    await import('../src/lib/livestock-dataset.ts');

  const dataset = parseExcelToDataset(buffer);
  console.log('Parsed categories:');
  for (const cat of dataset.categories) {
    const birimo = cat.items.filter((i) => i.birimo).length;
    const sugunto = cat.items.filter((i) => i.sugunto).length;
    console.log(`  ${cat.slug}: ${cat.items.length} breeds (birimo:${birimo}, sugunto:${sugunto})`);
    console.log('    names:', cat.items.map((i) => i.name).join(', '));
  }

  saveLivestockDataset(dataset);
  console.log('Saved livestock-prices.json');

  await applyLivestockDatasetToDatabase(dataset);
  console.log('Database updated successfully.');
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
