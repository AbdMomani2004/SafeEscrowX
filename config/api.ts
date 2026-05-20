// Centralized API configuration
// All backend URLs should be fetched from environment variables

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://escrowx-backend.onrender.com';

// API endpoint constants
export const API_ENDPOINTS = {
  // Users
  users: `${BACKEND_URL}/api/users`,
  usersUpsert: `${BACKEND_URL}/api/users/upsert`,
  verify: `${BACKEND_URL}/api/verify`,
  moderateUser: `${BACKEND_URL}/api/users/moderate`,
  
  // Trades
  trades: `${BACKEND_URL}/api/trades`,
  tradesByUser: (userId: string) => `${BACKEND_URL}/api/trades/user/${userId}`,
  tradeStatus: (tradeId: string) => `${BACKEND_URL}/api/trades/${tradeId}/status`,
  tradeDeposit: (tradeId: string) => `${BACKEND_URL}/api/trades/${tradeId}/deposit`,
  tradeApproveDelivery: (tradeId: string) => `${BACKEND_URL}/api/trades/${tradeId}/approve-delivery`,
  tradeRequestRevision: (tradeId: string) => `${BACKEND_URL}/api/trades/${tradeId}/request-revision`,
  tradeCancel: (tradeId: string) => `${BACKEND_URL}/api/trades/${tradeId}/cancel`,
  tradeVerifyPayment: (tradeId: string) => `${BACKEND_URL}/api/trades/${tradeId}/verify-payment`,
  tradeDeliver: (tradeId: string) => `${BACKEND_URL}/api/trades/${tradeId}/deliver`,
  
  // Messages
  messagesSend: `${BACKEND_URL}/api/messages/send`,
  messagesByTrade: (tradeId: string) => `${BACKEND_URL}/api/messages/${tradeId}`,
  
  // Disputes
  disputes: `${BACKEND_URL}/api/disputes`,
  disputeMessagesSend: `${BACKEND_URL}/api/disputes/messages/send`,
  disputeMessagesByTrade: (tradeId: string) => `${BACKEND_URL}/api/disputes/messages/${tradeId}`,
  
  // Services
  services: `${BACKEND_URL}/api/services`,
  serviceById: (serviceId: string) => `${BACKEND_URL}/api/services/${serviceId}`,
  servicesByUser: (userId: string) => `${BACKEND_URL}/api/services/user/${userId}`,
  servicesSubmit: `${BACKEND_URL}/api/services/submit`,
  moderateService: `${BACKEND_URL}/api/services/moderate`,
  
  // Balances
  balances: (userId: string) => `${BACKEND_URL}/api/balances/${userId}`,
  
  // Withdrawals
  withdrawals: `${BACKEND_URL}/api/withdrawals`,
  withdrawalApprove: `${BACKEND_URL}/api/withdrawals/approve`,
  withdrawalReject: `${BACKEND_URL}/api/withdrawals/reject`,
  withdrawalRequest: `${BACKEND_URL}/api/withdrawals/request`,
  
  // Upload
  upload: `${BACKEND_URL}/api/upload`,
  
  // Admin
  adminStats: `${BACKEND_URL}/api/admin/stats`,
  adminSettings: `${BACKEND_URL}/api/admin/settings`,
  adminContactUser: `${BACKEND_URL}/api/admin/contact-user`,
} as const;
