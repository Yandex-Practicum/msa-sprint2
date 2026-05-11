process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5434';
process.env.DB_USER = process.env.DB_USER || 'history';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'history';
process.env.DB_NAME = process.env.DB_NAME || 'history_db';

const { initDb } = require('./db');
const { startConsumer } = require('./kafka/consumer');

async function main() {
    await initDb();
    await startConsumer();
    console.log('Booking history service running');
}

main().catch(console.error);