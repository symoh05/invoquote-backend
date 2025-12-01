const { Pool } = require('pg');
require('dotenv').config();

console.log('🔌 Initializing database connection...');
console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};