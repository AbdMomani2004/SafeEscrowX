import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import compression from 'compression';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

// Load environment variables first
// In production, prioritize system environment variables over .env files
if (process.env.NODE_ENV === 'production') {
  // Don't load .env files in production - use system environment variables only
  console.log('🚀 Production mode: Using system environment variables only');
} else {
  // Load .env file for development
  dotenv.config();
}

// Debug environment variables
console.log('🔍 Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  USE_POSTGRESQL: process.env.USE_POSTGRESQL,
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_NAME: process.env.DB_NAME
});

// Choose database: SQLite or PostgreSQL (PostgreSQL is default for production)
const USE_POSTGRESQL = process.env.USE_POSTGRESQL === 'true' || process.env.NODE_ENV === 'production';

let users, services, trades, withdrawals, balances, reviews, messages, disputeMessages;

if (USE_POSTGRESQL) {
  const db = await import('./database-postgres.js');
  users = db.users;
  services = db.services;
  trades = db.trades;
  withdrawals = db.withdrawals;
  balances = db.balances;
  reviews = db.reviews;
  messages = db.messages;
  disputeMessages = db.disputeMessages;
  
  // Initialize PostgreSQL database
  await db.initDatabase();
  console.log('🐘 Using PostgreSQL database');
  
  // Add delivery management columns to existing trades table
  try {
    console.log('🔄 Adding delivery management columns to trades table...');
    const pool = db.default || db;
    if (!pool) {
      console.error('❌ Database pool not available');
      throw new Error('Database pool not available');
    }
    
    await pool.query(`
      ALTER TABLE trades 
      ADD COLUMN IF NOT EXISTS deposit_status VARCHAR(50) DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'NOT_DELIVERED',
      ADD COLUMN IF NOT EXISTS delivery_message TEXT,
      ADD COLUMN IF NOT EXISTS revision_request BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS revision_message TEXT,
      ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(255),
      ADD COLUMN IF NOT EXISTS cancellation_reason TEXT
    `);
    console.log('✅ Delivery management columns added to trades table');
    
    // Update existing trades to have proper default values
    await pool.query(`
      UPDATE trades 
      SET deposit_status = COALESCE(deposit_status, 'PENDING'),
          delivery_status = COALESCE(delivery_status, 'NOT_DELIVERED'),
          revision_request = COALESCE(revision_request, FALSE)
      WHERE deposit_status IS NULL OR delivery_status IS NULL
    `);
    console.log('✅ Updated existing trades with default values');
  } catch (error) {
    console.error('❌ Error adding delivery management columns:', error.message);
  }
} else {
  const db = await import('./database.js');
  users = db.users;
  services = db.services;
  trades = db.trades;
  withdrawals = db.withdrawals;
  balances = db.balances;
  reviews = db.reviews;
  console.log('📁 Using SQLite database');
}

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 8080;

// CORS must be FIRST so every response (including errors/rate limits) carries headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// Production security and performance middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Compression middleware
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// Body parsing middleware with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting middleware
const rateLimit = (windowMs = 15 * 60 * 1000, max = 300) => {
    const requests = new Map();
    return (req, res, next) => {
        // Skip preflight and health checks
        if (req.method === 'OPTIONS' || req.path === '/health') return next();
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old requests
        for (const [timestamp] of requests) {
            if (timestamp < windowStart) {
                requests.delete(timestamp);
            }
        }
        
        // Count requests from this IP
        const ipRequests = Array.from(requests.values())
            .filter(req => req.ip === ip && req.timestamp > windowStart);
        
        if (ipRequests.length >= max) {
            // Ensure CORS headers are present on 429 responses
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            return res.status(429).json({ 
                ok: false, 
                error: 'Too many requests, please try again later.' 
            });
        }
        
        requests.set(now, { ip, timestamp: now });
        next();
    };
};

// Apply rate limiting
app.use(rateLimit(15 * 60 * 1000, 300)); // allow more requests per 15 minutes

// Production logging middleware
const logger = (req, res, next) => {
    const start = Date.now();
    const originalSend = res.send;
    
    res.send = function(data) {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        };
        
        if (process.env.NODE_ENV === 'production') {
            console.log(JSON.stringify(logData));
        } else {
            console.log(`${logData.method} ${logData.url} ${logData.status} - ${logData.duration}`);
        }
        
        originalSend.call(this, data);
    };
    
    next();
};

