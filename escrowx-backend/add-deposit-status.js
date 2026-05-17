import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Add deposit_status column to trades table
const addDepositStatusColumn = async () => {
  console.log('🔄 Adding deposit_status column to trades table...');
  
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'escrowx',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432
  });

  try {
    // Add deposit_status column if it doesn't exist
    await pool.query(`
      ALTER TABLE trades 
      ADD COLUMN IF NOT EXISTS deposit_status VARCHAR(50) DEFAULT 'PENDING'
    `);
    console.log('✅ deposit_status column added to trades table');
    
    // Update existing trades to have PENDING deposit status
    await pool.query(`
      UPDATE trades 
      SET deposit_status = 'PENDING' 
      WHERE deposit_status IS NULL
    `);
    console.log('✅ Updated existing trades with PENDING deposit status');
    
  } catch (error) {
    console.error('❌ Error adding deposit_status column:', error.message);
  } finally {
    await pool.end();
  }
};

addDepositStatusColumn();
