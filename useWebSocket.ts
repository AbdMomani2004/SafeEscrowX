import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from './config/api';

interface UseWebSocketProps {
  tradeId?: string;
  isDispute?: boolean;
  onMessage?: (message: any) => void;
  enabled?: boolean;
}

export const useWebSocket = ({ tradeId, isDispute = false, onMessage, enabled = true }: UseWebSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !tradeId) return;

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setIsConnected(true);

      // Join the room
      if (isDispute) {
        socket.emit('join_dispute', tradeId);
      } else {
        socket.emit('join_trade', tradeId);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('receive_message', (data) => {
      console.log('💬 Received message:', data);
      if (onMessage && !isDispute) {
        onMessage(data.message);
      }
    });

    socket.on('receive_dispute_message', (data) => {
      console.log('💬 Received dispute message:', data);
      if (onMessage && isDispute) {
        onMessage(data.message);
      }
    });

    socket.on('user_joined', (data) => {
      console.log('👤 User joined:', data.userId);
      setOnlineUsers(prev => new Set(prev).add(data.userId));
    });

    socket.on('user_left', (data) => {
      console.log('👤 User left:', data.userId);
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    socket.on('user_typing', (data) => {
      // Can be used to show typing indicator
      console.log('⌨️ User typing:', data);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    return () => {
      socket.close();
    };
  }, [tradeId, isDispute, onMessage, enabled]);

  const sendMessage = useCallback((message: any) => {
    if (!socketRef.current || !isConnected || !tradeId) {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }

    if (isDispute) {
      socketRef.current.emit('send_dispute_message', {
        tradeId,
        message
      });
    } else {
      socketRef.current.emit('send_message', {
        tradeId,
        message
      });
    }
  }, [tradeId, isDispute, isConnected]);

  const sendTypingIndicator = useCallback((userId: string, userName: string, isTyping: boolean) => {
    if (!socketRef.current || !isConnected || !tradeId) return;

    if (isTyping) {
      socketRef.current.emit('typing', { tradeId, userId, userName });
    } else {
      socketRef.current.emit('stop_typing', { tradeId, userId });
    }
  }, [tradeId, isConnected]);

  return {
    isConnected,
    onlineUsers,
    sendMessage,
    sendTypingIndicator,
    socket: socketRef.current
  };
};

export default useWebSocket;