app.use(logger);

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ 
            ok: false, 
            error: 'Internal server error' 
        });
    } else {
        res.status(500).json({ 
            ok: false, 
            error: err.message,
            stack: err.stack
        });
    }
});

// (CORS already applied at top)

// Verify Telegram initData per https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
function getTelegramSecretKey(botToken) {
    return crypto.createHash('sha256').update(botToken).digest();
}

function parseInitData(initData) {
    return Object.fromEntries(new URLSearchParams(initData));
}

function isRecent(authDate) {
    const now = Math.floor(Date.now() / 1000);
    const FIVE_MIN = 5 * 60;
    return Math.abs(now - Number(authDate)) <= FIVE_MIN;
}

function verifyTelegramInitData(initData, botToken) {
    if (!initData || !botToken) return { ok: false, reason: 'Missing initData or bot token' };

    const data = parseInitData(initData);
    const hash = data.hash;
    if (!hash) return { ok: false, reason: 'Missing hash' };

    // Remove hash before checking
    const entries = Object.entries(data)
        .filter(([key]) => key !== 'hash')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

    const secret = getTelegramSecretKey(botToken);
    const calculatedHash = crypto
        .createHmac('sha256', secret)
        .update(entries)
        .digest('hex');

    if (calculatedHash !== hash) return { ok: false, reason: 'Hash mismatch' };

    if (!isRecent(data.auth_date)) return { ok: false, reason: 'Auth too old' };

    return { ok: true, data };
}

app.post('/api/verify', (req, res) => {
    try {
        const { initData } = req.body || {};
        const botToken = process.env.BOT_TOKEN;
        const result = verifyTelegramInitData(initData, botToken);
        if (!result.ok) {
            return res.status(401).json({ ok: false, error: result.reason });
        }

        // user is a JSON object in initData (URL-encoded)
        let user = {};
        try {
            user = JSON.parse(result.data.user);
        } catch (_) {}

        return res.json({ ok: true, user });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Server error' });
    }
});

// Database-backed storage (persistent across restarts)

app.get('/api/users', async (_req, res) => {
    try {
        const allUsers = await users.getAll();
        return res.json({ ok: true, users: allUsers });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to fetch users' });
    }
});

app.post('/api/users/upsert', async (req, res) => {
    try {
        console.log('📥 Upserting user with data:', req.body);
        const { user } = req.body || {};
        if (!user || !user.id) {
            console.log('❌ Invalid user payload:', user);
            return res.status(400).json({ ok: false, error: 'Invalid user payload' });
        }
        console.log('🔄 Calling users.create with:', user);
        const upsertedUser = await users.create(user);
        console.log('✅ User upserted successfully:', upsertedUser);
        return res.json({ ok: true, user: upsertedUser });
    } catch (e) {
        console.error('❌ Error upserting user:', e);
        return res.status(500).json({ ok: false, error: 'Failed to upsert user', details: e.message });
    }
});

app.post('/api/users/moderate', async (req, res) => {
    try {
        const { userId, banned, verified, action } = req.body || {};
        if (!userId) return res.status(400).json({ ok: false, error: 'Missing userId' });
        
        let updateData = {};
        
        // Support both new format (banned/verified) and old format (action)
        if (banned !== undefined) updateData.banned = banned;
        if (verified !== undefined) updateData.verified = verified;
        
        // Legacy support for action parameter
        if (action) {
            switch (action) {
                case 'BAN':
                    updateData.banned = true;
                    break;
                case 'UNBAN':
                    updateData.banned = false;
                    break;
                case 'VERIFY':
                    updateData.verified = true;
                    break;
                case 'UNVERIFY':
                    updateData.verified = false;
                    break;
                default:
                    return res.status(400).json({ ok: false, error: 'Invalid action' });
            }
        }
        
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ ok: false, error: 'No update data provided' });
        }
        
        const updatedUser = await users.updateModeration(userId, updateData);
        if (!updatedUser) return res.status(404).json({ ok: false, error: 'User not found' });
        return res.json({ ok: true, user: updatedUser });
    } catch (e) {
        console.error('Error in users/moderate:', e);
        return res.status(500).json({ ok: false, error: 'Failed to update user' });
    }
});

