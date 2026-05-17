import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL setup script
const setupPostgreSQL = async () => {
  console.log('🐘 Setting up PostgreSQL database...');
  
  // Connect to PostgreSQL server (not specific database)
  const adminPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    database: 'postgres' // Connect to default postgres database
  });

  try {
    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'escrowx';
    await adminPool.query(`CREATE DATABASE ${dbName}`);
    console.log(`✅ Database '${dbName}' created successfully`);
  } catch (error) {
    if (error.code === '42P04') {
      console.log(`ℹ️  Database '${process.env.DB_NAME || 'escrowx'}' already exists`);
    } else {
      console.error('❌ Error creating database:', error.message);
    }
  }

  await adminPool.end();

  // Now connect to the specific database and create tables
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'escrowx',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432
  });

  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE,
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

    // Create services table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
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

    // Create trades table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id VARCHAR(255) PRIMARY KEY,
        buyer_id VARCHAR(255) REFERENCES users(id),
        seller_id VARCHAR(255) REFERENCES users(id),
        service_id VARCHAR(255) REFERENCES services(id),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        description TEXT,
        status VARCHAR(50) DEFAULT 'CREATED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    console.log('✅ Trades table created');

    // Create withdrawals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        address TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      )
    `);
    console.log('✅ Withdrawals table created');

    // Create reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(255) PRIMARY KEY,
        trade_id VARCHAR(255) REFERENCES trades(id),
        reviewer_id VARCHAR(255) REFERENCES users(id),
        reviewee_id VARCHAR(255) REFERENCES users(id),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Reviews table created');

    // Create balances table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS balances (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id),
        currency VARCHAR(10) DEFAULT 'USD',
        amount DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Balances table created');

    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        trade_id VARCHAR(255) REFERENCES trades(id),
        sender_id VARCHAR(255) REFERENCES users(id),
        type VARCHAR(50) DEFAULT 'TEXT',
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Messages table created');

    // Create dispute_messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dispute_messages (
        id VARCHAR(255) PRIMARY KEY,
        trade_id VARCHAR(255) REFERENCES trades(id),
        sender_id VARCHAR(255) REFERENCES users(id),
        type VARCHAR(50) DEFAULT 'TEXT',
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Dispute messages table created');

    // Insert admin user
    await pool.query(`
      INSERT INTO users (id, username, first_name, last_name, is_verified, is_banned)
      VALUES ('admin', 'admin', 'Admin', 'User', true, false)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Admin user created');

    console.log('🎉 PostgreSQL database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up PostgreSQL database:', error);
  } finally {
    await pool.end();
  }
};

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupPostgreSQL().catch(console.error);
}

export default setupPostgreSQL;
