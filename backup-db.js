require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function backup() {
  const BACKUP_DIR = path.join(__dirname, 'backups');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `db-backup-${dateStr}.json`);

  console.log('Fetching database records...');
  
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const users = (await client.query('SELECT * FROM "User" ORDER BY "createdAt" ASC')).rows;
    const categories = (await client.query('SELECT * FROM "Category" ORDER BY "createdAt" ASC')).rows;
    const items = (await client.query('SELECT * FROM "Item" ORDER BY "createdAt" ASC')).rows;
    const priceRecords = (await client.query('SELECT * FROM "PriceRecord" ORDER BY "timestamp" ASC')).rows;
    const auditLogs = (await client.query('SELECT * FROM "AuditLog" ORDER BY "timestamp" ASC')).rows;

    const data = {
      metadata: {
        generatedAt: new Date().toISOString(),
        databaseUrlPresent: Boolean(process.env.DATABASE_URL)
      },
      users,
      categories,
      items,
      priceRecords,
      auditLogs
    };

    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
    console.log(`Backup successfully saved to: ${backupFile}`);

    if (process.argv.includes('--verify')) {
      const written = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      console.log('Backup verification summary:');
      console.log(
        JSON.stringify(
          {
            users: (written.users || []).length,
            categories: (written.categories || []).length,
            items: (written.items || []).length,
            priceRecords: (written.priceRecords || []).length,
            auditLogs: (written.auditLogs || []).length
          },
          null,
          2
        )
      );
    }

    await client.end();
  } catch (error) {
    console.error('Backup failed:', error);
  }
}

backup();