// Aggregate services across users
app.get('/api/services', async (_req, res) => {
    try {
        console.log('🔍 Fetching all services...');
        const allServices = await services.getAll();
        console.log('📥 Services fetched:', allServices.length, 'services');
        console.log('📥 Services data:', allServices);
        return res.json({ ok: true, services: allServices });
    } catch (e) {
        console.error('❌ Error fetching services:', e);
        return res.status(500).json({ ok: false, error: 'Failed to fetch services' });
    }
});

app.post('/api/services/moderate', async (req, res) => {
    try {
        const { serviceId, userId, approved } = req.body || {};
        if (!serviceId || typeof approved !== 'boolean') {
            return res.status(400).json({ ok: false, error: 'Missing serviceId or invalid approved value' });
        }
        let updatedService = null;
        if (userId) {
            updatedService = await services.updateApproval(serviceId, userId, approved);
        } else if (typeof services.updateApprovalById === 'function') {
            updatedService = await services.updateApprovalById(serviceId, approved);
        }
        if (!updatedService) return res.status(404).json({ ok: false, error: 'Service not found' });
        return res.json({ ok: true, service: updatedService });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to moderate service' });
    }
});

// ---- Balances: compute from completed trades minus approved withdrawals
app.get('/api/balances/:userId', async (req, res) => {
    try {
        const userId = String(req.params.userId);
        const userBalances = await balances.getByUserId(userId);
        return res.json({ ok: true, balances: userBalances });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to get balances' });
    }
});

// ---- Trades
app.get('/api/trades', async (_req, res) => {
    try {
        const allTrades = await trades.getAll();
        return res.json({ ok: true, trades: allTrades });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to fetch trades' });
    }
});

app.post('/api/trades', async (req, res) => {
    try {
        console.log('📥 Creating trade with data:', req.body);
        const { id, buyer_id, seller_id, service_id, amount, currency, description } = req.body || {};
        if (!id || !buyer_id || !seller_id || !amount || !currency) {
            console.log('❌ Missing required fields:', { id, buyer_id, seller_id, amount, currency });
            return res.status(400).json({ ok: false, error: 'Missing required fields' });
        }
        const tradeData = { id, buyer_id, seller_id, service_id, amount: Number(amount), currency, description };
        console.log('🔄 Calling trades.create with:', tradeData);
        const createdTrade = await trades.create(tradeData);
        console.log('✅ Trade created successfully:', createdTrade);
        return res.json({ ok: true, trade: createdTrade });
    } catch (e) {
        console.error('❌ Error creating trade:', e);
        return res.status(500).json({ ok: false, error: 'Failed to create trade', details: e.message });
    }
});

app.put('/api/trades/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body || {};
        if (!status) return res.status(400).json({ ok: false, error: 'Missing status' });
        const updatedTrade = await trades.updateStatus(id, status);
        if (!updatedTrade) return res.status(404).json({ ok: false, error: 'Trade not found' });
        return res.json({ ok: true, trade: updatedTrade });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to update trade status' });
    }
});

app.put('/api/trades/:id/deposit', async (req, res) => {
    try {
        const { id } = req.params;
        const { deposit_status } = req.body || {};
        if (!deposit_status) return res.status(400).json({ ok: false, error: 'Missing deposit_status' });
        const updatedTrade = await trades.updateDepositStatus(id, deposit_status);
        if (!updatedTrade) return res.status(404).json({ ok: false, error: 'Trade not found' });
        
        // If deposit is approved, update trade status to HELD
        if (deposit_status === 'APPROVED') {
            await trades.updateStatus(id, 'HELD');
        }
        
        return res.json({ ok: true, trade: updatedTrade });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to update deposit status' });
    }
});

// Delivery Management Endpoints
app.put('/api/trades/:id/deliver', async (req, res) => {
    try {
        const { id } = req.params;
        const { delivery_message } = req.body || {};
        const updatedTrade = await trades.updateDeliveryStatus(id, 'DELIVERED', delivery_message);
        if (!updatedTrade) return res.status(404).json({ ok: false, error: 'Trade not found' });
        
        return res.json({ ok: true, trade: updatedTrade });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to update delivery status' });
    }
});

app.put('/api/trades/:id/approve-delivery', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedTrade = await trades.approveDelivery(id);
        if (!updatedTrade) return res.status(404).json({ ok: false, error: 'Trade not found' });
        
        return res.json({ ok: true, trade: updatedTrade });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to approve delivery' });
    }
});

