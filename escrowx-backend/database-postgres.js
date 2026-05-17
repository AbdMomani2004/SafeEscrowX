import pkg from 'pg';
const { Pool } = pkg;

// PostgreSQL Database Configuration
// Parse DATABASE_URL if available (Render.com format)
let dbConfig = {};

if (process.env.DATABASE_URL) {
  // Parse DATABASE_URL format: postgresql://user:password@host:port/database
  const url = new URL(process.env.DATABASE_URL);
  dbConfig = {
    user: url.username,
    password: url.password,
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1), // Remove leading slash
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
} else {
  // Fallback to individual environment variables
  dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'escrowx',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}

const pool = new Pool(dbConfig);

// Debug logging for database configuration
console.log('🔧 Database configuration:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  ssl: dbConfig.ssl,
  hasPassword: !!dbConfig.password
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

// Initialize database tables
export const initDatabase = async () => {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        photo_url TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        is_banned BOOLEAN DEFAULT FALSE,
        rating DECIMAL(3,2) DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
        rejected BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    // Create withdrawals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        network VARCHAR(50),
        address TEXT NOT NULL,
        fee DECIMAL(10,2) DEFAULT 1,
        amount_after_fee DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'PENDING',
        reason TEXT,
        tx_id VARCHAR(255),
        transfer_proof_url TEXT,
        notified_user BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      )
    `);

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

    // Create messages table for chat
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

    // Add migration for new columns
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.0;
      `);
    } catch (e) {
      // Column might already exist, ignore error
    }
    
    try {
      await pool.query(`
        ALTER TABLE services ADD COLUMN IF NOT EXISTS rejected BOOLEAN DEFAULT FALSE;
      `);
    } catch (e) {
      // Column might already exist, ignore error
    }

    try {
      await pool.query('ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS network VARCHAR(50)');
      await pool.query('ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fee DECIMAL(10,2) DEFAULT 1');
      await pool.query('ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS amount_after_fee DECIMAL(10,2)');
      await pool.query('ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS tx_id VARCHAR(255)');
      await pool.query('ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS transfer_proof_url TEXT');
      await pool.query('ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS notified_user BOOLEAN DEFAULT FALSE');
    } catch (e) {
      // Migration might already be applied
    }

    // Drop unique constraint on username if it exists
    try {
      await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key');
      console.log('✅ Dropped unique constraint on username');
    } catch (error) {
      console.log('⚠️ Could not drop username constraint (may not exist):', error.message);
    }

    // Create performance indexes
    console.log('🔧 Creating database indexes for performance optimization...');
    
    try {
      // Users table indexes
      await pool.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_users_banned ON users(is_banned)');
      
      // Services table indexes
      await pool.query('CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_services_approved ON services(approved)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_services_rejected ON services(rejected)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_services_category ON services(category)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_services_created_at ON services(created_at DESC)');
      
      // Trades table indexes
      await pool.query('CREATE INDEX IF NOT EXISTS idx_trades_buyer_id ON trades(buyer_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_trades_seller_id ON trades(seller_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_trades_service_id ON trades(service_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_trades_deposit_status ON trades(deposit_status)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_trades_delivery_status ON trades(delivery_status)');
      
      // Messages table indexes
      await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_trade_id ON messages(trade_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC)');
      
      // Dispute messages table indexes
      await pool.query('CREATE INDEX IF NOT EXISTS idx_dispute_messages_trade_id ON dispute_messages(trade_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_dispute_messages_sender_id ON dispute_messages(sender_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_dispute_messages_created_at ON dispute_messages(created_at DESC)');
      
      // Withdrawals table indexes
      await pool.query('CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC)');
      
      // Reviews table indexes
      await pool.query('CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_reviews_trade_id ON reviews(trade_id)');
      
      // Balances table indexes
      await pool.query('CREATE INDEX IF NOT EXISTS idx_balances_user_id ON balances(user_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_balances_currency ON balances(currency)');
      
      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.log('⚠️ Some indexes may already exist or failed:', error.message);
    }

    console.log('✅ PostgreSQL database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing PostgreSQL database:', error);
    throw error;
  }
};

