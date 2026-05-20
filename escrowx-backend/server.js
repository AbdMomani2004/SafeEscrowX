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
const DEFAULT_APP_SETTINGS = {
    minDepositUsd: 1,
    maxTradeUsd: 2500,
    minWithdrawalUsd: 5,
    withdrawalFeeUsd: 1,
    depositFlatFeeUnder100: 1,
    depositPercentAbove100: 0.01,
    defaultUsdtNetwork: 'BEP20',
    requiredConfirmationsBtc: 1,
    requiredConfirmationsLtc: 1,
    requiredConfirmationsUsdt: 1
};
let appSettings = { ...DEFAULT_APP_SETTINGS };

const WITHDRAWAL_NETWORKS = {
    BTC: ['BTC'],
    LTC: ['LTC'],
    USDT: ['BEP20', 'TRC20', 'ERC20']
};
const processedPaymentHashes = new Map();

let users, services, trades, withdrawals, balances, reviews, messages, disputeMessages, settingsStore;

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
  settingsStore = db.settings;
  
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
  messages = db.messages;
  disputeMessages = db.disputeMessages;
  settingsStore = db.settings;
  console.log('📁 Using SQLite database');
}

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 8080;

// CORS must be FIRST so every response (including errors/rate limits) carries headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
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

const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const toPositiveNumber = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const normalizeNetwork = (value) => String(value || '').trim().toUpperCase();

const loadAppSettings = async () => {
    if (!settingsStore || typeof settingsStore.getAll !== 'function') {
        appSettings = { ...DEFAULT_APP_SETTINGS };
        return appSettings;
    }
    try {
        const rows = await settingsStore.getAll();
        const merged = { ...DEFAULT_APP_SETTINGS };
        for (const row of rows || []) {
            const key = row.key;
            if (!Object.prototype.hasOwnProperty.call(DEFAULT_APP_SETTINGS, key)) continue;
            let parsedValue = row.value;
            try {
                parsedValue = JSON.parse(row.value);
            } catch (_) {}
            if (typeof DEFAULT_APP_SETTINGS[key] === 'number') {
                merged[key] = toPositiveNumber(parsedValue, DEFAULT_APP_SETTINGS[key]);
            } else if (typeof DEFAULT_APP_SETTINGS[key] === 'string') {
                merged[key] = String(parsedValue || DEFAULT_APP_SETTINGS[key]);
            }
        }
        merged.defaultUsdtNetwork = normalizeNetwork(merged.defaultUsdtNetwork) || DEFAULT_APP_SETTINGS.defaultUsdtNetwork;
        appSettings = merged;
        return appSettings;
    } catch (error) {
        console.error('Failed to load app settings:', error.message);
        appSettings = { ...DEFAULT_APP_SETTINGS };
        return appSettings;
    }
};

const getPaymentRules = () => ({
    MIN_DEPOSIT_USD: appSettings.minDepositUsd,
    MAX_TRADE_USD: appSettings.maxTradeUsd,
    MIN_WITHDRAWAL_USD: appSettings.minWithdrawalUsd,
    WITHDRAWAL_FEE_USD: appSettings.withdrawalFeeUsd
});

const computeDepositFee = (amount) => {
    const flatFee = toPositiveNumber(appSettings.depositFlatFeeUnder100, DEFAULT_APP_SETTINGS.depositFlatFeeUnder100);
    const percentFee = toPositiveNumber(appSettings.depositPercentAbove100, DEFAULT_APP_SETTINGS.depositPercentAbove100);
    if (amount <= 0) return 0;
    return amount < 100 ? flatFee : amount * percentFee;
};

const normalizeWithdrawal = (row = {}) => {
    const rules = getPaymentRules();
    const amount = toNumber(row.amount);
    const fee = toNumber(row.fee, rules.WITHDRAWAL_FEE_USD);
    return {
        ...row,
        userId: String(row.user_id ?? row.userId ?? ''),
        createdAt: row.created_at ?? row.createdAt ?? null,
        updatedAt: row.updated_at ?? row.updatedAt ?? null,
        txId: row.tx_id ?? row.txId ?? null,
        transferProofUrl: row.transfer_proof_url ?? row.transferProofUrl ?? null,
        network: row.network || null,
        fee,
        amount,
        amountAfterFee: toNumber(row.amount_after_fee, amount - fee),
        notifiedUser: Boolean(row.notified_user ?? row.notifiedUser)
    };
};

