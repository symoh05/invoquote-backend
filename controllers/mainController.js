const { query } = require('../config/database');
const PDFDocument = require('pdfkit');
const moment = require('moment');

class MainController {
  // Generate document numbers
  generateDocNumber(prefix) {
    const date = new Date();
    const timestamp = `${date.getFullYear().toString().slice(2)}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  // Calculate totals
  calculateTotals(items, taxRate = 16) {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax_amount = (subtotal * taxRate) / 100;
    const total = subtotal + tax_amount;
    return { subtotal, tax_amount, total, tax_rate: taxRate };
  }

  // TEST API ENDPOINT - ADD THIS METHOD
  async testAPI(req, res) {
    try {
      // Test database connection
      const dbResult = await query('SELECT NOW()');
      
      res.json({
        success: true,
        message: 'InvoQuot API is working!',
        database_time: dbResult.rows[0].now,
        environment: process.env.NODE_ENV || 'development',
        company: process.env.COMPANY_NAME || 'AksagenSet Services',
        version: '1.0.0',
        endpoints: {
          health: '/api/health',
          test: '/api/test',
          clients: '/api/clients',
          invoices: '/api/invoices',
          quotations: '/api/quotations',
          products: '/api/products',
          payments: '/api/payments'
        }
      });
    } catch (error) {
      console.error('Database test error:', error);
      res.status(500).json({
        success: false,
        message: 'Database connection failed',
        error: error.message
      });
    }
  }

  // CLIENTS
  async getClients(req, res) {
    try {
      const result = await query('SELECT * FROM clients WHERE company_id = 1 ORDER BY created_at DESC');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  }

  async createClient(req, res) {
    try {
      const { name, email, phone, address, company_name, type = 'individual' } = req.body;
      const result = await query(
        'INSERT INTO clients (name, email, phone, address, company_name, type, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [name, email, phone, address, company_name, type, 1]
      );
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({ error: 'Failed to create client' });
    }
  }

  // INVOICES
  async getInvoices(req, res) {
    try {
      const result = await query(`
        SELECT i.*, c.name as client_name, c.company_name 
        FROM invoices i 
        LEFT JOIN clients c ON i.client_id = c.id 
        WHERE i.company_id = 1
        ORDER BY i.created_at DESC
      `);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  }

  async createInvoice(req, res) {
    try {
      const { client_id, issue_date, due_date, items, notes } = req.body;
      const totals = this.calculateTotals(items);
      const invoice_number = this.generateDocNumber('INV');

      const result = await query(
        `INSERT INTO invoices (
          invoice_number, client_id, issue_date, due_date, items, 
          subtotal, tax_rate, tax_amount, total, notes, company_id, balance_due
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [invoice_number, client_id, issue_date, due_date, JSON.stringify(items),
         totals.subtotal, totals.tax_rate, totals.tax_amount, totals.total, notes, 1, totals.total]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  }

  async generateInvoicePDF(req, res) {
    try {
      const { id } = req.params;
      
      const result = await query(`
        SELECT i.*, c.name as client_name, c.email as client_email, 
               c.phone as client_phone, c.address as client_address,
               c.company_name as client_company
        FROM invoices i 
        LEFT JOIN clients c ON i.client_id = c.id 
        WHERE i.id = $1 AND i.company_id = 1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const invoice = result.rows[0];
      const doc = new PDFDocument();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_number}.pdf`);
      
      doc.pipe(res);

      // Add content to PDF
      this.generateInvoicePDFContent(doc, invoice);
      
      doc.end();
    } catch (error) {
      console.error('Generate PDF error:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }

  generateInvoicePDFContent(doc, invoice) {
    // Company Info
    doc.fontSize(20).text('INVOICE', 50, 50);
    doc.fontSize(10)
       .text('AksagenSet Services', 50, 80)
       .text('Nairobi, Kenya', 50, 95)
       .text('+254 XXX XXX XXX', 50, 110)
       .text('info@aksagensetservices.co.ke', 50, 125);

    // Invoice Details
    doc.fontSize(12)
       .text(`Invoice Number: ${invoice.invoice_number}`, 350, 80)
       .text(`Issue Date: ${moment(invoice.issue_date).format('DD/MM/YYYY')}`, 350, 95)
       .text(`Due Date: ${moment(invoice.due_date).format('DD/MM/YYYY')}`, 350, 110)
       .text(`Status: ${invoice.status}`, 350, 125);

    // Client Info
    doc.text('Bill To:', 50, 160)
       .text(invoice.client_company || invoice.client_name, 50, 175)
       .text(invoice.client_address, 50, 190);

    // Items Table Header
    let y = 240;
    doc.text('Description', 50, y);
    doc.text('Qty', 300, y);
    doc.text('Price', 350, y);
    doc.text('Amount', 420, y);
    
    y += 20;

    // Items
    const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
    items.forEach(item => {
      doc.text(item.description.substring(0, 40), 50, y);
      doc.text(item.quantity.toString(), 300, y);
      doc.text(`KSh ${item.unit_price.toFixed(2)}`, 350, y);
      doc.text(`KSh ${(item.quantity * item.unit_price).toFixed(2)}`, 420, y);
      y += 20;
    });

    // Totals
    y += 20;
    doc.text(`Subtotal: KSh ${invoice.subtotal.toFixed(2)}`, 350, y);
    y += 15;
    doc.text(`Tax (${invoice.tax_rate}%): KSh ${invoice.tax_amount.toFixed(2)}`, 350, y);
    y += 15;
    doc.text(`Total: KSh ${invoice.total.toFixed(2)}`, 350, y);
    
    // Notes
    if (invoice.notes) {
      y += 30;
      doc.text('Notes:', 50, y);
      doc.text(invoice.notes, 50, y + 15);
    }
  }

  // QUOTATIONS
  async getQuotations(req, res) {
    try {
      const result = await query(`
        SELECT q.*, c.name as client_name, c.company_name 
        FROM quotations q 
        LEFT JOIN clients c ON q.client_id = c.id 
        WHERE q.company_id = 1
        ORDER BY q.created_at DESC
      `);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Get quotations error:', error);
      res.status(500).json({ error: 'Failed to fetch quotations' });
    }
  }

  async createQuotation(req, res) {
    try {
      const { client_id, issue_date, valid_until, items, notes } = req.body;
      const totals = this.calculateTotals(items);
      const quote_number = this.generateDocNumber('QUO');

      const result = await query(
        `INSERT INTO quotations (
          quote_number, client_id, issue_date, valid_until, items, 
          subtotal, tax_rate, tax_amount, total, notes, company_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [quote_number, client_id, issue_date, valid_until, JSON.stringify(items),
         totals.subtotal, totals.tax_rate, totals.tax_amount, totals.total, notes, 1]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Create quotation error:', error);
      res.status(500).json({ error: 'Failed to create quotation' });
    }
  }

  async generateQuotationPDF(req, res) {
    try {
      const { id } = req.params;
      
      const result = await query(`
        SELECT q.*, c.name as client_name, c.email as client_email, 
               c.phone as client_phone, c.address as client_address,
               c.company_name as client_company
        FROM quotations q 
        LEFT JOIN clients c ON q.client_id = c.id 
        WHERE q.id = $1 AND q.company_id = 1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Quotation not found' });
      }

      const quotation = result.rows[0];
      const doc = new PDFDocument();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=quotation-${quotation.quote_number}.pdf`);
      
      doc.pipe(res);

      // Add content to PDF
      this.generateQuotationPDFContent(doc, quotation);
      
      doc.end();
    } catch (error) {
      console.error('Generate quotation PDF error:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }

  generateQuotationPDFContent(doc, quotation) {
    // Company Info
    doc.fontSize(20).text('QUOTATION', 50, 50);
    doc.fontSize(10)
       .text('AksagenSet Services', 50, 80)
       .text('Nairobi, Kenya', 50, 95)
       .text('+254 XXX XXX XXX', 50, 110)
       .text('info@aksagensetservices.co.ke', 50, 125);

    // Quotation Details
    doc.fontSize(12)
       .text(`Quotation Number: ${quotation.quote_number}`, 350, 80)
       .text(`Issue Date: ${moment(quotation.issue_date).format('DD/MM/YYYY')}`, 350, 95)
       .text(`Valid Until: ${moment(quotation.valid_until).format('DD/MM/YYYY')}`, 350, 110)
       .text(`Status: ${quotation.status}`, 350, 125);

    // Client Info
    doc.text('Quote To:', 50, 160)
       .text(quotation.client_company || quotation.client_name, 50, 175)
       .text(quotation.client_address, 50, 190);

    // Items Table Header
    let y = 240;
    doc.text('Description', 50, y);
    doc.text('Qty', 300, y);
    doc.text('Price', 350, y);
    doc.text('Amount', 420, y);
    
    y += 20;

    // Items
    const items = typeof quotation.items === 'string' ? JSON.parse(quotation.items) : quotation.items;
    items.forEach(item => {
      doc.text(item.description.substring(0, 40), 50, y);
      doc.text(item.quantity.toString(), 300, y);
      doc.text(`KSh ${item.unit_price.toFixed(2)}`, 350, y);
      doc.text(`KSh ${(item.quantity * item.unit_price).toFixed(2)}`, 420, y);
      y += 20;
    });

    // Totals
    y += 20;
    doc.text(`Subtotal: KSh ${quotation.subtotal.toFixed(2)}`, 350, y);
    y += 15;
    doc.text(`Tax (${quotation.tax_rate}%): KSh ${quotation.tax_amount.toFixed(2)}`, 350, y);
    y += 15;
    doc.text(`Total: KSh ${quotation.total.toFixed(2)}`, 350, y);
    
    // Validity Notice
    y += 30;
    doc.text('This quotation is valid until:', 50, y);
    doc.text(moment(quotation.valid_until).format('DD/MM/YYYY'), 50, y + 15);
    
    // Notes
    if (quotation.notes) {
      y += 30;
      doc.text('Notes:', 50, y);
      doc.text(quotation.notes, 50, y + 15);
    }
  }

  // PRODUCTS
  async getProducts(req, res) {
    try {
      const result = await query('SELECT * FROM products WHERE company_id = 1 AND is_active = true ORDER BY name');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  async createProduct(req, res) {
    try {
      const { name, description, type, price, tax_rate } = req.body;
      const result = await query(
        'INSERT INTO products (name, description, type, price, tax_rate, company_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, description, type, price, tax_rate, 1]
      );
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }

  // PAYMENTS
  async getPayments(req, res) {
    try {
      const result = await query(`
        SELECT p.*, i.invoice_number, c.name as client_name 
        FROM payments p 
        LEFT JOIN invoices i ON p.invoice_id = i.id 
        LEFT JOIN clients c ON p.client_id = c.id 
        WHERE p.company_id = 1
        ORDER BY p.payment_date DESC
      `);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Get payments error:', error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  }

  async recordPayment(req, res) {
    try {
      const { invoice_id, amount, payment_method_id, payment_date, reference_number } = req.body;
      
      // Record payment
      const paymentResult = await query(
        `INSERT INTO payments (invoice_id, amount, payment_method_id, payment_date, reference_number, company_id) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [invoice_id, amount, payment_method_id, payment_date, reference_number, 1]
      );

      // Update invoice payment status
      await query(
        `UPDATE invoices SET 
         amount_paid = amount_paid + $1,
         balance_due = balance_due - $1,
         payment_status = CASE 
           WHEN (amount_paid + $1) >= total THEN 'paid'
           WHEN (amount_paid + $1) > 0 THEN 'partial'
           ELSE 'pending'
         END
         WHERE id = $2`,
        [amount, invoice_id]
      );

      res.json({ success: true, data: paymentResult.rows[0] });
    } catch (error) {
      console.error('Record payment error:', error);
      res.status(500).json({ error: 'Failed to record payment' });
    }
  }
}

module.exports = new MainController();