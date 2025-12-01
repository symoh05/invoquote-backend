const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ========== TEST ROUTES ==========

// Health check (already exists at /api/health)
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'InvoQuot Backend is running',
    company: 'AksagenSet Services',
    timestamp: new Date().toISOString()
  });
});

// New test endpoint for frontend
router.get('/test', async (req, res) => {
  try {
    // Test database connection
    const dbResult = await pool.query('SELECT NOW()');
    
    res.json({
      success: true,
      message: 'API is working!',
      database_time: dbResult.rows[0].now,
      environment: process.env.NODE_ENV || 'development',
      company: process.env.COMPANY_NAME || 'AksagenSet Services'
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// ========== CLIENT ROUTES ==========

// Get all clients
router.get('/clients', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, address, company_name FROM clients WHERE is_active = true ORDER BY name'
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients',
      error: error.message
    });
  }
});

// Create a client
router.post('/clients', async (req, res) => {
  try {
    const { name, email, phone, address, company_name } = req.body;
    
    const result = await pool.query(
      `INSERT INTO clients (name, email, phone, address, company_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, name, email, phone, address, company_name`,
      [name, email || null, phone || null, address || null, company_name || null]
    );
    
    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create client',
      error: error.message
    });
  }
});

// ========== INVOICE ROUTES ==========

// Get all invoices
router.get('/invoices', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, c.name as client_name 
       FROM invoices i 
       LEFT JOIN clients c ON i.client_id = c.id 
       ORDER BY i.created_at DESC`
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices'
    });
  }
});

// Create invoice
router.post('/invoices', async (req, res) => {
  try {
    const {
      client_id,
      issue_date,
      due_date,
      items,
      notes,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      status = 'draft',
      payment_status = 'pending',
      currency = 'KES',
      company_id = 1
    } = req.body;

    console.log('📦 Creating invoice for client:', client_id);

    // Validate required fields
    if (!client_id || !issue_date || !due_date || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: client_id, issue_date, due_date, and items are required'
      });
    }

    // Start transaction
    await pool.query('BEGIN');

    // Get next invoice number
    const invoiceNumberResult = await pool.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+') AS INTEGER)), 0) + 1 as next_number 
       FROM invoices WHERE company_id = $1`,
      [company_id]
    );
    
    const nextNumber = invoiceNumberResult.rows[0].next_number;
    const invoice_number = `INV${String(nextNumber).padStart(5, '0')}`;

    // Create invoice
    const invoiceResult = await pool.query(
      `INSERT INTO invoices (
        client_id, issue_date, due_date, invoice_number, subtotal, tax_rate, 
        tax_amount, total, status, payment_status, currency, company_id, 
        notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *`,
      [
        client_id, issue_date, due_date, invoice_number, subtotal || 0, tax_rate || 16,
        tax_amount || 0, total || 0, status, payment_status, currency, company_id,
        notes || ''
      ]
    );

    const invoice = invoiceResult.rows[0];

    // Create invoice items (if you have invoice_items table)
    // If not, you might need to store items differently
    for (const item of items) {
      await pool.query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          invoice.id,
          item.description,
          item.quantity || 1,
          item.unit_price || 0,
          (item.quantity || 1) * (item.unit_price || 0)
        ]
      );
    }

    await pool.query('COMMIT');

    console.log('✅ Invoice created:', invoice.id);

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error creating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice',
      error: error.message
    });
  }
});

// Get invoice by ID
router.get('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoiceResult = await pool.query(
      `SELECT i.*, c.name as client_name, c.email as client_email, 
              c.phone as client_phone, c.address as client_address
       FROM invoices i 
       LEFT JOIN clients c ON i.client_id = c.id 
       WHERE i.id = $1`,
      [id]
    );
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    const itemsResult = await pool.query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id',
      [id]
    );
    
    const invoice = invoiceResult.rows[0];
    invoice.items = itemsResult.rows;
    
    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice'
    });
  }
});

// ========== PRODUCT ROUTES ==========

// Get all products
router.get('/products', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE is_active = true ORDER BY name'
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

module.exports = router;