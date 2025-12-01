const { query } = require('../config/database');

async function setupDatabase() {
  try {
    console.log('🔄 Setting up database tables...');

    // Clients table
    await query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        company_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Clients table created');

    // Invoices table
    await query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        client_id INTEGER REFERENCES clients(id),
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        items JSONB NOT NULL,
        subtotal DECIMAL(15,2) NOT NULL,
        tax_rate DECIMAL(5,2) DEFAULT 16,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Invoices table created');

    // Quotations table
    await query(`
      CREATE TABLE IF NOT EXISTS quotations (
        id SERIAL PRIMARY KEY,
        quote_number VARCHAR(100) UNIQUE NOT NULL,
        client_id INTEGER REFERENCES clients(id),
        issue_date DATE NOT NULL,
        valid_until DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        items JSONB NOT NULL,
        subtotal DECIMAL(15,2) NOT NULL,
        tax_rate DECIMAL(5,2) DEFAULT 16,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Quotations table created');

    // Insert sample company data
    await query(`
      INSERT INTO clients (name, company_name, email, phone, address) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
    `, [
      'AksagenSet Services',
      'AksagenSet Services',
      'info@aksagensetservices.co.ke',
      '+254 XXX XXX XXX',
      'Nairobi, Kenya'
    ]);
    console.log('✅ Sample data inserted');

    console.log('🎉 Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup error:', error);
    process.exit(1);
  }
}

setupDatabase();