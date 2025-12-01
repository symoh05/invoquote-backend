const { Pool } = require('pg');

// Test all common password scenarios
const testConfigs = [
  { name: 'No password', url: 'postgresql://postgres:@localhost:5432/invoquot' },
  { name: 'Password: postgres', url: 'postgresql://postgres:postgres@localhost:5432/invoquot' },
  { name: 'Password: password', url: 'postgresql://postgres:password@localhost:5432/invoquot' },
  { name: 'Password: 123456', url: 'postgresql://postgres:123456@localhost:5432/invoquot' },
  { name: 'Password: admin', url: 'postgresql://postgres:admin@localhost:5432/invoquot' },
];

async function testConnection(config) {
  const pool = new Pool({ connectionString: config.url });
  
  try {
    const client = await pool.connect();
    console.log(`🎉 SUCCESS: ${config.name}`);
    console.log(`   ✅ Working URL: ${config.url}`);
    
    // Test if our tables exist
    try {
      const clients = await client.query('SELECT COUNT(*) FROM clients');
      const invoices = await client.query('SELECT COUNT(*) FROM invoices');
      console.log(`   📊 Data: ${clients.rows[0].count} clients, ${invoices.rows[0].count} invoices`);
    } catch (e) {
      console.log('   📊 Database connected but no tables found (normal for new DB)');
    }
    
    client.release();
    await pool.end();
    return config.url;
  } catch (error) {
    console.log(`❌ Failed: ${config.name}`);
    await pool.end();
    return null;
  }
}

async function findDatabase() {
  console.log('🔍 Testing PostgreSQL connections...\n');
  
  let workingUrl = null;
  
  for (const config of testConfigs) {
    const url = await testConnection(config);
    if (url) {
      workingUrl = url;
      break;
    }
  }
  
  if (workingUrl) {
    console.log('\n✨ SUCCESS! Use this in your .env file:');
    console.log(`DATABASE_URL=${workingUrl}`);
    
    // Auto-create .env file
    const fs = require('fs');
    fs.writeFileSync('.env', `DATABASE_URL=${workingUrl}\nPORT=5000\nCOMPANY_NAME=AksagenSet Services\nNODE_ENV=development`);
    console.log('✅ .env file created automatically!');
  } else {
    console.log('\n❌ No working connection found.');
    console.log('\n🔧 Try these solutions:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Try installing PostgreSQL again');
    console.log('3. Or use Docker: docker run --name invoquot-db -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=invoquot -p 5432:5432 -d postgres');
  }
}

findDatabase();