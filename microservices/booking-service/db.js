const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'booking-db',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'booking',
    password: process.env.DB_PASSWORD || 'booking',
    database: process.env.DB_NAME || 'booking_db',
});

const initDb = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      hotel_id VARCHAR(100) NOT NULL,
      promo_code VARCHAR(50),
      discount_percent DECIMAL(5,2) DEFAULT 0,
      price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
    await pool.query(query);
    console.log('Database initialized');
};

module.exports = { pool, initDb };