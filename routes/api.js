const express = require('express');
const router = express.Router();
const controller = require('../controllers/mainController');
const { Pool } = require('pg');

// ========== ROOT /api ENDPOINT ==========
router.get('/', (req, res) => {
  res.json({
    message: 'InvoQuot API',
    version: '1.0.0',
    company: 'AksagenSet Services',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      test: 'GET /api/test',
      init_db: 'POST /api/init-db',
      clients: {
        get: 'GET /api/clients',
        post: 'POST /api/clients'
      },
      invoices: {
        get: 'GET /api/invoices',
        post: 'POST /api/invoices',
        pdf: 'GET /api/invoices/:id/pdf'
      },
      quotations: {
        get: 'GET /api/quotations',
        post: 'POST /api/quotations',
        pdf: 'GET /api/quotations/:id/pdf'
      },
      products: {
        get: 'GET /api/products',
        post: 'POST /api/products'
      },
      payments: {
        get: 'GET /api/payments',
        post: 'POST /api/payments'
      }
    },
    database: 'PostgreSQL on Railway',
    timestamp: new Date().toISOString()
  });
});

// ========== DATABASE INITIALIZATION ==========
router.post('/init-db', async (req, res) => {
  try {
    console.log('🚀 Initializing database tables...');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    
    try {
      console.log('✅ Connected to Railway PostgreSQL');
      
      // Create clients table
      await client.query(`
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
      `);
      console.log('✅ Clients table created');
      
      // Create invoices table
      await client.query(`
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
      `);
      console.log('✅ Invoices table created');
      
      // Create quotations table
      await client.query(`
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
      `);
      console.log('✅ Quotations table created');
      
      // Create products table
      await client.query(`
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
      `);
      console.log('✅ Products table created');
      
      // Create payments table
      await client.query(`
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
      console.log('✅ Payments table created');
      
      // Add sample data if tables are empty
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

      // Get final counts
      const finalClients = await client.query('SELECT COUNT(*) FROM clients');
      const finalProducts = await client.query('SELECT COUNT(*) FROM products');
      const finalInvoices = await client.query('SELECT COUNT(*) FROM invoices');
      
      client.release();
      await pool.end();
      
      res.json({
        success: true,
        message: 'Database initialized successfully!',
        tables_created: ['clients', 'invoices', 'quotations', 'products', 'payments'],
        data_summary: {
          clients: parseInt(finalClients.rows[0].count),
          products: parseInt(finalProducts.rows[0].count),
          invoices: parseInt(finalInvoices.rows[0].count)
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Setup error:', error.message);
      if (client) client.release();
      throw error;
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize database',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== TEST ENDPOINTS ==========
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'InvoQuot Backend is running',
    company: 'AksagenSet Services',
    timestamp: new Date().toISOString()
  });
});

router.get('/test', controller.testAPI);

// ========== CLIENT ROUTES ==========
router.get('/clients', controller.getClients);
router.post('/clients', controller.createClient);

// ========== INVOICE ROUTES ==========
router.get('/invoices', controller.getInvoices);
router.post('/invoices', controller.createInvoice);
router.get('/invoices/:id/pdf', controller.generateInvoicePDF);

// ========== QUOTATION ROUTES ==========
router.get('/quotations', controller.getQuotations);
router.post('/quotations', controller.createQuotation);
router.get('/quotations/:id/pdf', controller.generateQuotationPDF);

// ========== PRODUCT ROUTES ==========
router.get('/products', controller.getProducts);
router.post('/products', controller.createProduct);

// ========== PAYMENT ROUTES ==========
router.get('/payments', controller.getPayments);
router.post('/payments', controller.recordPayment);

// ========== DATABASE STATUS CHECK ==========
router.get('/db-status', async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    
    try {
      // Check if tables exist
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      const tableNames = tables.rows.map(row => row.table_name);
      
      // Get counts for existing tables
      const counts = {};
      for (const table of tableNames) {
        try {
          const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
          counts[table] = parseInt(countResult.rows[0].count);
        } catch (err) {
          counts[table] = 'Error';
        }
      }
      
      client.release();
      await pool.end();
      
      res.json({
        success: true,
        database: 'PostgreSQL (Railway)',
        connection: 'Connected',
        tables_exist: tableNames,
        table_counts: counts,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      if (client) client.release();
      throw error;
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check database status',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;