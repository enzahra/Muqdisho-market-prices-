const XLSX = require('xlsx');

function normalizeKey(key) {
  return String(key).toLowerCase().trim().replace(/[''`]/g, '').replace(/[^a-z0-9]/g, '');
}

const HEADER_ALIASES = {
  category: ['xoolaha', 'category', 'qaybta'],
  name: ['nuuca', 'nooca', 'name', 'magac'],
  grade: ['heerka', 'heer', 'grade'],
  gu: ['gu'],
  xagaa: ['xagaa'],
  dayr: ['dayr'],
  jiilaal: ['jiilaal', 'jilaal'],
};

function headerMatches(nk, aliases) {
  return aliases.some((a) => nk === a || nk.startsWith(a) || nk.includes(a));
}

function detectColumnMap(headers) {
  const normalized = headers.map((h) => normalizeKey(h));
  const findCol = (field) => {
    for (let i = 0; i < normalized.length; i++) {
      if (headerMatches(normalized[i], HEADER_ALIASES[field])) return i;
    }
    return -1;
  };
  const name = findCol('name');
  const grade = findCol('grade');
  const gu = findCol('gu');
  const xagaa = findCol('xagaa');
  if (name >= 0 && grade >= 0 && gu >= 0 && xagaa >= 0) {
    return {
      category: findCol('category') >= 0 ? findCol('category') : 0,
      name,
      grade,
      gu,
      xagaa,
      dayr: findCol('dayr') >= 0 ? findCol('dayr') : xagaa + 1,
      jiilaal: findCol('jiilaal') >= 0 ? findCol('jiilaal') : xagaa + 2,
    };
  }
  return null;
}

const rows = [
  ['Xoolaha', 'Nuuca', 'Heerka', 'Gu', 'Xagaa', 'Dayr', 'Jiilaal'],
  ['Ari', 'Neyl', 'Birimo', 120, 110, 115, 105],
  ['Lo\'', 'Sac', 'Birimo', 450, 420, 440, 400],
];

const cols = detectColumnMap(rows[0]);
console.log('Column map:', cols);
if (!cols) {
  console.error('FAIL: no column map');
  process.exit(1);
}
console.log('OK: Somali headers detected');
