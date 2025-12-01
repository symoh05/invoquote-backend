const { Pool } = require('pg');

// Common PostgreSQL passwords to try
const passwordAttempts = [
  'postgres',    // Most common default
  'password',    // Very common
  '123456',      // Common simple password
  'admin',       // Common admin password
  'Postgres',    // Capitalized version
  'PostgreSQL',  // Full name
  '',            // No password (blank)
  'root',        // System admin style
  'postgres123', // With numbers
];

async function testPassword(password) {
  const connectionString = `postgresql://postgres:${password}@localhost:5432/invoquot`;
  const pool = new Pool({ connectionString });
  
  try {
    const client = await pool.connect();
    console.log(`✅ SUCCESS! Password found: "${password}"`);
    
    // Test if our data is there
    const clients = await client.query('SELECT COUNT(*) as count FROM clients');
    const invoices = await client.query('SELECT COUNT(*) as count FROM invoices');
    
    console.log(`📊 Database check:`);
    console.log(`   👥 Clients: ${clients.rows[0].count}`);
    console.log(`   🧾 Invoices: ${invoices.rows[0].count}`);
    console.log(`   📋 Database: invoquot`);
    console.log(`   👤 Username: postgres`);
    console.log(`   🖥️  Server: localhost:5432`);
    
    console.log(`\n🎉 USE THIS IN YOUR .env FILE:`);
    console.log(`DATABASE_URL=postgresql://postgres:${password}@localhost:5432/invoquot`);
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.log(`❌ Failed: "${password}"`);
    await pool.end();
    return false;
  }
}

async function findPassword() {
  console.log('🔍 Testing common PostgreSQL passwords...\n');
  
  for (const password of passwordAttempts) {
    const found = await testPassword(password);
    if (found) {
      return;
    }
  }
  
  console.log('\n❌ None of the common passwords worked.');
  console.log('\n💡 Try these solutions:');
  console.log('1. Remember what password you set during PostgreSQL installation');
  console.log('2. Check if you wrote it down somewhere');
  console.log('3. Try your computer login password');
  console.log('4. Reset PostgreSQL password (see instructions below)');
}

findPassword();