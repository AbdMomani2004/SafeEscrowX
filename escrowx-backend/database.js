import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
const dbPath = path.join(__dirname, 'escrowx.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
const createTables = () => {
    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            photo_url TEXT,
            is_verified BOOLEAN DEFAULT FALSE,
            is_banned BOOLEAN DEFAULT FALSE,
            rating REAL DEFAULT 0.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Services table
    db.exec(`
        CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            currency TEXT NOT NULL,
            category TEXT,
            approved BOOLEAN DEFAULT FALSE,
            rejected BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Trades table
    db.exec(`
        CREATE TABLE IF NOT EXISTS trades (
            id TEXT PRIMARY KEY,
            buyer_id TEXT NOT NULL,
            seller_id TEXT NOT NULL,
            service_id TEXT,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            deposit_status TEXT DEFAULT 'PENDING',
            delivery_status TEXT DEFAULT 'NOT_DELIVERED',
            delivery_message TEXT,
            revision_request BOOLEAN DEFAULT FALSE,
            revision_message TEXT,
            cancelled_by TEXT,
            cancellation_reason TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            FOREIGN KEY (buyer_id) REFERENCES users(id),
            FOREIGN KEY (seller_id) REFERENCES users(id),
            FOREIGN KEY (service_id) REFERENCES services(id)
        )
    `);

    // Withdrawals table
    db.exec(`
        CREATE TABLE IF NOT EXISTS withdrawals (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            network TEXT,
            address TEXT NOT NULL,
            fee REAL NOT NULL DEFAULT 1,
            amount_after_fee REAL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            tx_id TEXT,
            reason TEXT,
            transfer_proof_url TEXT,
            notified_user BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Reviews table
    db.exec(`
        CREATE TABLE IF NOT EXISTS reviews (
            id TEXT PRIMARY KEY,
            trade_id TEXT NOT NULL,
            reviewer_id TEXT NOT NULL,
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (trade_id) REFERENCES trades(id),
            FOREIGN KEY (reviewer_id) REFERENCES users(id)
        )
    `);

    // Messages table
    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            trade_id TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'TEXT',
            content TEXT NOT NULL,
            media_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id) REFERENCES users(id)
        )
    `);

    // Dispute messages table
    db.exec(`
        CREATE TABLE IF NOT EXISTS dispute_messages (
            id TEXT PRIMARY KEY,
            trade_id TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'TEXT',
            content TEXT NOT NULL,
            media_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id) REFERENCES users(id)
        )
    `);
};

// Initialize database
createTables();

// Database migration to add new fields
const migrateDatabase = () => {
    try {
        // Add rating column to users table if it doesn't exist
        db.exec(`
            ALTER TABLE users ADD COLUMN rating REAL DEFAULT 0.0;
        `);
    } catch (e) {
        // Column already exists, ignore error
    }
    
    try {
        // Add rejected column to services table if it doesn't exist
        db.exec(`
            ALTER TABLE services ADD COLUMN rejected BOOLEAN DEFAULT FALSE;
        `);
    } catch (e) {
        // Column already exists, ignore error
    }

    try {
        db.exec(`ALTER TABLE withdrawals ADD COLUMN network TEXT;`);
    } catch (e) {}

    try {
        db.exec(`ALTER TABLE withdrawals ADD COLUMN fee REAL NOT NULL DEFAULT 1;`);
    } catch (e) {}

    try {
        db.exec(`ALTER TABLE withdrawals ADD COLUMN amount_after_fee REAL;`);
    } catch (e) {}

    try {
        db.exec(`ALTER TABLE withdrawals ADD COLUMN transfer_proof_url TEXT;`);
    } catch (e) {}

    try {
        db.exec(`ALTER TABLE withdrawals ADD COLUMN notified_user BOOLEAN DEFAULT FALSE;`);
    } catch (e) {}

    try {
        db.exec(`ALTER TABLE trades ADD COLUMN deposit_status TEXT DEFAULT 'PENDING';`);
    } catch (e) {}

    try {
        db.exec(`ALTER TABLE trades ADD COLUMN delivery_status TEXT DEFAULT 'NOT_DELIVERED';`);
    } catch (e) {}

    try {
        db.exec(`ALTER TABLE trades ADD COLUMN delivery_message TEXT;`);
    } catch (e) {}

    try {
        db.exec(`ALTER TABLE trades ADD COLUMN revision_request BOOLEAN DEFAULT FALSE;`);
    } catch (e) {}

    try {
        db.exec(`ALTER TABLE trades ADD COLUMN revision_message TEXT;`);
    } catch (e) {}

    try {
        db.exec(`ALTER TABLE trades ADD COLUMN cancelled_by TEXT;`);
    } catch (e) {}

    try {
        db.exec(`ALTER TABLE trades ADD COLUMN cancellation_reason TEXT;`);
    } catch (e) {}
};

// Run migration
migrateDatabase();

// User operations
export const users = {
    getAll: () => {
        const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
        return stmt.all();
    },

    getById: (id) => {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(id);
    },

    upsert: (userData) => {
        const { id, username, first_name, last_name, photo_url, is_verified, is_banned, rating } = userData;
        const stmt = db.prepare(`
            INSERT INTO users (id, username, first_name, last_name, photo_url, is_verified, is_banned, rating, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                username = excluded.username,
                first_name = excluded.first_name,
                last_name = excluded.last_name,
                photo_url = excluded.photo_url,
                is_verified = COALESCE(excluded.is_verified, users.is_verified),
                is_banned = COALESCE(excluded.is_banned, users.is_banned),
                rating = COALESCE(excluded.rating, users.rating),
                updated_at = CURRENT_TIMESTAMP
        `);
        stmt.run(id, username, first_name, last_name, photo_url, is_verified, is_banned, rating);
        return users.getById(id);
    },

    updateModeration: (userId, { banned, verified }) => {
        const stmt = db.prepare(`
            UPDATE users 
            SET is_banned = COALESCE(?, is_banned),
                is_verified = COALESCE(?, is_verified),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(banned, verified, userId);
        return users.getById(userId);
    }
};

