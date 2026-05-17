import React, { useState, useEffect } from 'react';
import { ICONS } from './constants';
import { Currency, EscrowStatus } from './types';
import type { View } from './App';
import { useNotifications } from './AppContext';

// Fix for Telegram WebApp types not being available on window object.
declare global {
  interface Window {
    Telegram: any;
  }
}

const tg = window.Telegram?.WebApp;

const timeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}y`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}mo`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m`;
    return `${Math.floor(seconds)}s`;
};


const NotificationPanel: React.FC<{ 
    onClose: () => void; 
    onNavigate: (view: View, tradeId: string) => void;
}> = ({ onClose, onNavigate }) => {
  const { notifications, markAllAsRead, unreadCount } = useNotifications();

  useEffect(() => {
    if (unreadCount > 0) {
      const timer = setTimeout(() => markAllAsRead(), 1000); // Mark as read after a short delay
      return () => clearTimeout(timer);
    }
  }, [unreadCount, markAllAsRead]);

  const handleNotificationClick = (tradeId: string) => {
    onNavigate('tradeRoom', tradeId);
    onClose();
  };

  return (
    <div className="absolute top-16 right-0 w-80 bg-surface/95 rounded-2xl shadow-2xl border border-border-color z-50 animate-fade-in-down backdrop-blur-xl">
        <div className="p-4 border-b border-border-color">
            <h3 className="font-bold text-white">Notifications</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
                notifications.map(n => (
                    <div key={n.id} onClick={() => handleNotificationClick(n.tradeId)} className="p-4 border-b border-border-color/50 hover:bg-surface-alt cursor-pointer flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${n.read ? 'bg-transparent' : 'bg-primary'}`}></div>
                        <div className="flex-1">
                            <p className="text-sm text-white">{n.message}</p>
                            <p className="text-xs text-text-body mt-1">{timeAgo(n.timestamp)} ago</p>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-text-body text-center p-8">You have no new notifications.</p>
            )}
        </div>
    </div>
  );
};

export const Header: React.FC<{ 
    title: string; 
    onNavigate: (view: View, tradeId?: string | null, userId?: string | null) => void;
    children?: React.ReactNode;
}> = ({ title, onNavigate, children }) => {
  const { unreadCount } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="p-4 text-white flex items-center justify-between sticky top-0 bg-background/70 backdrop-blur-2xl z-20 border-b border-border-color/70 shadow-[0_8px_30px_rgba(0,0,0,0.24)]">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">{title}</h1>
         <div className="flex items-center space-x-2">
            {children}
            <div className="relative">
                 <button onClick={() => setPanelOpen(!panelOpen)} className="bg-surface/85 border border-border-color/80 p-3 rounded-full hover:bg-surface-alt hover:border-primary/40 transition-all relative">
                    <ICONS.bell className="w-6 h-6 text-text-body"/>
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-danger text-white text-xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-background animate-ping once">
                           {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
                {panelOpen && <NotificationPanel onClose={() => setPanelOpen(false)} onNavigate={(view, tradeId) => onNavigate(view, tradeId, null)} />}
            </div>
        </div>
    </div>
  )
};

interface BottomNavProps {
  activeView: View;
  setActiveView: (view: View) => void;
  setCreatingNew: (creating: boolean) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeView, setActiveView, setCreatingNew }) => {
  const navItems: { view: View, icon: React.FC<any> }[] = [
    { view: 'home', icon: ICONS.home },
    { view: 'chats', icon: ICONS.chat },
    { view: 'explore', icon: ICONS.search },
    { view: 'profile', icon: ICONS.profile },
  ];
  
  const handleCreateNew = () => {
    tg?.HapticFeedback.impactOccurred('heavy');
    setCreatingNew(true);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-surface/65 backdrop-blur-2xl border-t border-border-color/80 shadow-[0_-16px_34px_rgba(0,0,0,0.35)]">
      <div className="flex justify-around items-center h-full max-w-md mx-auto">
        {navItems.slice(0, 2).map(item => (
          <NavItem key={item.view} item={item} isActive={activeView === item.view} onClick={() => setActiveView(item.view)} />
        ))}
        
        <button onClick={handleCreateNew} className="bg-gradient-primary text-white rounded-full p-4 shadow-glow-primary hover:scale-105 hover:brightness-105 transition-all duration-300 transform -translate-y-6 border border-white/20">
          <ICONS.add className="w-8 h-8" />
        </button>

        {navItems.slice(2, 4).map(item => (
          <NavItem key={item.view} item={item} isActive={activeView === item.view} onClick={() => setActiveView(item.view)} />
        ))}
      </div>
    </div>
  );
};

