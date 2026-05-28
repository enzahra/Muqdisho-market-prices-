require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function getLatestBackupFile() {
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) return null;
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith('db-backup-') && f.endsWith('.json'))
    .sort();
  if (files.length === 0) return null;
  return path.join(backupDir, files[files.length - 1]);
}

async function upsertRows(client, table, rows, conflictKey = 'id') {
  if (!rows || rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const quotedColumns = columns.map((c) => `"${c}"`);
  const updateClause = quotedColumns
    .filter((c) => c !== `"${conflictKey}"`)
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(', ');

  for (const row of rows) {
    const values = columns.map((col) => row[col]);
    const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
    const query = `
      INSERT INTO "${table}" (${quotedColumns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT ("${conflictKey}") DO UPDATE
      SET ${updateClause}
    `;
    await client.query(query, values);
  }
}

async function restore() {
  const backupFile = process.argv[2] || getLatestBackupFile();
  if (!backupFile || !fs.existsSync(backupFile)) {
    console.error('Please provide a valid backup file path.');
    console.error('Usage: npm run db:restore -- backups/db-backup-xyz.json');
    process.exit(1);
  }

  console.log(`Reading backup from ${backupFile}...`);
  const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    await client.query('BEGIN');

    console.log('Restoring Users...');
    await upsertRows(client, 'User', data.users || []);

    console.log('Restoring Categories...');
    await upsertRows(client, 'Category', data.categories || []);

    console.log('Restoring Items...');
    await upsertRows(client, 'Item', data.items || []);

    console.log('Restoring Price Records...');
    await upsertRows(client, 'PriceRecord', data.priceRecords || []);

    console.log('Restoring Audit Logs...');
    await upsertRows(client, 'AuditLog', data.auditLogs || []);

    await client.query('COMMIT');
    console.log('Restore completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Restore failed:', error);
  } finally {
    await client.end();
  }
}

restore();
