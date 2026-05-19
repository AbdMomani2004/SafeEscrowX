import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Trade, Message, EscrowStatus, Currency, User, MessageType, Review, Notification } from './types';
import { useUsers } from './UserContext';
import { API_ENDPOINTS } from './config/api';

interface NewTradeData {
    buyer: User;
    seller: User;
    description: string;
    amount: number;
    currency: Currency;
    deliveryTimeHours: number;
}

interface TradesContextType {
  trades: Trade[];
  isLoading: boolean;
  addTrade: (tradeData: NewTradeData) => Trade;
  updateTradeStatus: (tradeId: string, status: EscrowStatus) => void;
  addMessage: (tradeId: string, message: Message) => Promise<void>;
  addDisputeMessage: (tradeId: string, message: Message) => Promise<void>;
  loadMessages: (tradeId: string) => Promise<Message[]>;
  loadDisputeMessages: (tradeId: string) => Promise<Message[]>;
  addReview: (tradeId: string, reviewerId: string, rating: number, comment: string) => void;
  getTradeById: (id: string) => Trade | undefined;
  getTradesByUserId: (userId: string) => Trade[];
  getTradesByStatus: (status: EscrowStatus) => Trade[];
}

const TradesContext = createContext<TradesContextType | undefined>(undefined);

// Helper function to revive date strings from JSON into Date objects
const reviveDates = (key: any, value: any) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
    return new Date(value);
  }
  return value;
};

// --- Notification Context ---
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (tradeId: string, message: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((tradeId: string, message: string) => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      tradeId,
      message,
      read: false,
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotification, ...prev]);
    window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('warning');
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
// --- End Notification Context ---