app.put('/api/trades/:id/request-revision', async (req, res) => {
    try {
        const { id } = req.params;
        const { revision_message } = req.body || {};
        if (!revision_message) return res.status(400).json({ ok: false, error: 'Missing revision_message' });
        
        const updatedTrade = await trades.requestRevision(id, revision_message);
        if (!updatedTrade) return res.status(404).json({ ok: false, error: 'Trade not found' });
        
        return res.json({ ok: true, trade: updatedTrade });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to request revision' });
    }
});

app.put('/api/trades/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const { cancelled_by, cancellation_reason } = req.body || {};
        if (!cancelled_by || !cancellation_reason) {
            return res.status(400).json({ ok: false, error: 'Missing cancelled_by or cancellation_reason' });
        }
        
        const updatedTrade = await trades.cancelTrade(id, cancelled_by, cancellation_reason);
        if (!updatedTrade) return res.status(404).json({ ok: false, error: 'Trade not found' });
        
        return res.json({ ok: true, trade: updatedTrade });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to cancel trade' });
    }
});

// Payment verification endpoint
app.post('/api/trades/:id/verify-payment', async (req, res) => {
    try {
        const { id } = req.params;
        const { address, amount, currency } = req.body || {};
        
        if (!address || !amount || !currency) {
            return res.status(400).json({ ok: false, error: 'Missing payment details' });
        }
        
        console.log(`🔍 Verifying payment for trade ${id}: ${amount} ${currency} to ${address}`);
        
        // For now, simulate payment verification
        // In production, this would check the actual blockchain
        const isVerified = await verifyBlockchainPayment(address, amount, currency);
        
        if (isVerified) {
            // Update trade status to HELD
            const updatedTrade = await trades.updateDepositStatus(id, 'APPROVED');
            if (!updatedTrade) return res.status(404).json({ ok: false, error: 'Trade not found' });
            
            return res.json({ ok: true, verified: true, trade: updatedTrade });
        } else {
            return res.json({ ok: true, verified: false, message: 'Payment not found on blockchain' });
        }
    } catch (e) {
        console.error('Error verifying payment:', e);
        return res.status(500).json({ ok: false, error: 'Failed to verify payment' });
    }
});

// Simulate blockchain payment verification
async function verifyBlockchainPayment(address, amount, currency) {
    // In production, this would:
    // 1. Connect to the appropriate blockchain (Bitcoin, Ethereum, Tron, etc.)
    // 2. Check recent transactions to the address
    // 3. Verify the exact amount was received
    // 4. Confirm sufficient confirmations
    
    // For now, simulate a 70% success rate for testing
    return Math.random() > 0.3;
}

app.get('/api/trades/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const userTrades = await trades.getByUserId(userId);
        return res.json({ ok: true, trades: userTrades });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to fetch user trades' });
    }
});

// ---- Services management
app.post('/api/services', async (req, res) => {
    try {
        const { id, user_id, title, description, price, currency, category } = req.body || {};
        if (!id || !user_id || !title || !price || !currency) {
            return res.status(400).json({ ok: false, error: 'Missing required fields' });
        }
        const serviceData = { id, user_id, title, description, price: Number(price), currency, category };
        const createdService = await services.create(serviceData);
        return res.json({ ok: true, service: createdService });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to create service' });
    }
});

app.get('/api/services/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('🔍 Fetching services for user:', userId);
        const userServices = await services.getByUserId(userId);
        console.log('✅ User services fetched:', userServices.length, 'services');
        return res.json({ ok: true, services: userServices });
    } catch (e) {
        console.error('❌ Error fetching user services:', e);
        return res.status(500).json({ ok: false, error: 'Failed to fetch user services', details: e.message });
    }
});