// User operations
export const users = {
  create: async (userData) => {
    const { id, username, first_name, last_name, photo_url, is_verified, is_banned, rating } = userData;
    const query = `
      INSERT INTO users (id, username, first_name, last_name, photo_url, is_verified, is_banned, rating)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        photo_url = EXCLUDED.photo_url,
        is_verified = EXCLUDED.is_verified,
        is_banned = EXCLUDED.is_banned,
        rating = COALESCE(EXCLUDED.rating, users.rating),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(query, [id, username, first_name, last_name, photo_url, is_verified, is_banned, rating]);
    return result.rows[0];
  },

  getById: async (id) => {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  getByUsername: async (username) => {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);
    return result.rows[0];
  },

  updateModeration: async (userId, { banned, verified }) => {
    const query = `
      UPDATE users 
      SET is_banned = COALESCE($1, is_banned),
          is_verified = COALESCE($2, is_verified),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [banned, verified, userId]);
    return result.rows[0];
  },

  getAll: async () => {
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }
};

// Service operations
export const services = {
  create: async (serviceData) => {
    const { id, user_id, title, description, price, currency, category, tags, images, approved, rejected } = serviceData;
    const query = `
      INSERT INTO services (id, user_id, title, description, price, currency, category, tags, images, approved, rejected)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const result = await pool.query(query, [id, user_id, title, description, price, currency, category, tags, images, approved || false, rejected || false]);
    return result.rows[0];
  },

  getById: async (id) => {
    const query = `
      SELECT s.*, u.username, u.first_name, u.last_name, u.photo_url, u.is_verified
      FROM services s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  getByUserId: async (userId) => {
    const query = 'SELECT * FROM services WHERE user_id = $1 AND rejected = false ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  updateApproval: async (serviceId, userId, approved) => {
    const query = `
      UPDATE services 
      SET approved = $1, rejected = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `;
    const result = await pool.query(query, [approved, !approved, serviceId, userId]);
    return result.rows[0];
  },

  updateApprovalById: async (serviceId, approved) => {
    const query = `
      UPDATE services 
      SET approved = $1, rejected = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [approved, !approved, serviceId]);
    return result.rows[0];
  },

  deleteById: async (serviceId) => {
    const query = 'DELETE FROM services WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [serviceId]);
    return result.rowCount > 0;
  },

  getAll: async () => {
    console.log('🔍 Services.getAll() called');
    const query = `
      SELECT s.*, u.username, u.first_name, u.last_name, u.photo_url, u.is_verified, u.is_banned
      FROM services s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `;
    console.log('📤 Executing query:', query);
    const result = await pool.query(query);
    console.log('📥 Query result:', result.rows.length, 'services found');
    console.log('📥 Services data:', result.rows);
    return result.rows;
  }
};

// Trade operations
export const trades = {
  create: async (tradeData) => {
    try {
      console.log('🔄 Database: Creating trade with data:', tradeData);
      const { id, buyer_id, seller_id, service_id, amount, currency, description } = tradeData;
      const query = `
        INSERT INTO trades (id, buyer_id, seller_id, service_id, amount, currency, description, deposit_status, delivery_status, delivery_message, revision_request, revision_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', 'NOT_DELIVERED', NULL, NULL, NULL)
        RETURNING *
      `;
      console.log('🔄 Database: Executing query with params:', [id, buyer_id, seller_id, service_id, amount, currency, description]);
      const result = await pool.query(query, [id, buyer_id, seller_id, service_id, amount, currency, description]);
      console.log('✅ Database: Trade created successfully:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Database: Error creating trade:', error);
      throw error;
    }
  },

  getById: async (id) => {
    const query = 'SELECT * FROM trades WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  updateStatus: async (id, status, completed_at = null) => {
    const query = `
      UPDATE trades 
      SET status = $1, completed_at = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [status, completed_at, id]);
    return result.rows[0];
  },

  updateDepositStatus: async (id, deposit_status) => {
    const query = `
      UPDATE trades 
      SET deposit_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [deposit_status, id]);
    return result.rows[0];
  },

  updateDeliveryStatus: async (id, delivery_status, delivery_message = null) => {
    const query = `
      UPDATE trades 
      SET delivery_status = $1, delivery_message = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [delivery_status, delivery_message, id]);
    return result.rows[0];
  },

  requestRevision: async (id, revision_message) => {
    const query = `
      UPDATE trades 
      SET revision_request = true, revision_message = $1, delivery_status = 'REVISION_REQUESTED', updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [revision_message, id]);
    return result.rows[0];
  },

  approveDelivery: async (id) => {
    const query = `
      UPDATE trades 
      SET delivery_status = 'APPROVED', status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  cancelTrade: async (id, cancelled_by, cancellation_reason) => {
    const query = `
      UPDATE trades 
      SET status = 'CANCELLED', cancelled_by = $1, cancellation_reason = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [cancelled_by, cancellation_reason, id]);
    return result.rows[0];
  },

  getByUserId: async (userId) => {
    const query = `
      SELECT * FROM trades 
      WHERE buyer_id = $1 OR seller_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  getAll: async () => {
    const query = 'SELECT * FROM trades ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }
};

// Withdrawal operations
export const withdrawals = {
  create: async (withdrawalData) => {
    const {
      id,
      user_id,
      amount,
      currency,
      network,
      address,
      fee = 1,
      amount_after_fee = null
    } = withdrawalData;
    const query = `
      INSERT INTO withdrawals (id, user_id, amount, currency, network, address, fee, amount_after_fee)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await pool.query(query, [id, user_id, amount, currency, network || null, address, fee, amount_after_fee]);
    return result.rows[0];
  },

  getById: async (id) => {
    const query = 'SELECT * FROM withdrawals WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  getByUserId: async (userId) => {
    const query = 'SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  updateStatus: async (
    id,
    status,
    processed_at = null,
    reason = null,
    tx_id = null,
    transfer_proof_url = null,
    notified_user = null
  ) => {
    const query = `
      UPDATE withdrawals 
      SET status = $1,
          processed_at = $2,
          reason = COALESCE($3, reason),
          tx_id = COALESCE($4, tx_id),
          transfer_proof_url = COALESCE($5, transfer_proof_url),
          notified_user = COALESCE($6, notified_user),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    const result = await pool.query(query, [status, processed_at, reason, tx_id, transfer_proof_url, notified_user, id]);
    return result.rows[0];
  },

  getAll: async () => {
    const query = `
      SELECT w.*, u.username, u.first_name, u.last_name
      FROM withdrawals w
      LEFT JOIN users u ON u.id = w.user_id
      ORDER BY w.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }
};

// Review operations
export const reviews = {
  create: async (reviewData) => {
    const { id, trade_id, reviewer_id, reviewee_id, rating, comment } = reviewData;
    const query = `
      INSERT INTO reviews (id, trade_id, reviewer_id, reviewee_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [id, trade_id, reviewer_id, reviewee_id, rating, comment]);
    return result.rows[0];
  },

  getByUserId: async (userId) => {
    const query = 'SELECT * FROM reviews WHERE reviewee_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
};

// Balance operations
export const balances = {
  getByUserId: async (userId, currency = 'USD') => {
    const query = 'SELECT * FROM balances WHERE user_id = $1 AND currency = $2';
    const result = await pool.query(query, [userId, currency]);
    return result.rows[0];
  },

  update: async (userId, currency, amount) => {
    const query = `
      INSERT INTO balances (id, user_id, currency, amount)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        amount = EXCLUDED.amount,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const id = `${userId}_${currency}`;
    const result = await pool.query(query, [id, userId, currency, amount]);
    return result.rows[0];
  }
};

// Message operations
export const messages = {
  create: async (messageData) => {
    const { id, trade_id, sender_id, type, content } = messageData;
    const query = `
      INSERT INTO messages (id, trade_id, sender_id, type, content)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [id, trade_id, sender_id, type, content]);
    return result.rows[0];
  },

  getByTradeId: async (tradeId) => {
    const query = 'SELECT * FROM messages WHERE trade_id = $1 ORDER BY created_at ASC';
    const result = await pool.query(query, [tradeId]);
    return result.rows;
  }
};

// Dispute message operations
export const disputeMessages = {
  create: async (messageData) => {
    const { id, trade_id, sender_id, type, content } = messageData;
    const query = `
      INSERT INTO dispute_messages (id, trade_id, sender_id, type, content)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [id, trade_id, sender_id, type, content]);
    return result.rows[0];
  },

  getByTradeId: async (tradeId) => {
    const query = 'SELECT * FROM dispute_messages WHERE trade_id = $1 ORDER BY created_at ASC';
    const result = await pool.query(query, [tradeId]);
    return result.rows;
  }
};

// Close database connection
export const closeDatabase = async () => {
  await pool.end();
};

export default pool;
