// Database initialization endpoint
app.post('/api/init-db', async (req, res) => {
  try {
    const { Pool } = require('pg');
    
    console.log('🚀 Initializing database tables...');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    
    try {
      console.log('✅ Connected to Railway PostgreSQL');
      
      // Create clients table first (others depend on it)
      await client.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          address TEXT,
          company_name VARCHAR(255),
          company_id INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ Clients table created');
      
      res.json({
        success: true,
        message: 'Database initialized',
        tables_created: ['clients']
      });

    } catch (error) {
      console.error('❌ Setup error:', error.message);
      throw error;
    } finally {
      client.release();
      await pool.end();
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize database',
      error: error.message
    });
  }
});