const sendAdminBotNotification = async (title, lines = []) => {
    const token = process.env.ADMIN_BOT_TOKEN || process.env.MAIN_BOT_TOKEN || process.env.BOT_TOKEN;
    const chatId = process.env.ADMIN_CHAT_ID;
    if (!token || !chatId) return;

    const message = [title, ...lines].join('\n');
    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message })
        });
    } catch (error) {
        console.error('Failed to send admin bot notification:', error.message);
    }
};

const sendTelegramBotMessage = async (token, chatId, message) => {
    if (!token || !chatId || !message) return false;
    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: String(chatId), text: String(message) })
        });
        return true;
    } catch (error) {
        console.error('Failed to send telegram bot message:', error?.message || error);
        return false;
    }
};

const sendUserBotNotification = async (userId, title, lines = []) => {
    const token = process.env.MAIN_BOT_TOKEN || process.env.BOT_TOKEN;
    if (!token || !userId) return false;
    const chatId = String(userId).trim();
    if (!/^\d+$/.test(chatId)) return false;
    const message = [title, ...lines].join('\n');
    return sendTelegramBotMessage(token, chatId, message);
};

const updateWithdrawalStatus = async (id, status, { txId = null, reason = null, proofUrl = null, notifiedUser = null } = {}) => {
    if (USE_POSTGRESQL) {
        return withdrawals.updateStatus(id, status, new Date().toISOString(), reason, txId, proofUrl, notifiedUser);
    }
    return withdrawals.updateStatus(id, status, txId, reason, proofUrl, notifiedUser);
};

const toDbBool = (value) => {
    if (value === undefined || value === null) return null;
    return value ? 1 : 0;
};

const normalizeUserForDb = (userData = {}) => ({
    id: String(userData.id),
    username: userData.username ?? null,
    first_name: userData.first_name ?? userData.firstName ?? null,
    last_name: userData.last_name ?? userData.lastName ?? null,
    photo_url: userData.photo_url ?? userData.photoUrl ?? userData.avatarUrl ?? null,
    is_verified: toDbBool(userData.is_verified ?? userData.isVerified),
    is_banned: toDbBool(userData.is_banned ?? userData.isBanned),
    rating: Number.isFinite(Number(userData.rating)) ? Number(userData.rating) : 0
});

const saveUser = async (userData) => {
    const normalizedUser = normalizeUserForDb(userData);
    if (typeof users.create === 'function') return users.create(normalizedUser);
    if (typeof users.upsert === 'function') return users.upsert(normalizedUser);
    throw new Error('No compatible user persistence function found');
};

const getTradePartyIds = (trade = {}) => ({
    buyerId: String(trade.buyer_id ?? trade.buyerId ?? ''),
    sellerId: String(trade.seller_id ?? trade.sellerId ?? '')
});

const ensureSystemUsers = async () => {
    try {
        await saveUser({
            id: 'admin',
            username: 'admin',
            first_name: 'Admin',
            last_name: 'Support',
            is_verified: true,
            is_banned: false,
            rating: 5
        });
    } catch (error) {
        console.error('Failed to ensure admin system user:', error.message);
    }
};

await ensureSystemUsers();
await loadAppSettings();

