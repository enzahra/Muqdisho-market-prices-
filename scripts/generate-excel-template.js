const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const rows = [
  {
    category: 'geel',
    name: 'Awr',
    'grade (birimo/sugunto)': 'birimo',
    gu: 1200,
    xagaa: 2500,
    dayr: 1100,
    jiilaal: 2300,
  },
  {
    category: 'geel',
    name: 'Awr',
    'grade (birimo/sugunto)': 'sugunto',
    gu: 850,
    xagaa: 900,
    dayr: 800,
    jiilaal: 750,
  },
  {
    category: 'lo',
    name: 'Dibi',
    'grade (birimo/sugunto)': 'birimo',
    gu: 650,
    xagaa: 700,
    dayr: 625,
    jiilaal: 580,
  },
  {
    category: 'ari',
    name: 'Orgi',
    'grade (birimo/sugunto)': 'birimo',
    gu: 120,
    xagaa: 250,
    dayr: 110,
    jiilaal: 230,
  },
];

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'livestock');
const out = path.join(__dirname, '../data/livestock-template.xlsx');
XLSX.writeFile(wb, out);
console.log('Wrote', out);
