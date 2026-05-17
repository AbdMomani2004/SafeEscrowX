import { User, Trade, Currency, EscrowStatus, MessageType, Review } from './types';

// Removed mock sample users

export const adminUser: User = {
  id: 'admin',
  username: 'AI Mediator',
  avatarUrl: `https://api.dicebear.com/8.x/bottts/svg?seed=admin`,
  rating: 0.0,
  isVerified: true,
};

// Empty user list by default; users are sourced from Telegram or real backend
export const mockUsers: User[] = [];

// No mock trades in production
export const mockTrades: Trade[] = [];