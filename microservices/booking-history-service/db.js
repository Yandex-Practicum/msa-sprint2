const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const initDb = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS booking_history (
      id SERIAL PRIMARY KEY,
      booking_id VARCHAR(50) NOT NULL,
      user_id VARCHAR(100) NOT NULL,
      hotel_id VARCHAR(100) NOT NULL,
      promo_code VARCHAR(50),
      discount_percent DECIMAL(5,2) DEFAULT 0,
      price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP NOT NULL,
      received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
    await pool.query(query);
    console.log('History database initialized');
};

module.exports = { pool, initDb };