import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load production environment
dotenv.config({ path: '.env.production' });

const setupProduction = async () => {
  console.log('🚀 Setting up EscrowX Production Environment...');
  
  // Check if production environment file exists
  if (!fs.existsSync('.env.production')) {
    console.log('📝 Creating production environment file...');
    fs.copyFileSync('env.production', '.env.production');
    console.log('✅ Production environment file created');
    console.log('⚠️  Please edit .env.production with your actual credentials');
  }

  // Connect to PostgreSQL server
  const adminPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    database: 'postgres'
  });

  try {
    // Create production database
    const dbName = process.env.DB_NAME || 'escrowx_production';
    await adminPool.query(`CREATE DATABASE ${dbName}`);
    console.log(`✅ Production database '${dbName}' created`);
  } catch (error) {
    if (error.code === '42P04') {
      console.log(`ℹ️  Production database '${process.env.DB_NAME || 'escrowx_production'}' already exists`);
    } else {
      console.error('❌ Error creating production database:', error.message);
      throw error;
    }
  }

  await adminPool.end();

  // Connect to production database
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'escrowx_production',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('📊 Creating production database tables...');

    // Create users table with production optimizations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        photo_url TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        is_banned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // Create indexes for better performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_banned ON users(is_banned)');

    // Create services table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL CHECK (price > 0),
        currency VARCHAR(10) DEFAULT 'USD',
        category VARCHAR(100),
        tags TEXT[],
        images TEXT[],
        approved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Services table created');

    // Create indexes for services
    await pool.query('CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_services_approved ON services(approved)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_services_category ON services(category)');

    // Create trades table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id VARCHAR(255) PRIMARY KEY,
        buyer_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        seller_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        service_id VARCHAR(255) REFERENCES services(id) ON DELETE SET NULL,
        amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
        currency VARCHAR(10) DEFAULT 'USD',
        description TEXT,
        status VARCHAR(50) DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'HELD', 'IN_PROGRESS', 'DELIVERED', 'DISPUTE', 'COMPLETED', 'CANCELLED')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    console.log('✅ Trades table created');

    // Create indexes for trades
    await pool.query('CREATE INDEX IF NOT EXISTS idx_trades_buyer_id ON trades(buyer_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_trades_seller_id ON trades(seller_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at)');

    // Create withdrawals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
        currency VARCHAR(10) DEFAULT 'USD',
        address TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      )
    `);
    console.log('✅ Withdrawals table created');

    // Create indexes for withdrawals
    await pool.query('CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status)');

    // Create reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(255) PRIMARY KEY,
        trade_id VARCHAR(255) REFERENCES trades(id) ON DELETE CASCADE,
        reviewer_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        reviewee_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Reviews table created');

    // Create indexes for reviews
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reviews_trade_id ON reviews(trade_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id)');

    // Create balances table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS balances (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        currency VARCHAR(10) DEFAULT 'USD',
        amount DECIMAL(10,2) DEFAULT 0 CHECK (amount >= 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Balances table created');

    // Create indexes for balances
    await pool.query('CREATE INDEX IF NOT EXISTS idx_balances_user_id ON balances(user_id)');

    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        trade_id VARCHAR(255) REFERENCES trades(id) ON DELETE CASCADE,
        sender_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) DEFAULT 'TEXT' CHECK (type IN ('TEXT', 'IMAGE', 'FILE', 'SYSTEM')),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Messages table created');

    // Create indexes for messages
    await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_trade_id ON messages(trade_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)');

    // Create dispute_messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dispute_messages (
        id VARCHAR(255) PRIMARY KEY,
        trade_id VARCHAR(255) REFERENCES trades(id) ON DELETE CASCADE,
        sender_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) DEFAULT 'TEXT' CHECK (type IN ('TEXT', 'IMAGE', 'FILE', 'SYSTEM')),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Dispute messages table created');

    // Create indexes for dispute messages
    await pool.query('CREATE INDEX IF NOT EXISTS idx_dispute_messages_trade_id ON dispute_messages(trade_id)');

    // Insert admin user
    await pool.query(`
      INSERT INTO users (id, username, first_name, last_name, is_verified, is_banned)
      VALUES ('admin', 'admin', 'Admin', 'User', true, false)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Admin user created');

    // Create admin balance
    await pool.query(`
      INSERT INTO balances (id, user_id, currency, amount)
      VALUES ('admin_USD', 'admin', 'USD', 0)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Admin balance created');

    console.log('🎉 Production database setup completed successfully!');
    console.log('📊 Database optimized with indexes for better performance');
    console.log('🔒 Production constraints and checks added');
    
  } catch (error) {
    console.error('❌ Error setting up production database:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupProduction().catch(console.error);
}

export default setupProduction;
