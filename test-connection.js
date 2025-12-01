require('dotenv').config();
const { Pool } = require('pg');

console.log('🔌 Testing database connection with your password...');
console.log('Database URL:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Check all tables and data
    console.log('\n📊 DATABASE CONTENTS:');
    
    // Clients
    const clients = await client.query('SELECT * FROM clients');
    console.log(`👥 CLIENTS (${clients.rows.length}):`);
    clients.rows.forEach(client => {
      console.log(`   - ${client.name} (${client.company_name})`);
    });
    
    // Invoices
    const invoices = await client.query('SELECT * FROM invoices');
    console.log(`\n🧾 INVOICES (${invoices.rows.length}):`);
    invoices.rows.forEach(invoice => {
      console.log(`   - ${invoice.invoice_number}: KSh ${invoice.total} (${invoice.status})`);
    });
    
    // Quotations
    const quotes = await client.query('SELECT * FROM quotations');
    console.log(`\n📋 QUOTATIONS (${quotes.rows.length}):`);
    quotes.rows.forEach(quote => {
      console.log(`   - ${quote.quote_number}: KSh ${quote.total} (${quote.status})`);
    });
    
    console.log('\n🎉 YOUR DATABASE IS READY FOR INVOQUOT APP!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
    process.exit(0);
  }
}

testConnection();