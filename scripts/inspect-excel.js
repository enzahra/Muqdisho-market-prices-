const XLSX = require('xlsx');
const path = require('path');

const filePath = process.argv[2] || path.join(__dirname, '../../dataset animal.xlsx');
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log('File:', filePath);
console.log('Sheet:', wb.SheetNames[0]);
console.log('Total rows:', aoa.length);
console.log('Header:', JSON.stringify(aoa[0]));
for (let i = 1; i <= Math.min(5, aoa.length - 1); i++) {
  console.log('Row', i + ':', JSON.stringify(aoa[i]));
}

let geel = 0, lo = 0, ari = 0, emptyCat = 0, skipped = 0;
let lastCat = '';
for (let i = 1; i < aoa.length; i++) {
  const row = aoa[i];
  if (!row || !row.some((c) => String(c).trim())) continue;
  const cat = String(row[0] || '').trim();
  if (cat) lastCat = cat;
  const c = (cat || lastCat).toLowerCase();
  if (c.includes('geel')) geel++;
  else if (c.includes('ari')) ari++;
  else if (c.includes('lo')) lo++;
  else if (!cat && lastCat) emptyCat++;
  else skipped++;
}
console.log('Counts geel/lo/ari/emptyCat/skipped:', geel, lo, ari, emptyCat, skipped);