const NavItem: React.FC<{item: { view: View, icon: React.FC<any> }, isActive: boolean, onClick: () => void}> = ({ item, isActive, onClick }) => {
    const handleClick = () => {
      tg?.HapticFeedback.impactOccurred('light');
      onClick();
    }
    return (
        <button onClick={handleClick} className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary/20 border border-primary/40 shadow-[0_8px_20px_rgba(63,109,244,0.3)]' : 'hover:bg-surface-alt/70 border border-transparent'}`}>
          <div className={`relative transition-all duration-300 ${isActive ? 'text-primary scale-105' : 'text-text-body'}`}>
            <item.icon className="w-7 h-7" />
            {isActive && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full"></div>}
          </div>
        </button>
    );
};


interface StatusBadgeProps {
  status: EscrowStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusStyles: Record<EscrowStatus, { text: string; bg: string; text_color: string; border: string }> = {
    [EscrowStatus.CREATED]: { text: 'CREATED', bg: 'bg-gray-500/20', text_color: 'text-gray-300', border: 'border-gray-500' },
    [EscrowStatus.HELD]: { text: 'FUNDS HELD', bg: 'bg-primary/20', text_color: 'text-primary', border: 'border-primary' },
    [EscrowStatus.IN_PROGRESS]: { text: 'IN PROGRESS', bg: 'bg-yellow-500/20', text_color: 'text-yellow-400', border: 'border-yellow-500' },
    [EscrowStatus.DELIVERED]: { text: 'DELIVERED', bg: 'bg-yellow-500/20', text_color: 'text-yellow-400', border: 'border-yellow-500' },
    [EscrowStatus.DISPUTE]: { text: 'IN DISPUTE', bg: 'bg-danger/20', text_color: 'text-danger', border: 'border-danger' },
    [EscrowStatus.COMPLETED]: { text: 'COMPLETED', bg: 'bg-success/20', text_color: 'text-success', border: 'border-success' },
    [EscrowStatus.CANCELLED]: { text: 'CANCELLED', bg: 'bg-gray-700/20', text_color: 'text-text-body', border: 'border-gray-700' },
  };

  const style = statusStyles[status] || statusStyles[EscrowStatus.CREATED];

  return (
    <div className={`px-3 py-1 text-xs font-bold rounded-full border ${style.bg} ${style.text_color} ${style.border}`}>
      {style.text.replace('_', ' ')}
    </div>
  );
};

interface CryptoIconProps {
  currency: Currency;
  className?: string;
}

export const CryptoIcon: React.FC<CryptoIconProps> = ({ currency, className = 'w-6 h-6' }) => {
    const tokenStyleMap: Record<Currency, { symbol: string; bg: string; text: string }> = {
        [Currency.BTC]: { symbol: 'B', bg: 'from-amber-400 to-orange-500', text: 'text-white' },
        [Currency.USDT]: { symbol: 'T', bg: 'from-emerald-400 to-teal-500', text: 'text-white' },
        [Currency.LTC]: { symbol: 'L', bg: 'from-slate-300 to-slate-500', text: 'text-slate-900' },
    };
    const tokenStyle = tokenStyleMap[currency];

    return (
      <span className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${tokenStyle.bg} ${tokenStyle.text} font-black shadow-[0_6px_18px_rgba(0,0,0,0.35)] ring-1 ring-white/30 ${className}`}>
        {tokenStyle.symbol}
      </span>
    );
};


interface CountdownTimerProps {
  hours: number;
}
export const CountdownTimer: React.FC<CountdownTimerProps> = ({ hours }) => {
  const targetTime = new Date(Date.now() + hours * 60 * 60 * 1000).getTime();
  const [timeLeft, setTimeLeft] = useState(targetTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = targetTime - Date.now();
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  const h = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const m = Math.floor((timeLeft / 1000 / 60) % 60);
  const s = Math.floor((timeLeft / 1000) % 60);

  return (
    <div className="text-warning font-mono text-sm">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  );
};

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmClass?: string;
}> = ({ isOpen, onClose, onConfirm, title, children, confirmText = 'Confirm', cancelText = 'Cancel', confirmClass = 'bg-gradient-primary' }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    tg?.HapticFeedback.notificationOccurred('success');
    onConfirm();
  }
  
  const handleClose = () => {
    tg?.HapticFeedback.impactOccurred('light');
    onClose();
  }

  return (
    // Raise z-index to appear above full-screen create screen and headers
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
      <div className="bg-surface rounded-3xl p-6 w-full max-w-sm border border-border-color/80 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
        <div className="text-text-body mb-6">{children}</div>
        <div className="flex space-x-3">
          <button onClick={handleClose} className="flex-1 bg-surface-alt text-white font-bold py-3 rounded-xl hover:bg-gray-700/50 border border-border-color/80 transition-all">
            {cancelText}
          </button>
          <button onClick={handleConfirm} className={`flex-1 text-white font-bold py-3 rounded-xl transition-all hover:brightness-110 ${confirmClass}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const Toast: React.FC<{ message: string | null }> = ({ message }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [message]);

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 bg-success text-white px-6 py-3 rounded-full shadow-lg z-[100] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
      {message}
    </div>
  );
};