app.post('/api/verify', (req, res) => {
    try {
        const { initData } = req.body || {};
        const botToken = process.env.WEBAPP_BOT_TOKEN || process.env.MAIN_BOT_TOKEN || process.env.BOT_TOKEN;
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

app.get('/', (_req, res) => {
    return res.json({
        ok: true,
        service: 'SafeEscrowX API',
        health: '/api/health'
    });
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
        console.log('🔄 Calling users upsert/create with:', user);
        const upsertedUser = await saveUser(user);
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
        const moderationLines = [];
        if (updateData.verified !== undefined) {
            moderationLines.push(`Verification: ${updateData.verified ? 'approved' : 'removed'}`);
        }
        if (updateData.banned !== undefined) {
            moderationLines.push(`Account status: ${updateData.banned ? 'restricted' : 'active'}`);
        }
        await sendUserBotNotification(userId, 'Account update', moderationLines);
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

app.delete('/api/services/:serviceId', async (req, res) => {
    try {
        const { serviceId } = req.params;
        if (!serviceId) {
            return res.status(400).json({ ok: false, error: 'Missing serviceId' });
        }

        const existingService = await services.getById(serviceId);
        if (!existingService) {
            return res.status(404).json({ ok: false, error: 'Service not found' });
        }

        // Requirement: delete gigs after acceptance flow only.
        if (!existingService.approved) {
            return res.status(400).json({ ok: false, error: 'Only approved gigs can be deleted in this flow' });
        }

        const deleted = await services.deleteById(serviceId);
        if (!deleted) {
            return res.status(500).json({ ok: false, error: 'Failed to delete service' });
        }

        return res.json({ ok: true, deletedServiceId: serviceId });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to delete service', details: e.message });
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
        const rules = getPaymentRules();
        console.log('📥 Creating trade with data:', req.body);
        const { id, buyer_id, seller_id, service_id, amount, currency, description } = req.body || {};
        if (!id || !buyer_id || !seller_id || !amount || !currency) {
            console.log('❌ Missing required fields:', { id, buyer_id, seller_id, amount, currency });
            return res.status(400).json({ ok: false, error: 'Missing required fields' });
        }
        const amountUsd = Number(amount);
        if (!Number.isFinite(amountUsd) || amountUsd < rules.MIN_DEPOSIT_USD) {
            return res.status(400).json({ ok: false, error: `Minimum trade amount is $${rules.MIN_DEPOSIT_USD}` });
        }
        if (amountUsd > rules.MAX_TRADE_USD) {
            return res.status(400).json({ ok: false, error: `Maximum trade amount is $${rules.MAX_TRADE_USD}` });
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
        if (status === 'COMPLETED') {
            await sendAdminBotNotification('Funds waiting seller transfer', [
                `Trade: ${id}`,
                `Status: ${status}`,
                `Amount: ${updatedTrade.amount} ${updatedTrade.currency}`
            ]);
        }
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
        await sendAdminBotNotification('Delivery submitted by seller', [
            `Trade: ${id}`,
            `Status: DELIVERED`,
            `Awaiting buyer release of funds`
        ]);
        
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
        await sendAdminBotNotification('Funds waiting seller transfer', [
            `Trade: ${id}`,
            `Status: COMPLETED`,
            `Amount: ${updatedTrade.amount} ${updatedTrade.currency}`
        ]);
        
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

const handleCancelTrade = async (req, res) => {
    try {
        const { id } = req.params;
        const { cancelled_by, cancellation_reason } = req.body || {};
        if (!cancelled_by) {
            return res.status(400).json({ ok: false, error: 'Missing cancelled_by' });
        }

        const normalizedReason = typeof cancellation_reason === 'string' && cancellation_reason.trim()
            ? cancellation_reason.trim()
            : 'Cancelled by user';

        let updatedTrade = null;
        try {
            updatedTrade = await trades.cancelTrade(id, cancelled_by, normalizedReason);
        } catch (cancelError) {
            // Backward-compatible fallback for older DB schemas missing cancellation fields.
            console.warn('cancelTrade with reason fields failed, falling back to status-only cancel:', cancelError?.message || cancelError);
            updatedTrade = await trades.updateStatus(id, 'CANCELLED');
        }
        if (!updatedTrade) return res.status(404).json({ ok: false, error: 'Trade not found' });
        
        return res.json({ ok: true, trade: updatedTrade });
    } catch (e) {
        return res.status(500).json({
            ok: false,
            error: 'Failed to cancel trade',
            details: e?.message || String(e)
        });
    }
};

app.put('/api/trades/:id/cancel', handleCancelTrade);
app.post('/api/trades/:id/cancel', handleCancelTrade);

// Payment verification endpoint
app.post('/api/trades/:id/verify-payment', async (req, res) => {
    try {
        const { id } = req.params;
        const { address, amount, currency, txHash } = req.body || {};
        
        if (!address || !amount || !currency || !txHash) {
            return res.status(400).json({ ok: false, error: 'Missing payment details' });
        }

        if (typeof txHash !== 'string' || txHash.trim().length < 10) {
            return res.status(400).json({ ok: false, error: 'Invalid transaction hash' });
        }

        const trade = await trades.getById(id);
        if (!trade) {
            return res.status(404).json({ ok: false, error: 'Trade not found' });
        }

        if (trade.deposit_status === 'APPROVED') {
            return res.json({ ok: true, verified: true, trade });
        }

        if (trade.currency !== currency) {
            return res.status(400).json({ ok: false, error: 'Currency does not match this trade' });
        }

        const expectedAmount = calculateEscrowDepositTotal(Number(trade.amount));
        const providedAmount = Number(amount);
        if (!Number.isFinite(providedAmount) || Math.abs(providedAmount - expectedAmount) > 0.000001) {
            return res.status(400).json({
                ok: false,
                error: `Amount mismatch. Expected ${expectedAmount.toFixed(6)} ${trade.currency}`
            });
        }

        const normalizedTxHash = txHash.trim().toLowerCase();
        const existingTxOwner = processedPaymentHashes.get(normalizedTxHash);
        if (existingTxOwner && existingTxOwner !== id) {
            return res.status(409).json({
                ok: false,
                error: 'This transaction hash was already used for another trade'
            });
        }
        
        console.log(`🔍 Verifying payment for trade ${id}: ${amount} ${currency} to ${address}, tx=${txHash}`);
        
        // NOTE: Without provider credentials we run deterministic sandbox validation.
        // Integrate a real blockchain RPC/indexer for production settlement checks.
        const verification = await verifyBlockchainPayment({ address, amount: providedAmount, currency, txHash: normalizedTxHash });
        
        if (verification.verified) {
            // Update trade status to HELD
            const updatedTrade = await trades.updateDepositStatus(id, 'APPROVED');
            if (!updatedTrade) return res.status(404).json({ ok: false, error: 'Trade not found' });
            processedPaymentHashes.set(normalizedTxHash, id);
            await sendAdminBotNotification('Payment confirmed', [
                `Trade: ${id}`,
                `Amount: ${providedAmount} ${currency}`,
                `Escrow funded and awaiting delivery`
            ]);
            const { buyerId, sellerId } = getTradePartyIds(updatedTrade);
            await Promise.all([
                sendUserBotNotification(buyerId, 'Deposit confirmed', [
                    `Trade: ${id}`,
                    `Amount: ${providedAmount} ${currency}`,
                    'Escrow is now active.'
                ]),
                sendUserBotNotification(sellerId, 'Buyer deposit confirmed', [
                    `Trade: ${id}`,
                    'Escrow is now funded.'
                ])
            ]);
            
            return res.json({
                ok: true,
                verified: true,
                confirmations: verification.confirmations,
                trade: updatedTrade
            });
        } else {
            return res.json({
                ok: true,
                verified: false,
                message: verification.message || 'Payment not found on blockchain'
            });
        }
    } catch (e) {
        console.error('Error verifying payment:', e);
        return res.status(500).json({ ok: false, error: 'Failed to verify payment' });
    }
});

function calculateEscrowDepositTotal(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const fee = amount < 100 ? 1 : amount * 0.01;
    return Number((amount + fee).toFixed(6));
}

const getRequiredConfirmations = (currency) => {
    if (currency === 'BTC') return appSettings.requiredConfirmationsBtc;
    if (currency === 'LTC') return appSettings.requiredConfirmationsLtc;
    return appSettings.requiredConfirmationsUsdt;
};

async function verifyViaBlockCypher({ address, amount, currency, txHash }) {
    const chain = currency === 'BTC' ? 'btc' : currency === 'LTC' ? 'ltc' : null;
    if (!chain) return { verified: false, message: `BlockCypher verification unsupported for ${currency}` };
    const token = process.env.BLOCKCYPHER_TOKEN?.trim();
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    const url = `https://api.blockcypher.com/v1/${chain}/main/txs/${txHash}${tokenQuery}`;
    const response = await fetch(url);
    if (!response.ok) {
        return { verified: false, message: `Blockchain provider returned ${response.status}` };
    }
    const data = await response.json();
    const confirmations = Number(data?.confirmations || 0);
    const outputs = Array.isArray(data?.outputs) ? data.outputs : [];
    const amountAtAddress = outputs
        .filter((out) => Array.isArray(out.addresses) && out.addresses.includes(address))
        .reduce((sum, out) => sum + toNumber(out.value), 0);
    const amountInCoin = amountAtAddress / 1e8;
    const amountMatch = Math.abs(amountInCoin - amount) <= 0.000001;
    if (!amountMatch) {
        return { verified: false, confirmations, message: `Amount mismatch at destination address. Expected ${amount}, got ${amountInCoin.toFixed(8)}` };
    }
    const required = getRequiredConfirmations(currency);
    if (confirmations < required) {
        return { verified: false, confirmations, message: `Waiting confirmations (${confirmations}/${required})` };
    }
    return { verified: true, confirmations };
}

// Production hardcoded verification policy.
const HARD_PAYMENT_VERIFICATION_MODE = 'live';
const HARD_SANDBOX_AUTO_VERIFY = false;

// Hybrid verifier with forced production defaults.
async function verifyBlockchainPayment({ address, amount, currency, txHash }) {
    const shouldMockFail = txHash.startsWith('fail_');
    if (shouldMockFail) {
        return { verified: false, message: 'Mocked failure for QA testing' };
    }
    if (!address || !currency || !Number.isFinite(amount)) {
        return { verified: false, message: 'Invalid verification input' };
    }
    const mode = HARD_PAYMENT_VERIFICATION_MODE;
    if (mode === 'live') {
        if (currency === 'BTC' || currency === 'LTC') {
            return verifyViaBlockCypher({ address, amount, currency, txHash });
        }
        return {
            verified: false,
            message: `Live verification for ${currency} requires a configured provider.`
        };
    }
    const sandboxAutoVerify = HARD_SANDBOX_AUTO_VERIFY;
    if (!sandboxAutoVerify) {
        return {
            verified: false,
            message: 'Auto verification is disabled in sandbox. Enable a live provider or set SANDBOX_AUTO_VERIFY=true for demo testing.'
        };
    }
    if (!txHash.startsWith('demo_ok_')) {
        return {
            verified: false,
            message: 'Sandbox simulation requires a tx hash starting with "demo_ok_" to mark payment as verified.'
        };
    }
    return { verified: true, confirmations: 1 };
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
        await sendAdminBotNotification('New service pending review', [
            `Service: ${serviceData.title}`,
            `Seller: ${serviceData.user_id}`,
            `Price: ${serviceData.price} ${serviceData.currency}`
        ]);
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
        const rules = getPaymentRules();
        const { userId, amount, currency, network, address } = req.body || {};
        if (!userId || !amount || !currency || !network || !address) {
            return res.status(400).json({ ok: false, error: 'Missing required fields: userId, amount, currency, network, address' });
        }
        
        // Validate currency
        const validCurrencies = ['BTC', 'USDT', 'LTC'];
        if (!validCurrencies.includes(currency)) {
            return res.status(400).json({ ok: false, error: 'Invalid currency. Must be BTC, USDT, or LTC' });
        }

        const allowedNetworks = WITHDRAWAL_NETWORKS[currency] || [];
        if (!allowedNetworks.includes(String(network).toUpperCase())) {
            return res.status(400).json({ ok: false, error: `Invalid network for ${currency}. Allowed: ${allowedNetworks.join(', ')}` });
        }
        
        // Validate amount
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount < rules.MIN_WITHDRAWAL_USD) {
            return res.status(400).json({ ok: false, error: `Minimum withdrawal is $${rules.MIN_WITHDRAWAL_USD}` });
        }
        if (numAmount <= rules.WITHDRAWAL_FEE_USD) {
            return res.status(400).json({ ok: false, error: 'Amount must be a positive number' });
        }

        const fee = rules.WITHDRAWAL_FEE_USD;
        const amountAfterFee = numAmount - fee;
        
        const id = `wd_${Date.now()}`;
        const withdrawalData = { 
            id, 
            user_id: String(userId), 
            amount: numAmount, 
            currency, 
            network: String(network).toUpperCase(),
            address,
            fee,
            amount_after_fee: amountAfterFee,
            status: 'PENDING',
            created_at: new Date().toISOString()
        };
        const createdWithdrawal = await withdrawals.create(withdrawalData);
        await sendAdminBotNotification('New withdrawal request', [
            `User: ${userId}`,
            `Amount: ${numAmount} ${currency}`,
            `Network: ${String(network).toUpperCase()}`
        ]);
        await sendUserBotNotification(String(userId), 'Withdrawal request submitted', [
            `Amount: ${numAmount} ${currency}`,
            `Network: ${String(network).toUpperCase()}`,
            'Status: PENDING'
        ]);
        return res.json({ ok: true, withdrawal: normalizeWithdrawal(createdWithdrawal) });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to create withdrawal', details: e.message });
    }
});

app.get('/api/withdrawals', async (_req, res) => {
    try {
        const allWithdrawals = await withdrawals.getAll();
        return res.json({ ok: true, withdrawals: allWithdrawals.map(normalizeWithdrawal) });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to list withdrawals' });
    }
});

app.post('/api/withdrawals/approve', async (req, res) => {
    try {
        const { id, txId, transferProofUrl } = req.body || {};
        const updatedWithdrawal = await updateWithdrawalStatus(id, 'APPROVED', {
            txId: txId || null,
            proofUrl: transferProofUrl || null,
            notifiedUser: true
        });
        if (!updatedWithdrawal) return res.status(404).json({ ok: false, error: 'Withdrawal not found' });
        await sendUserBotNotification(String(updatedWithdrawal.user_id || updatedWithdrawal.userId), 'Withdrawal approved', [
            `Request: ${id}`,
            txId ? `TxID: ${txId}` : 'Transaction broadcasted by admin.'
        ]);
        return res.json({ ok: true, withdrawal: normalizeWithdrawal(updatedWithdrawal), userNotification: 'Withdrawal sent and user notified.' });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to approve withdrawal', details: e.message });
    }
});

app.post('/api/withdrawals/reject', async (req, res) => {
    try {
        const { id, reason } = req.body || {};
        const updatedWithdrawal = await updateWithdrawalStatus(id, 'REJECTED', { reason: reason || null });
        if (!updatedWithdrawal) return res.status(404).json({ ok: false, error: 'Withdrawal not found' });
        await sendUserBotNotification(String(updatedWithdrawal.user_id || updatedWithdrawal.userId), 'Withdrawal rejected', [
            `Request: ${id}`,
            reason ? `Reason: ${reason}` : 'Please contact support for details.'
        ]);
        return res.json({ ok: true, withdrawal: normalizeWithdrawal(updatedWithdrawal) });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to reject withdrawal', details: e.message });
    }
});

// Admin Analytics Endpoints
app.get('/api/admin/stats', async (_req, res) => {
    try {
        const rules = getPaymentRules();
        const allUsers = await users.getAll();
        const allTrades = await trades.getAll();
        const allWithdrawals = await withdrawals.getAll();
        const completedTrades = allTrades.filter(t => t.status === 'COMPLETED');
        const pendingWithdrawals = allWithdrawals.filter(w => w.status === 'PENDING').map(normalizeWithdrawal);
        const normalizedWithdrawals = allWithdrawals.map(normalizeWithdrawal);
        const depositRevenue = completedTrades.reduce((sum, t) => sum + computeDepositFee(toNumber(t.amount)), 0);
        const withdrawalRevenue = normalizedWithdrawals
            .filter(w => w.status === 'APPROVED')
            .reduce((sum, w) => sum + toNumber(w.fee, rules.WITHDRAWAL_FEE_USD), 0);
        
        const stats = {
            totalUsers: allUsers.length,
            verifiedUsers: allUsers.filter(u => u.is_verified).length,
            bannedUsers: allUsers.filter(u => u.is_banned).length,
            totalTrades: allTrades.length,
            completedTrades: completedTrades.length,
            activeTrades: allTrades.filter(t => !['COMPLETED', 'CANCELLED'].includes(t.status)).length,
            disputedTrades: allTrades.filter(t => t.status === 'DISPUTE').length,
            totalVolume: completedTrades.reduce((sum, t) => sum + toNumber(t.amount), 0),
            totalRevenue: depositRevenue + withdrawalRevenue,
            pendingWithdrawals: pendingWithdrawals.length,
            pendingPayouts: pendingWithdrawals.reduce((sum, w) => sum + toNumber(w.amountAfterFee, toNumber(w.amount)), 0),
            totalWithdrawals: allWithdrawals.length,
            totalDisputes: allTrades.filter(t => t.status === 'DISPUTE').length
        };
        
        return res.json({ ok: true, stats });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to fetch stats' });
    }
});

// Enhanced Services with approval status
app.get('/api/admin/services', async (_req, res) => {
    try {
        const allServices = await services.getAll();
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

app.get('/api/admin/settings', async (_req, res) => {
    try {
        const current = await loadAppSettings();
        return res.json({ ok: true, settings: current });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to fetch settings' });
    }
});

app.put('/api/admin/settings', async (req, res) => {
    try {
        const input = req.body || {};
        const next = {
            minDepositUsd: toPositiveNumber(input.minDepositUsd, appSettings.minDepositUsd),
            maxTradeUsd: toPositiveNumber(input.maxTradeUsd, appSettings.maxTradeUsd),
            minWithdrawalUsd: toPositiveNumber(input.minWithdrawalUsd, appSettings.minWithdrawalUsd),
            withdrawalFeeUsd: toPositiveNumber(input.withdrawalFeeUsd, appSettings.withdrawalFeeUsd),
            depositFlatFeeUnder100: toPositiveNumber(input.depositFlatFeeUnder100, appSettings.depositFlatFeeUnder100),
            depositPercentAbove100: toPositiveNumber(input.depositPercentAbove100, appSettings.depositPercentAbove100),
            defaultUsdtNetwork: normalizeNetwork(input.defaultUsdtNetwork || appSettings.defaultUsdtNetwork) || appSettings.defaultUsdtNetwork,
            requiredConfirmationsBtc: Math.max(0, Math.floor(toPositiveNumber(input.requiredConfirmationsBtc, appSettings.requiredConfirmationsBtc))),
            requiredConfirmationsLtc: Math.max(0, Math.floor(toPositiveNumber(input.requiredConfirmationsLtc, appSettings.requiredConfirmationsLtc))),
            requiredConfirmationsUsdt: Math.max(0, Math.floor(toPositiveNumber(input.requiredConfirmationsUsdt, appSettings.requiredConfirmationsUsdt)))
        };
        if (next.maxTradeUsd > 0 && next.minDepositUsd > next.maxTradeUsd) {
            return res.status(400).json({ ok: false, error: 'minDepositUsd cannot be greater than maxTradeUsd' });
        }
        if (settingsStore && typeof settingsStore.setMany === 'function') {
            await settingsStore.setMany(next);
        }
        appSettings = { ...appSettings, ...next };
        return res.json({ ok: true, settings: appSettings });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to update settings', details: e.message });
    }
});

app.post('/api/admin/contact-user', async (req, res) => {
    try {
        const { tradeId, recipientRole, message } = req.body || {};
        if (!tradeId || !recipientRole || !message) {
            return res.status(400).json({ ok: false, error: 'Missing tradeId, recipientRole, or message' });
        }
        if (!['buyer', 'seller'].includes(recipientRole)) {
            return res.status(400).json({ ok: false, error: 'recipientRole must be buyer or seller' });
        }

        const trade = await trades.getById(tradeId);
        if (!trade) {
            return res.status(404).json({ ok: false, error: 'Trade not found' });
        }

        const { buyerId, sellerId } = getTradePartyIds(trade);
        const recipientId = recipientRole === 'buyer' ? buyerId : sellerId;
        if (!recipientId) {
            return res.status(400).json({ ok: false, error: `Trade does not have a ${recipientRole}` });
        }

        const payload = {
            id: `msg_admin_${Date.now()}`,
            trade_id: String(tradeId),
            sender_id: 'admin',
            type: 'SYSTEM',
            content: `[ADMIN DIRECT MESSAGE to ${recipientRole.toUpperCase()}] ${String(message).trim()}`
        };
        const createdMessage = await messages.create(payload);

        await sendAdminBotNotification('Admin contacted trade user', [
            `Trade: ${tradeId}`,
            `Recipient: ${recipientRole} (${recipientId})`
        ]);

        return res.json({ ok: true, message: createdMessage, recipientId, recipientRole });
    } catch (e) {
        console.error('Error in admin/contact-user:', e);
        return res.status(500).json({ ok: false, error: 'Failed to contact user', details: e.message });
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
app.get('/api/disputes', async (_req, res) => {
    try {
        const allTrades = await trades.getAll();
        const disputedTrades = allTrades.filter(t => t.status === 'DISPUTE');
        const disputes = await Promise.all(disputedTrades.map(async (trade) => {
            const messagesForTrade = await disputeMessages.getByTradeId(trade.id);
            return {
                id: `dispute_${trade.id}`,
                tradeId: trade.id,
                amount: toNumber(trade.amount),
                currency: trade.currency,
                status: 'OPEN',
                createdAt: trade.updated_at || trade.created_at,
                disputeMessages: messagesForTrade || []
            };
        }));
        return res.json({ ok: true, disputes });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to fetch disputes' });
    }
});

app.post('/api/disputes', async (req, res) => {
    try {
        const { tradeId, userId, reason, description, evidence } = req.body || {};
        if (!tradeId || !reason) {
            return res.status(400).json({ ok: false, error: 'Missing required fields' });
        }

        const updatedTrade = await trades.updateStatus(tradeId, 'DISPUTE');
        if (!updatedTrade) {
            return res.status(404).json({ ok: false, error: 'Trade not found' });
        }

        const openerId = String(userId || updatedTrade.buyer_id || updatedTrade.buyerId || 'system');
        const initialMessage = await disputeMessages.create({
            id: `dm_${Date.now()}`,
            trade_id: tradeId,
            sender_id: openerId,
            type: 'SYSTEM',
            content: `${reason}${description ? ` - ${description}` : ''}`
        });

        if (Array.isArray(evidence)) {
            for (const item of evidence) {
                await disputeMessages.create({
                    id: `dm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    trade_id: tradeId,
                    sender_id: openerId,
                    type: 'EVIDENCE',
                    content: typeof item === 'string' ? item : JSON.stringify(item)
                });
            }
        }

        await sendAdminBotNotification('New dispute opened', [
            `Trade: ${tradeId}`,
            `Reason: ${reason}`,
            `Opened by: ${openerId}`
        ]);
        const { buyerId, sellerId } = getTradePartyIds(updatedTrade);
        await Promise.all([
            sendUserBotNotification(buyerId, 'Dispute update', [
                `Trade: ${tradeId}`,
                'Status changed to DISPUTE.'
            ]),
            sendUserBotNotification(sellerId, 'Dispute update', [
                `Trade: ${tradeId}`,
                'Status changed to DISPUTE.'
            ])
        ]);

        const dispute = {
            id: `dispute_${Date.now()}`,
            tradeId,
            reason,
            description: description || '',
            evidence: evidence || [],
            status: 'OPEN',
            createdAt: new Date().toISOString(),
            disputeMessages: initialMessage ? [initialMessage] : []
        };
        
        return res.json({ ok: true, dispute });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to create dispute', details: e.message });
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
        if (!id || !trade_id || !sender_id || (!content && !media_url)) {
            return res.status(400).json({ ok: false, error: 'Missing required fields' });
        }
        
        const messageData = { id, trade_id, sender_id, type: type || 'TEXT', content: content || '[Attachment]', media_url };
        const createdMessage = await messages.create(messageData);
        const trade = await trades.getById(trade_id);
        if (trade) {
            const { buyerId, sellerId } = getTradePartyIds(trade);
            const recipientId = String(sender_id) === buyerId ? sellerId : buyerId;
            if (recipientId && recipientId !== String(sender_id)) {
                await sendUserBotNotification(recipientId, 'New message', [
                    `Trade: ${trade_id}`,
                    media_url ? 'Attachment received.' : String(content || '').slice(0, 120)
                ]);
            }
        }
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


