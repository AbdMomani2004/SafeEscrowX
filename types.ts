// FIX: Removed a circular self-import of `Currency` that was causing a conflict with its own declaration.
export enum Currency {
  BTC = 'BTC',
  USDT = 'USDT',
  LTC = 'LTC',
}

export enum EscrowStatus {
  CREATED = 'CREATED',
  HELD = 'HELD',
  IN_PROGRESS = 'IN_PROGRESS',
  DELIVERED = 'DELIVERED',
  DISPUTE = 'DISPUTE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  EVIDENCE = 'EVIDENCE',
}

export interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: Currency;
  approved?: boolean;
  rejected?: boolean;
  createdAt?: Date;
}

export interface User {
  id: string;
  username: string;
  avatarUrl: string;
  rating: number;
  isVerified: boolean;
  isBanned?: boolean;
  services?: Service[];
}

export interface Message {
  id: string;
  senderId: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  media?: {
    type: 'image' | 'video';
    url: string;
  };
}

export interface Review {
  reviewerId: string;
  rating: number; // 1-5
  comment: string;
  timestamp: Date;
}

export interface Trade {
  id: string;
  buyer: User;
  seller: User;
  description: string;
  amount: number;
  currency: Currency;
  status: EscrowStatus;
  createdAt: Date;
  deliveryTimeHours: number;
  messages: Message[];
  disputeMessages?: Message[];
  buyerReview?: Review; // Review from buyer about seller
  sellerReview?: Review; // Review from seller about buyer
}

export interface Notification {
  id: string;
  tradeId: string;
  message: string;
  read: boolean;
  timestamp: Date;
}