// Service submission endpoint for frontend
app.post('/api/services/submit', async (req, res) => {
    try {
        console.log('🔍 Service submission request:', req.body);
        
        // Support both formats: {userId, service} and direct service fields
        let serviceData;
        if (req.body.userId && req.body.service) {
            // Format: {userId: "123", service: {id, title, price, ...}}
            const { userId, service } = req.body;
            if (!userId || !service || !service.id || !service.title || !service.price || !service.currency) {
                return res.status(400).json({ ok: false, error: 'Missing required fields in service object' });
            }
            serviceData = {
                id: service.id,
                user_id: userId,
                title: service.title,
                description: service.description || '',
                price: Number(service.price),
                currency: service.currency,
                category: service.category || 'General',
                approved: false,
                created_at: new Date().toISOString()
            };
        } else {
            // Format: {user_id, title, price, currency, ...}
            const { user_id, title, price, currency, description, category } = req.body;
            if (!user_id || !title || !price || !currency) {
                return res.status(400).json({ ok: false, error: 'Missing required fields: user_id, title, price, currency' });
            }
            serviceData = {
                id: `service${Date.now()}`,
                user_id: user_id,
                title: title,
                description: description || '',
                price: Number(price),
                currency: currency,
                category: category || 'General',
                approved: false,
                created_at: new Date().toISOString()
            };
        }
        
        console.log('📤 Creating service with data:', serviceData);
        const createdService = await services.create(serviceData);
        console.log('✅ Service created successfully:', createdService);
        return res.json({ ok: true, service: createdService });
    } catch (e) {
        console.error('❌ Error in services/submit:', e);
        return res.status(500).json({ ok: false, error: 'Failed to submit service', details: e.message });
    }
});

// ---- Withdrawals
app.post('/api/withdrawals/request', async (req, res) => {
    try {
        const { userId, amount, currency, address } = req.body || {};
        if (!userId || !amount || !currency || !address) {
            return res.status(400).json({ ok: false, error: 'Missing required fields: userId, amount, currency, address' });
        }
        
        // Validate currency
        const validCurrencies = ['BTC', 'USDT', 'LTC'];
        if (!validCurrencies.includes(currency)) {
            return res.status(400).json({ ok: false, error: 'Invalid currency. Must be BTC, USDT, or LTC' });
        }
        
        // Validate amount
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ ok: false, error: 'Amount must be a positive number' });
        }
        
        const id = `wd_${Date.now()}`;
        const withdrawalData = { 
            id, 
            user_id: String(userId), 
            amount: numAmount, 
            currency, 
            address,
            status: 'PENDING',
            created_at: new Date().toISOString()
        };
        const createdWithdrawal = await withdrawals.create(withdrawalData);
        return res.json({ ok: true, withdrawal: createdWithdrawal });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to create withdrawal' });
    }
});

app.get('/api/withdrawals', async (_req, res) => {
    try {
        const allWithdrawals = await withdrawals.getAll();
        return res.json({ ok: true, withdrawals: allWithdrawals });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to list withdrawals' });
    }
});

app.post('/api/withdrawals/approve', async (req, res) => {
    try {
        const { id, txId } = req.body || {};
        const updatedWithdrawal = await withdrawals.updateStatus(id, 'APPROVED', txId);
        if (!updatedWithdrawal) return res.status(404).json({ ok: false, error: 'Withdrawal not found' });
        return res.json({ ok: true, withdrawal: updatedWithdrawal });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to approve withdrawal' });
    }
});

app.post('/api/withdrawals/reject', async (req, res) => {
    try {
        const { id, reason } = req.body || {};
        const updatedWithdrawal = await withdrawals.updateStatus(id, 'REJECTED', null, reason);
        if (!updatedWithdrawal) return res.status(404).json({ ok: false, error: 'Withdrawal not found' });
        return res.json({ ok: true, withdrawal: updatedWithdrawal });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to reject withdrawal' });
    }
});

// Admin Analytics Endpoints
app.get('/api/admin/stats', async (_req, res) => {
    try {
        const allUsers = await users.getAll();
        const allTrades = await trades.getAll();
        const allWithdrawals = await withdrawals.getAll();
        
        const stats = {
            totalUsers: allUsers.length,
            verifiedUsers: allUsers.filter(u => u.is_verified).length,
            bannedUsers: allUsers.filter(u => u.is_banned).length,
            totalTrades: allTrades.length,
            completedTrades: allTrades.filter(t => t.status === 'COMPLETED').length,
            activeTrades: allTrades.filter(t => !['COMPLETED', 'CANCELLED'].includes(t.status)).length,
            disputedTrades: allTrades.filter(t => t.status === 'DISPUTE').length,
            totalVolume: allTrades.filter(t => t.status === 'COMPLETED').reduce((sum, t) => sum + t.amount, 0),
            pendingWithdrawals: allWithdrawals.filter(w => w.status === 'PENDING').length,
            totalWithdrawals: allWithdrawals.length
        };
        
        return res.json({ ok: true, stats });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to fetch stats' });
    }
});