// Service operations
export const services = {
    getAll: () => {
        const stmt = db.prepare(`
            SELECT s.*, u.username, u.first_name, u.last_name, u.photo_url, u.is_verified, u.is_banned
            FROM services s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.created_at DESC
        `);
        return stmt.all();
    },

    getByUserId: (userId) => {
        const stmt = db.prepare('SELECT * FROM services WHERE user_id = ? ORDER BY created_at DESC');
        return stmt.all(userId);
    },

    create: (serviceData) => {
        const { id, user_id, title, description, price, currency, category, approved, rejected } = serviceData;
        const stmt = db.prepare(`
            INSERT INTO services (id, user_id, title, description, price, currency, category, approved, rejected)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, user_id, title, description, price, currency, category, approved || false, rejected || false);
        return services.getById(id);
    },

    getById: (id) => {
        const stmt = db.prepare(`
            SELECT s.*, u.username, u.first_name, u.last_name, u.photo_url, u.is_verified
            FROM services s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = ?
        `);
        return stmt.get(id);
    },

    updateApproval: (serviceId, userId, approved) => {
        const stmt = db.prepare(`
            UPDATE services 
            SET approved = ?, rejected = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `);
        const result = stmt.run(approved, !approved, serviceId, userId);
        return result.changes > 0 ? services.getById(serviceId) : null;
    },

    updateApprovalById: (serviceId, approved) => {
        const stmt = db.prepare(`
            UPDATE services 
            SET approved = ?, rejected = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        const result = stmt.run(approved, !approved, serviceId);
        return result.changes > 0 ? services.getById(serviceId) : null;
    },

    deleteById: (serviceId) => {
        const stmt = db.prepare('DELETE FROM services WHERE id = ?');
        const result = stmt.run(serviceId);
        return result.changes > 0;
    }
};

// Trade operations
export const trades = {
    create: (tradeData) => {
        const { id, buyer_id, seller_id, service_id, amount, currency, description } = tradeData;
        const stmt = db.prepare(`
            INSERT INTO trades (
                id, buyer_id, seller_id, service_id, amount, currency, description,
                deposit_status, delivery_status, revision_request
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 'NOT_DELIVERED', FALSE)
        `);
        stmt.run(id, buyer_id, seller_id, service_id, amount, currency, description);
        return trades.getById(id);
    },

    getById: (id) => {
        const stmt = db.prepare('SELECT * FROM trades WHERE id = ?');
        return stmt.get(id);
    },

    updateStatus: (id, status) => {
        const completed_at = status === 'COMPLETED' ? new Date().toISOString() : null;
        const stmt = db.prepare(`
            UPDATE trades 
            SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(status, completed_at, id);
        return trades.getById(id);
    },

    updateDepositStatus: (id, depositStatus) => {
        const stmt = db.prepare(`
            UPDATE trades
            SET deposit_status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(depositStatus, id);
        return trades.getById(id);
    },

    updateDeliveryStatus: (id, deliveryStatus, deliveryMessage = null) => {
        const stmt = db.prepare(`
            UPDATE trades
            SET delivery_status = ?,
                delivery_message = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(deliveryStatus, deliveryMessage, id);
        return trades.getById(id);
    },

    requestRevision: (id, revisionMessage) => {
        const stmt = db.prepare(`
            UPDATE trades
            SET revision_request = TRUE,
                revision_message = ?,
                delivery_status = 'REVISION_REQUESTED',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(revisionMessage, id);
        return trades.getById(id);
    },

    approveDelivery: (id) => {
        const stmt = db.prepare(`
            UPDATE trades
            SET delivery_status = 'APPROVED',
                status = 'COMPLETED',
                completed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(id);
        return trades.getById(id);
    },

    cancelTrade: (id, cancelledBy, cancellationReason) => {
        const stmt = db.prepare(`
            UPDATE trades
            SET status = 'CANCELLED',
                cancelled_by = ?,
                cancellation_reason = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(cancelledBy, cancellationReason, id);
        return trades.getById(id);
    },

    getByUserId: (userId) => {
        const stmt = db.prepare(`
            SELECT * FROM trades 
            WHERE buyer_id = ? OR seller_id = ?
            ORDER BY created_at DESC
        `);
        return stmt.all(userId, userId);
    },

    getAll: () => {
        const stmt = db.prepare('SELECT * FROM trades ORDER BY created_at DESC');
        return stmt.all();
    }
};

// Withdrawal operations
export const withdrawals = {
    create: (withdrawalData) => {
        const {
            id,
            user_id,
            amount,
            currency,
            network,
            address,
            fee = 1,
            amount_after_fee
        } = withdrawalData;
        const stmt = db.prepare(`
            INSERT INTO withdrawals (id, user_id, amount, currency, network, address, fee, amount_after_fee)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, user_id, amount, currency, network || null, address, fee, amount_after_fee ?? null);
        return withdrawals.getById(id);
    },

    getAll: () => {
        const stmt = db.prepare(`
            SELECT w.*, u.username, u.first_name, u.last_name
            FROM withdrawals w
            JOIN users u ON w.user_id = u.id
            ORDER BY w.created_at DESC
        `);
        return stmt.all();
    },

    getById: (id) => {
        const stmt = db.prepare('SELECT * FROM withdrawals WHERE id = ?');
        return stmt.get(id);
    },

    updateStatus: (id, status, txId = null, reason = null, transferProofUrl = null, notifiedUser = null) => {
        const stmt = db.prepare(`
            UPDATE withdrawals 
            SET status = ?,
                tx_id = COALESCE(?, tx_id),
                reason = COALESCE(?, reason),
                transfer_proof_url = COALESCE(?, transfer_proof_url),
                notified_user = COALESCE(?, notified_user),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(status, txId, reason, transferProofUrl, notifiedUser, id);
        return withdrawals.getById(id);
    },

    getByUserId: (userId) => {
        const stmt = db.prepare(`
            SELECT * FROM withdrawals 
            WHERE user_id = ?
            ORDER BY created_at DESC
        `);
        return stmt.all(userId);
    }
};

// Balance operations
export const balances = {
    getByUserId: (userId) => {
        // Calculate balances from completed trades where user is seller
        const stmt = db.prepare(`
            SELECT currency, SUM(amount) as total
            FROM trades 
            WHERE seller_id = ? AND status = 'COMPLETED'
            GROUP BY currency
        `);
        const results = stmt.all(userId);
        
        // Also subtract withdrawals
        const withdrawalStmt = db.prepare(`
            SELECT currency, SUM(amount) as total
            FROM withdrawals 
            WHERE user_id = ? AND status = 'APPROVED'
            GROUP BY currency
        `);
        const withdrawals = withdrawalStmt.all(userId);
        
        const balances = {};
        
        // Add earnings
        results.forEach(row => {
            balances[row.currency] = row.total;
        });
        
        // Subtract approved withdrawals
        withdrawals.forEach(row => {
            balances[row.currency] = (balances[row.currency] || 0) - row.total;
        });
        
        return balances;
    }
};

// Message operations
export const messages = {
    create: (messageData) => {
        const { id, trade_id, sender_id, type = 'TEXT', content, media_url = null } = messageData;
        const stmt = db.prepare(`
            INSERT INTO messages (id, trade_id, sender_id, type, content, media_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, trade_id, sender_id, type, content, media_url);
        return messages.getById(id);
    },

    getById: (id) => {
        const stmt = db.prepare('SELECT * FROM messages WHERE id = ?');
        return stmt.get(id);
    },

    getByTradeId: (tradeId) => {
        const stmt = db.prepare('SELECT * FROM messages WHERE trade_id = ? ORDER BY created_at ASC');
        return stmt.all(tradeId);
    }
};

// Dispute message operations
export const disputeMessages = {
    create: (messageData) => {
        const { id, trade_id, sender_id, type = 'TEXT', content, media_url = null } = messageData;
        const stmt = db.prepare(`
            INSERT INTO dispute_messages (id, trade_id, sender_id, type, content, media_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, trade_id, sender_id, type, content, media_url);
        return disputeMessages.getById(id);
    },

    getById: (id) => {
        const stmt = db.prepare('SELECT * FROM dispute_messages WHERE id = ?');
        return stmt.get(id);
    },

    getByTradeId: (tradeId) => {
        const stmt = db.prepare('SELECT * FROM dispute_messages WHERE trade_id = ? ORDER BY created_at ASC');
        return stmt.all(tradeId);
    }
};

export default db;

