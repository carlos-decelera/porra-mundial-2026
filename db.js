require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS predictions (
      participant_id TEXT REFERENCES participants(id),
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (participant_id)
    );
    CREATE TABLE IF NOT EXISTS results (
      id INT PRIMARY KEY DEFAULT 1,
      data JSONB,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

module.exports = { pool, initDb };