// Enhanced Services with approval status
app.get('/api/admin/services', (_req, res) => {
    try {
        const allServices = services.getAll();
        return res.json({ ok: true, services: allServices });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to fetch services' });
    }
});

// Enhanced Users with detailed info
app.get('/api/admin/users', async (_req, res) => {
    try {
        const allUsers = await users.getAll();
        return res.json({ ok: true, users: allUsers });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to fetch users' });
    }
});


// Health endpoint for platform checks
app.get('/health', (_req, res) => res.json({ ok: true }));

// API Health endpoint
app.get('/api/health', (_req, res) => {
    res.json({ 
        ok: true, 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: USE_POSTGRESQL ? 'PostgreSQL' : 'SQLite'
    });
});

// ---- Disputes
app.get('/api/disputes', (_req, res) => {
    try {
        // For now, return empty array since disputes table might not exist
        // This will be implemented when disputes functionality is added
        return res.json({ ok: true, disputes: [] });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to fetch disputes' });
    }
});

app.post('/api/disputes', (req, res) => {
    try {
        const { tradeId, reason, description, evidence } = req.body || {};
        if (!tradeId || !reason) {
            return res.status(400).json({ ok: false, error: 'Missing required fields' });
        }
        
        // For now, return a mock response since disputes table might not exist
        const dispute = {
            id: `dispute_${Date.now()}`,
            tradeId,
            reason,
            description: description || '',
            evidence: evidence || [],
            status: 'OPEN',
            createdAt: new Date().toISOString()
        };
        
        return res.json({ ok: true, dispute });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to create dispute' });
    }
});

// Optional: serve static frontend only if present and enabled
const distPath = path.resolve(__dirname, 'dist');
const serveStatic = process.env.SERVE_STATIC === 'true' && fs.existsSync(path.join(distPath, 'index.html'));
if (serveStatic) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
    });
}

// ---- Message Persistence API
app.post('/api/messages/send', async (req, res) => {
    try {
        const { id, trade_id, sender_id, type, content, media_url } = req.body || {};
        if (!id || !trade_id || !sender_id || !content) {
            return res.status(400).json({ ok: false, error: 'Missing required fields' });
        }
        
        const messageData = { id, trade_id, sender_id, type: type || 'TEXT', content, media_url };
        const createdMessage = await messages.create(messageData);
        return res.json({ ok: true, message: createdMessage });
    } catch (e) {
        console.error('Error sending message:', e);
        return res.status(500).json({ ok: false, error: 'Failed to send message' });
    }
});

app.get('/api/messages/:tradeId', async (req, res) => {
    try {
        const { tradeId } = req.params;
        const msgs = await messages.getByTradeId(tradeId);
        return res.json({ ok: true, messages: msgs });
    } catch (e) {
        console.error('Error fetching messages:', e);
        return res.status(500).json({ ok: false, error: 'Failed to fetch messages' });
    }
});

app.get('/api/disputes/messages/:tradeId', async (req, res) => {
    try {
        const { tradeId } = req.params;
        const msgs = await disputeMessages.getByTradeId(tradeId);
        return res.json({ ok: true, messages: msgs });
    } catch (e) {
        console.error('Error fetching dispute messages:', e);
        return res.status(500).json({ ok: false, error: 'Failed to fetch dispute messages' });
    }
});

app.post('/api/disputes/messages/send', async (req, res) => {
    try {
        const { id, trade_id, sender_id, type, content, media_url } = req.body || {};
        if (!id || !trade_id || !sender_id || !content) {
            return res.status(400).json({ ok: false, error: 'Missing required fields' });
        }
        
        const messageData = { id, trade_id, sender_id, type: type || 'TEXT', content, media_url };
        const createdMessage = await disputeMessages.create(messageData);
        return res.json({ ok: true, message: createdMessage });
    } catch (e) {
        console.error('Error sending dispute message:', e);
        return res.status(500).json({ ok: false, error: 'Failed to send dispute message' });
    }
});

