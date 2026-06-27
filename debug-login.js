require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function debug() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    // List all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        isAdmin: true,
        adminRole: true,
        password: true,
      }
    });
    
    console.log('=== ALL USERS IN DATABASE ===');
    for (const u of users) {
      const pwdLen = u.password ? u.password.length : 0;
      const pwdStart = u.password ? u.password.substring(0, 10) : 'NULL';
      const isBcrypt = u.password ? u.password.startsWith('$2') : false;
      console.log(`  Email: ${u.email}`);
      console.log(`    fullName: ${u.fullName}`);
      console.log(`    isAdmin: ${u.isAdmin}`);
      console.log(`    adminRole: ${u.adminRole}`);
      console.log(`    password length: ${pwdLen}`);
      console.log(`    password starts with: ${pwdStart}`);
      console.log(`    is bcrypt hash: ${isBcrypt}`);
      console.log('');
    }

    // Now test: try to bcrypt.compare a known password with each user's hash
    console.log('=== TESTING PASSWORD COMPARISON ===');
    const testPasswords = ['admin123', 'password', '123456', 'Admin123', 'test123'];
    
    for (const u of users) {
      if (!u.password) continue;
      console.log(`\nTesting user: ${u.email}`);
      for (const pwd of testPasswords) {
        const match = await bcrypt.compare(pwd, u.password);
        if (match) {
          console.log(`  ✅ Password "${pwd}" MATCHES for ${u.email}`);
        }
      }
    }
    
    // Test hashing and comparison works correctly
    console.log('\n=== BCRYPT ROUNDTRIP TEST ===');
    const testPwd = 'testPassword123';
    const hashed = await bcrypt.hash(testPwd, 10);
    const match = await bcrypt.compare(testPwd, hashed);
    console.log(`  Hash: ${hashed}`);
    console.log(`  Compare result: ${match}`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
