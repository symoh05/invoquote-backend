const express = require('express');
const router = express.Router();
const controller = require('../controllers/mainController');

// ========== TEST ENDPOINTS ==========
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'InvoQuot Backend is running',
    company: 'AksagenSet Services',
    timestamp: new Date().toISOString()
  });
});

router.get('/test', controller.testAPI); // Add this line

// ========== EXISTING ROUTES ==========
// Clients
router.get('/clients', controller.getClients);
router.post('/clients', controller.createClient);

// Invoices
router.get('/invoices', controller.getInvoices);
router.post('/invoices', controller.createInvoice);
router.get('/invoices/:id/pdf', controller.generateInvoicePDF);

// Quotations
router.get('/quotations', controller.getQuotations);
router.post('/quotations', controller.createQuotation);
router.get('/quotations/:id/pdf', controller.generateQuotationPDF);

// Products
router.get('/products', controller.getProducts);
router.post('/products', controller.createProduct);

// Payments
router.get('/payments', controller.getPayments);
router.post('/payments', controller.recordPayment);

module.exports = router;