// ---- Image/Media Upload API
// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ ok: false, error: 'No file uploaded' });
        }
        
        // Check if Cloudinary is configured
        if (!process.env.CLOUDINARY_CLOUD_NAME) {
            return res.status(500).json({ 
                ok: false, 
                error: 'Cloudinary not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in environment variables.' 
            });
        }
        
        // Convert buffer to base64
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        
        // Determine resource type
        const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
        
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
            resource_type: resourceType,
            folder: 'escrowx',
            quality: resourceType === 'image' ? 'auto:good' : undefined
        });
        
        return res.json({
            ok: true,
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            size: result.bytes
        });
    } catch (e) {
        console.error('Error uploading file:', e);
        return res.status(500).json({ ok: false, error: 'Failed to upload file' });
    }
});

// ---- WebSocket/Socket.io Setup
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Store active connections
const activeConnections = new Map();

io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    
    // Join a trade room
    socket.on('join_trade', (tradeId) => {
        socket.join(`trade_${tradeId}`);
        
        if (!activeConnections.has(tradeId)) {
            activeConnections.set(tradeId, new Set());
        }
        activeConnections.get(tradeId).add(socket.id);
        
        console.log(`👥 User ${socket.id} joined trade ${tradeId}`);
        
        // Notify others in the room
        socket.to(`trade_${tradeId}`).emit('user_joined', {
            userId: socket.id,
            timestamp: new Date().toISOString()
        });
    });
    
    // Join a dispute room
    socket.on('join_dispute', (tradeId) => {
        socket.join(`dispute_${tradeId}`);
        
        if (!activeConnections.has(`dispute_${tradeId}`)) {
            activeConnections.set(`dispute_${tradeId}`, new Set());
        }
        activeConnections.get(`dispute_${tradeId}`).add(socket.id);
        
        console.log(`👥 User ${socket.id} joined dispute ${tradeId}`);
    });
    
    // Handle chat message
    socket.on('send_message', async (data) => {
        const { tradeId, message } = data;
        
        try {
            // Save message to database
            const savedMessage = await messages.create({
                id: message.id,
                trade_id: tradeId,
                sender_id: message.senderId,
                type: message.type || 'TEXT',
                content: message.content,
                media_url: message.mediaUrl
            });
            
            // Broadcast to all users in the trade room
            io.to(`trade_${tradeId}`).emit('receive_message', {
                message: savedMessage,
                timestamp: new Date().toISOString()
            });
            
            console.log(`💬 Message sent to trade ${tradeId}`);
        } catch (error) {
            console.error('Error saving/broadcasting message:', error);
            socket.emit('message_error', { error: 'Failed to send message' });
        }
    });
    
    // Handle dispute message
    socket.on('send_dispute_message', async (data) => {
        const { tradeId, message } = data;
        
        try {
            // Save message to database
            const savedMessage = await disputeMessages.create({
                id: message.id,
                trade_id: tradeId,
                sender_id: message.senderId,
                type: message.type || 'TEXT',
                content: message.content,
                media_url: message.mediaUrl
            });
            
            // Broadcast to all users in the dispute room
            io.to(`dispute_${tradeId}`).emit('receive_dispute_message', {
                message: savedMessage,
                timestamp: new Date().toISOString()
            });
            
            console.log(`💬 Dispute message sent to trade ${tradeId}`);
        } catch (error) {
            console.error('Error saving/broadcasting dispute message:', error);
            socket.emit('message_error', { error: 'Failed to send dispute message' });
        }
    });
    
    // Handle typing indicator
    socket.on('typing', (data) => {
        const { tradeId, userId, userName } = data;
        socket.to(`trade_${tradeId}`).emit('user_typing', {
            userId,
            userName,
            isTyping: true
        });
    });
    
    socket.on('stop_typing', (data) => {
        const { tradeId, userId } = data;
        socket.to(`trade_${tradeId}`).emit('user_typing', {
            userId,
            isTyping: false
        });
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
        
        // Remove from active connections
        activeConnections.forEach((users, roomId) => {
            users.delete(socket.id);
            if (users.size === 0) {
                activeConnections.delete(roomId);
            }
        });
    });
});

// Export io for use in other modules if needed
export { io };

// 404 handler (must be last)
app.use((req, res) => {
    res.status(404).json({ 
        ok: false, 
        error: 'Endpoint not found' 
    });
});


// Start server with HTTP server for WebSocket support
httpServer.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server ready`);
});


