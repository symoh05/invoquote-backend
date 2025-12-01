require('dotenv').config();
const { Pool } = require('pg');

console.log('🚀 Quick database setup for Railway...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Connected to Railway PostgreSQL');
    
    // Create tables based on your mainController.js
    await client.query(`
      -- CLIENTS TABLE
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        company_name VARCHAR(255),
        type VARCHAR(50) DEFAULT 'individual',
        company_id INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- INVOICES TABLE
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        client_id INTEGER REFERENCES clients(id),
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        items JSONB,
        subtotal DECIMAL(15,2) DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 16.00,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        payment_status VARCHAR(50) DEFAULT 'pending',
        currency VARCHAR(10) DEFAULT 'KES',
        company_id INTEGER DEFAULT 1,
        balance_due DECIMAL(15,2) DEFAULT 0,
        amount_paid DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- QUOTATIONS TABLE
      CREATE TABLE IF NOT EXISTS quotations (
        id SERIAL PRIMARY KEY,
        quote_number VARCHAR(100) UNIQUE NOT NULL,
        client_id INTEGER REFERENCES clients(id),
        issue_date DATE NOT NULL,
        valid_until DATE NOT NULL,
        items JSONB,
        subtotal DECIMAL(15,2) DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 16.00,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        currency VARCHAR(10) DEFAULT 'KES',
        company_id INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- PRODUCTS TABLE
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) DEFAULT 'service',
        price DECIMAL(15,2) NOT NULL,
        tax_rate DECIMAL(5,2) DEFAULT 16.00,
        is_active BOOLEAN DEFAULT true,
        company_id INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- PAYMENTS TABLE
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id),
        client_id INTEGER REFERENCES clients(id),
        amount DECIMAL(15,2) NOT NULL,
        payment_method VARCHAR(100),
        payment_date DATE NOT NULL,
        reference_number VARCHAR(100),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'completed',
        company_id INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ All tables created!');

    // Add sample data
    console.log('📝 Adding sample data...');
    
    // Check if clients exist
    const clientCount = await client.query('SELECT COUNT(*) FROM clients');
    if (parseInt(clientCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO clients (name, email, phone, address, company_name) 
        VALUES 
        ('John Doe', 'john@example.com', '+254700000001', 'Nairobi, Kenya', 'Doe Enterprises'),
        ('Jane Smith', 'jane@example.com', '+254700000002', 'Mombasa, Kenya', 'Smith Ltd'),
        ('ABC Corporation', 'info@abccorp.com', '+254700000003', 'Westlands, Nairobi', 'ABC Corp Ltd')
        ON CONFLICT DO NOTHING;
      `);
      console.log('✅ Added 3 sample clients');
    }

    // Check if products exist
    const productCount = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(productCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO products (name, description, price, tax_rate) 
        VALUES 
        ('Website Development', 'Custom website design and development', 50000.00, 16.00),
        ('Mobile App Development', 'iOS and Android app development', 75000.00, 16.00),
        ('SEO Services', 'Search engine optimization', 15000.00, 16.00),
        ('IT Consulting', 'Professional IT consultation', 3000.00, 16.00)
        ON CONFLICT DO NOTHING;
      `);
      console.log('✅ Added 4 sample products');
    }

    // Show summary
    console.log('\n📊 Database Summary:');
    const tables = ['clients', 'invoices', 'quotations', 'products', 'payments'];
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   ${table}: ${result.rows[0].count} records`);
      } catch (err) {
        console.log(`   ${table}: Table exists`);
      }
    }

  } catch (error) {
    console.error('❌ Setup error:', error.message);
  } finally {
    client.release();
    await pool.end();
    console.log('\n🎉 Database setup complete!');
    console.log('🔗 Test your endpoints:');
    console.log('   - https://invoquote-backend-production.up.railway.app/api/clients');
    console.log('   - https://invoquote-backend-production.up.railway.app/api/products');
    console.log('   - https://invoquote-backend-production.up.railway.app/api/test');
    process.exit(0);
  }
}

setupDatabase();