export const TradesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, allUsers } = useUsers();
  const { addNotification } = useNotifications();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch trades from backend on mount and when currentUser changes
  useEffect(() => {
    const fetchTrades = async () => {
      if (!currentUser) {
        console.log('❌ No currentUser available');
        return;
      }
      
      console.log('🔄 TradesContext: currentUser changed, fetching trades...', currentUser.id);
      
      try {
        setIsLoading(true);
        console.log('🔄 Fetching trades for user:', currentUser.id);
        const resp = await fetch(API_ENDPOINTS.tradesByUser(currentUser.id));
        const json = await resp.json();
        
        console.log('📥 Trades API response:', json);
        
        if (json.ok && Array.isArray(json.trades)) {
          // Convert backend trades to frontend format with user data
          const convertedTrades: Trade[] = json.trades.map((t: any) => {
            const buyer = allUsers.find(u => u.id === t.buyer_id) || { id: t.buyer_id, username: 'Unknown Buyer' };
            const seller = allUsers.find(u => u.id === t.seller_id) || { id: t.seller_id, username: 'Unknown Seller' };
            
            return {
              id: t.id,
              buyer: { id: buyer.id, username: buyer.username },
              seller: { id: seller.id, username: seller.username },
              amount: Number(t.amount),
              currency: t.currency,
              description: t.description,
              status: t.status as EscrowStatus,
              createdAt: new Date(t.created_at),
              deliveryTimeHours: 24, // Default value
              messages: [], // Messages will be loaded separately if needed
              buyerReview: undefined,
              sellerReview: undefined,
              disputeMessages: []
            };
          });
          
          console.log('✅ Converted trades:', convertedTrades);
          setTrades(convertedTrades);
        } else {
          console.log('❌ No trades found or invalid response');
          setTrades([]);
        }
      } catch (error) {
        console.error('❌ Error fetching trades:', error);
        // No fallback - only use backend data
        setTrades([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrades();
  }, [currentUser, allUsers]);

  const addTrade = (tradeData: NewTradeData): Trade => {
    const tradeId = `trade${Date.now()}`;
    const newTrade: Trade = {
      ...tradeData,
      id: tradeId,
      createdAt: new Date(),
      messages: [{
        id: `m${Date.now()}`,
        senderId: 'system',
        type: MessageType.SYSTEM,
        content: `Escrow created by ${tradeData.buyer.username}. Buyer can pay anytime to activate escrow protection.`,
        timestamp: new Date(),
      }],
      status: EscrowStatus.CREATED,
    };
    setTrades(prev => [newTrade, ...prev]);

    // Persist to backend (fire-and-forget to keep UI snappy)
    try {
      const payload = {
        id: tradeId,
        buyer_id: tradeData.buyer.id,
        seller_id: tradeData.seller.id,
        service_id: (tradeData as any).serviceId || undefined,
        amount: Number(tradeData.amount),
        currency: tradeData.currency,
        description: tradeData.description,
      };
      fetch(API_ENDPOINTS.trades, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (_) {
      // ignore network errors; local state already updated
    }

    return newTrade;
  };

  const updateTradeStatus = (tradeId: string, status: EscrowStatus) => {
    let tradeDescription = '';
    setTrades(prev =>
      prev.map(t => {
        if (t.id === tradeId) {
          tradeDescription = t.description;
          return { ...t, status };
        }
        return t;
      })
    );
     const content = `Status updated to ${status.replace('_', ' ')}`;
     if (tradeDescription) {
        addNotification(tradeId, `Trade for "${tradeDescription}" updated to ${status.replace('_', ' ')}.`);
     }
     const systemMessage: Message = {
        id: `m${Date.now()}`,
        senderId: 'system',
        type: MessageType.SYSTEM,
        content,
        timestamp: new Date(),
     };
     addMessage(tradeId, systemMessage);
  };

  const addMessage = async (tradeId: string, message: Message) => {
    // Update local state first
    setTrades(prev =>
      prev.map(t =>
        t.id === tradeId ? { ...t, messages: [...t.messages, message] } : t
      )
    );
    
    // Persist to backend
    try {
      await fetch(API_ENDPOINTS.messagesSend, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: message.id,
          trade_id: tradeId,
          sender_id: message.senderId,
          type: message.type,
          content: message.content,
          media_url: message.media?.url
        })
      });
    } catch (error) {
      console.error('Failed to persist message:', error);
    }
  };
  
  const addDisputeMessage = async (tradeId: string, message: Message) => {
    // Update local state first
    setTrades(prev =>
        prev.map(t =>
          t.id === tradeId ? { ...t, disputeMessages: [...(t.disputeMessages || []), message] } : t
        )
      );
    
    // Persist to backend
    try {
      await fetch(API_ENDPOINTS.disputeMessagesSend, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: message.id,
          trade_id: tradeId,
          sender_id: message.senderId,
          type: message.type,
          content: message.content,
          media_url: message.media?.url
        })
      });
    } catch (error) {
      console.error('Failed to persist dispute message:', error);
    }
  };
  
  const loadMessages = async (tradeId: string): Promise<Message[]> => {
    try {
      const response = await fetch(API_ENDPOINTS.messagesByTrade(tradeId));
      const json = await response.json();
      
      if (json.ok && Array.isArray(json.messages)) {
        const messages: Message[] = json.messages.map((msg: any) => ({
          id: msg.id,
          senderId: msg.sender_id,
          type: msg.type || 'TEXT',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          media: msg.media_url ? {
            type: msg.media_url.match(/\.(mp4|webm)$/i) ? 'video' : 'image',
            url: msg.media_url
          } : undefined
        }));
        
        return messages;
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
    
    return [];
  };
  
  const loadDisputeMessages = async (tradeId: string): Promise<Message[]> => {
    try {
      const response = await fetch(API_ENDPOINTS.disputeMessagesByTrade(tradeId));
      const json = await response.json();
      
      if (json.ok && Array.isArray(json.messages)) {
        const messages: Message[] = json.messages.map((msg: any) => ({
          id: msg.id,
          senderId: msg.sender_id,
          type: msg.type || 'TEXT',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          media: msg.media_url ? {
            type: msg.media_url.match(/\.(mp4|webm)$/i) ? 'video' : 'image',
            url: msg.media_url
          } : undefined
        }));
        
        return messages;
      }
    } catch (error) {
      console.error('Failed to load dispute messages:', error);
    }
    
    return [];
  };

  const addReview = (tradeId: string, reviewerId: string, rating: number, comment: string) => {
    setTrades(prev =>
      prev.map(t => {
        if (t.id === tradeId) {
          const newReview: Review = {
            reviewerId,
            rating,
            comment,
            timestamp: new Date(),
          };
          if (t.buyer.id === reviewerId) {
            return { ...t, buyerReview: newReview };
          } else if (t.seller.id === reviewerId) {
            return { ...t, sellerReview: newReview };
          }
        }
        return t;
      })
    );
  };

  return (
    <TradesContext.Provider value={{ 
      trades, 
      isLoading,
      addTrade, 
      updateTradeStatus, 
      addMessage, 
      addDisputeMessage,
      loadMessages,
      loadDisputeMessages,
      addReview,
      getTradeById: (id: string) => trades.find(t => t.id === id),
      getTradesByUserId: (userId: string) => trades.filter(t => t.buyer.id === userId || t.seller.id === userId),
      getTradesByStatus: (status: EscrowStatus) => trades.filter(t => t.status === status),
    }}>
      {children}
    </TradesContext.Provider>
  );
};

export const useTrades = () => {
  const context = useContext(TradesContext);
  if (context === undefined) {
    throw new Error('useTrades must be used within a TradesProvider');
  }
  return context;
};
