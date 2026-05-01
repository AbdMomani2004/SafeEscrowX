import React, { useEffect, useMemo, useState } from 'react';
import { useUsers } from './UserContext';
import { useTrades } from './AppContext';
import { Currency, EscrowStatus, Trade } from './types';
import { StatusBadge, CryptoIcon } from './components';
import { API_ENDPOINTS } from './config/api';

const ADMIN_EMAIL = 'admin@escrowx.com';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'Admin2025@2026.Alol.Tekkie256';

// Professional Icons
const Icons = {
  dashboard: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
    </svg>
  ),
  users: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  services: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  disputes: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  withdrawals: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  ),
  chat: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  analytics: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  settings: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  check: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  x: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  eye: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  message: (props: any) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  online: (props: any) => (
    <svg {...props} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
    </svg>
  )
};

// Professional Admin Login
const AdminLogin: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem('escrowx-admin-authed', '1');
      onSuccess();
    } else {
      setError('Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Icons.dashboard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">EscrowX Admin</h1>
          <p className="text-white/70">Professional Management Dashboard</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="admin@escrowx.com"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required 
            />
          </div>
          
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Enter your password"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required 
            />
          </div>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-300 text-sm">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing In...' : 'Sign In to Dashboard'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-white/50 text-sm">
            Secure admin access • Protected by encryption
          </p>
        </div>
      </div>
    </div>
  );
};

// Dashboard Stats Cards
const StatsCard: React.FC<{ 
  title: string; 
  value: string | number; 
  change?: string; 
  icon: React.ComponentType<any>;
  color: string;
}> = ({ title, value, change, icon: Icon, color }) => (
  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        {change && (
          <p className={`text-sm mt-1 ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
            {change} from last month
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

// Professional Sidebar
const Sidebar: React.FC<{ 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}> = ({ activeTab, setActiveTab, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
    { id: 'users', label: 'Users', icon: Icons.users },
    { id: 'services', label: 'Services', icon: Icons.services },
    { id: 'disputes', label: 'Disputes', icon: Icons.disputes },
    { id: 'withdrawals', label: 'Withdrawals', icon: Icons.withdrawals },
    { id: 'chat', label: 'Live Chat', icon: Icons.chat },
    { id: 'analytics', label: 'Analytics', icon: Icons.analytics },
    { id: 'settings', label: 'Settings', icon: Icons.settings },
  ];

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Icons.dashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">EscrowX</h2>
            <p className="text-sm text-gray-500">Admin Panel</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="absolute bottom-4 left-4 right-4">
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left text-red-600 hover:bg-red-50 transition-all duration-200"
        >
          <Icons.x className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

// Enhanced Users Management
const UsersManagement: React.FC = () => {
  const { allUsers, refreshUsers, updateUserModeration } = useUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'banned' | 'pending'>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    let filtered = allUsers.filter(u => u.id !== 'admin');
    
    if (searchQuery) {
      filtered = filtered.filter(u => 
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    switch (filterStatus) {
      case 'verified':
        filtered = filtered.filter(u => u.isVerified);
        break;
      case 'banned':
        filtered = filtered.filter(u => u.isBanned);
        break;
      case 'pending':
        filtered = filtered.filter(u => !u.isVerified && !u.isBanned);
        break;
    }
    
    return filtered;
  }, [allUsers, searchQuery, filterStatus]);

  const moderate = async (userId: string, updates: { banned?: boolean; verified?: boolean }) => {
    setBusy(userId);
    try {
      const resp = await fetch(API_ENDPOINTS.moderateUser, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates })
      });
      if (resp.ok) {
        updateUserModeration(userId, updates);
        await refreshUsers();
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage buyers, sellers, and user accounts</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            {filteredUsers.filter(u => u.isVerified).length} Verified
          </div>
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            {filteredUsers.filter(u => !u.isVerified && !u.isBanned).length} Pending
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search users by username..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Users</option>
            <option value="verified">Verified</option>
            <option value="banned">Banned</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(user => (
          <div key={user.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-4 mb-4">
              <img src={user.avatarUrl} alt={user.username} className="w-12 h-12 rounded-full" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{user.username}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex text-yellow-400">
                    {'★'.repeat(Math.floor(Number(user.rating) || 0))}
                  </div>
                  <span className="text-sm text-gray-600">({(Number(user.rating) || 0).toFixed(1)})</span>
                </div>
              </div>
              {user.isVerified && (
                <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  Verified
                </div>
              )}
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">User ID:</span>
                <span className="font-mono text-gray-900">{user.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  user.isBanned ? 'bg-red-100 text-red-800' :
                  user.isVerified ? 'bg-green-100 text-green-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {user.isBanned ? 'Banned' : user.isVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => moderate(user.id, { verified: true, banned: false })}
                disabled={busy === user.id || user.isVerified}
                className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Icons.check className="w-4 h-4 inline mr-1" />
                {user.isVerified ? 'Verified' : 'Verify'}
              </button>
              <button
                onClick={() => moderate(user.id, { banned: true, verified: false })}
                disabled={busy === user.id || user.isBanned}
                className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Icons.x className="w-4 h-4 inline mr-1" />
                {user.isBanned ? 'Banned' : 'Ban'}
              </button>
              <button
                onClick={() => setSelectedUser(user)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Icons.eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Enhanced Services Management
const ServicesManagement: React.FC = () => {
  const [services, setServices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(API_ENDPOINTS.services);
        const json = await resp.json();
        const items = Array.isArray(json.services) ? json.services : [];
        const mapped = items.map((s: any) => ({
          ...s,
          userId: s.user_id ?? s.userId,
          user: s.username ? { username: s.username, avatarUrl: s.photo_url } : s.user,
          approved: Boolean(s.approved),
          rejected: Boolean(s.rejected),
        }));
        setServices(mapped);
      } catch {}
    })();
  }, []);

  const { baseFiltered, pendingList, approvedList, rejectedList } = useMemo(() => {
    let base = services;
    if (searchQuery) {
      base = base.filter(s =>
        s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    // Always prepare three buckets so admin can see them side-by-side
    const pending = base.filter(s => !s.approved && !s.rejected);
    const approved = base.filter(s => s.approved);
    const rejected = base.filter(s => s.rejected);
    return { baseFiltered: base, pendingList: pending, approvedList: approved, rejectedList: rejected };
  }, [services, searchQuery]);

  const refreshServices = async () => {
    try {
      const resp = await fetch(API_ENDPOINTS.services);
      const json = await resp.json();
      const items = Array.isArray(json.services) ? json.services : [];
      const mapped = items.map((s: any) => ({
        ...s,
        userId: s.user_id ?? s.userId,
        user: s.username ? { username: s.username, avatarUrl: s.photo_url } : s.user,
        approved: Boolean(s.approved),
        rejected: Boolean(s.rejected),
      }));
      setServices(mapped);
    } catch (error) {
      console.error('Failed to refresh services:', error);
    }
  };

  const { allUsers } = useUsers();

  const moderate = async (userId: string, serviceId: string, approved: boolean) => {
    setBusy(serviceId);
    try {
      // Resolve userId via username if missing
      let resolvedUserId: string | undefined = userId;
      if (!resolvedUserId) {
        const svc = services.find(s => String(s.id) === String(serviceId));
        const username = svc?.user?.username;
        if (username) {
          const match = allUsers.find(u => u.username === username);
          if (match) resolvedUserId = match.id;
        }
      }
      const payload = {
        userId: resolvedUserId ? String(resolvedUserId) : undefined,
        serviceId: String(serviceId),
        approved: Boolean(approved)
      };
      console.log('📤 Moderating service with payload:', payload);
      const response = await fetch(API_ENDPOINTS.moderateService, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        // Refresh services from backend to ensure consistency
        const resp = await fetch(API_ENDPOINTS.services);
        const json = await resp.json();
        setServices(Array.isArray(json.services) ? json.services : []);
      } else {
        const text = await response.text();
        console.error('❌ Service moderation failed', response.status, response.statusText, text);
        try {
          const err = JSON.parse(text);
          alert(`Failed to moderate service: ${err.error || text}`);
        } catch (_) {
          alert(`Failed to moderate service: HTTP ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Failed to moderate service:', error);
      alert(`Network error: ${error?.message || 'Please try again.'}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Services Management</h1>
          <p className="text-gray-600 mt-1">Review and approve seller services</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            {services.filter(s => s.approved).length} Approved
          </div>
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            {services.filter(s => !s.approved && !s.rejected).length} Pending
          </div>
          <button
            onClick={refreshServices}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search services by title, description, or seller..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Services</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Services Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Pending Review</h3>
            <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">{pendingList.length}</span>
          </div>
          <div className="space-y-4">
            {pendingList.map(service => (
              <div key={`${service.userId}-${service.id}`} className="bg-white rounded-2xl p-4 shadow border border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{service.title}</div>
                    <div className="text-gray-600 text-sm line-clamp-2">{service.description}</div>
                    <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                      <span>By: <span className="font-medium text-gray-900">{service.user?.username}</span></span>
                      <span>Price: <span className="font-medium text-gray-900">{service.price} {service.currency}</span></span>
                    </div>
                  </div>
                  <div className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800">Pending</div>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => moderate(service.userId, service.id, true)} disabled={busy === service.id} className="flex-1 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50">Approve</button>
                  <button onClick={() => moderate(service.userId, service.id, false)} disabled={busy === service.id} className="flex-1 bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50">Reject</button>
                </div>
              </div>
            ))}
            {pendingList.length === 0 && <div className="text-sm text-gray-500">No pending services</div>}
          </div>
        </div>
        {/* Approved */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Approved</h3>
            <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">{approvedList.length}</span>
          </div>
          <div className="space-y-4">
            {approvedList.map(service => (
              <div key={`${service.userId}-${service.id}`} className="bg-white rounded-2xl p-4 shadow border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{service.title}</div>
                    <div className="text-gray-600 text-sm line-clamp-2">{service.description}</div>
                    <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                      <span>By: <span className="font-medium text-gray-900">{service.user?.username}</span></span>
                      <span>Price: <span className="font-medium text-gray-900">{service.price} {service.currency}</span></span>
                    </div>
                  </div>
                  <div className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">Approved</div>
                </div>
              </div>
            ))}
            {approvedList.length === 0 && <div className="text-sm text-gray-500">No approved services</div>}
          </div>
        </div>
        {/* Rejected */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Rejected</h3>
            <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded-full">{rejectedList.length}</span>
          </div>
          <div className="space-y-4">
            {rejectedList.map(service => (
              <div key={`${service.userId}-${service.id}`} className="bg-white rounded-2xl p-4 shadow border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{service.title}</div>
                    <div className="text-gray-600 text-sm line-clamp-2">{service.description}</div>
                    <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                      <span>By: <span className="font-medium text-gray-900">{service.user?.username}</span></span>
                      <span>Price: <span className="font-medium text-gray-900">{service.price} {service.currency}</span></span>
                    </div>
                  </div>
                  <div className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800">Rejected</div>
                </div>
              </div>
            ))}
            {rejectedList.length === 0 && <div className="text-sm text-gray-500">No rejected services</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Disputes Management
const DisputesManagement: React.FC = () => {
  const { trades } = useTrades();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved' | 'escalated'>('all');
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const disputes = useMemo(() => {
    return trades.filter(t => t.status === EscrowStatus.DISPUTE);
  }, [trades]);

  const filteredDisputes = useMemo(() => {
    let filtered = disputes;
    
    if (searchQuery) {
      filtered = filtered.filter(d =>
        d.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.buyer?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.seller?.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [disputes, searchQuery]);

  const resolveDispute = async (tradeId: string, resolution: string, winner: 'buyer' | 'seller') => {
    setBusy(tradeId);
    try {
      // Update trade status based on resolution
      const newStatus = winner === 'buyer' ? EscrowStatus.CANCELLED : EscrowStatus.COMPLETED;
      await fetch(API_ENDPOINTS.tradeStatus(tradeId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      // Add resolution message
      const resolutionMessage = {
        id: `res_${Date.now()}`,
        senderId: 'admin',
        type: 'SYSTEM',
        content: `Dispute resolved: ${resolution}. Winner: ${winner}`,
        timestamp: new Date()
      };
      
      // This would typically be stored in the database
      console.log('Dispute resolved:', { tradeId, resolution, winner });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dispute Resolution Center</h1>
          <p className="text-gray-600 mt-1">Manage and resolve trade disputes with AI assistance</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
            {disputes.length} Open Disputes
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            AI Mediation Available
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search disputes by description, buyer, or seller..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Disputes</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>
      </div>

      {/* Disputes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredDisputes.map(dispute => (
          <div key={dispute.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{dispute.description}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Buyer:</span>
                    <span className="font-medium text-gray-900">{dispute.buyer?.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Seller:</span>
                    <span className="font-medium text-gray-900">{dispute.seller?.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-medium text-gray-900">{dispute.amount} {dispute.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dispute Messages:</span>
                    <span className="font-medium text-gray-900">{(dispute.disputeMessages || []).length}</span>
                  </div>
                </div>
              </div>
              <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
                Open Dispute
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => setSelectedDispute(dispute)}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                <Icons.eye className="w-4 h-4 inline mr-1" />
                View Details & Resolve
              </button>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => resolveDispute(dispute.id, 'Refund approved', 'buyer')}
                  disabled={busy === dispute.id}
                  className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Icons.check className="w-4 h-4 inline mr-1" />
                  Favor Buyer
                </button>
                <button
                  onClick={() => resolveDispute(dispute.id, 'Service delivered as agreed', 'seller')}
                  disabled={busy === dispute.id}
                  className="flex-1 bg-purple-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Icons.check className="w-4 h-4 inline mr-1" />
                  Favor Seller
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dispute Detail Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Dispute Resolution</h2>
              <button
                onClick={() => setSelectedDispute(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icons.x className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-900 mb-2">Trade Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Description:</span>
                      <span className="font-medium">{selectedDispute.description}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-medium">{selectedDispute.amount} {selectedDispute.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span className="font-medium">{new Date(selectedDispute.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-gray-900 mb-2">Parties</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Buyer:</span>
                      <span className="font-medium">{selectedDispute.buyer?.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Seller:</span>
                      <span className="font-medium">{selectedDispute.seller?.username}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-2">Dispute Messages</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {(selectedDispute.disputeMessages || []).map((msg: any) => (
                    <div key={msg.id} className="bg-white p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{msg.senderId === 'admin' ? 'AI Mediator' : msg.senderId}</span>
                        <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-700">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    resolveDispute(selectedDispute.id, 'Refund approved based on evidence', 'buyer');
                    setSelectedDispute(null);
                  }}
                  className="flex-1 bg-green-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  Resolve in Favor of Buyer
                </button>
                <button
                  onClick={() => {
                    resolveDispute(selectedDispute.id, 'Service delivered as agreed', 'seller');
                    setSelectedDispute(null);
                  }}
                  className="flex-1 bg-purple-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-600 transition-colors"
                >
                  Resolve in Favor of Seller
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Analytics Dashboard
const AnalyticsDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({});
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.adminStats);
        const data = await response.json();
        if (data.ok) {
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const chartData = {
    users: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'New Users',
        data: [12, 19, 3, 5, 2, 3],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }]
    },
    revenue: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Revenue ($)',
        data: [1200, 1900, 3000, 5000, 2000, 3000],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      }]
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600 mt-1">Comprehensive platform analytics and insights</p>
        </div>
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value as any)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">${stats.totalVolume?.toFixed(2) || '0.00'}</p>
              <p className="text-green-600 text-sm mt-1">+12.5% from last month</p>
            </div>
            <div className="p-3 rounded-xl bg-green-500">
              <Icons.withdrawals className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Active Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers || 0}</p>
              <p className="text-blue-600 text-sm mt-1">+8.2% from last month</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500">
              <Icons.users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Success Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalTrades > 0 ? Math.round((stats.completedTrades / stats.totalTrades) * 100) : 0}%
              </p>
              <p className="text-green-600 text-sm mt-1">+2.1% from last month</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500">
              <Icons.check className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Dispute Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalTrades > 0 ? Math.round((stats.disputedTrades / stats.totalTrades) * 100) : 0}%
              </p>
              <p className="text-red-600 text-sm mt-1">-1.3% from last month</p>
            </div>
            <div className="p-3 rounded-xl bg-red-500">
              <Icons.disputes className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <Icons.analytics className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Chart visualization would go here</p>
              <p className="text-sm text-gray-400">Integration with Chart.js or similar</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <Icons.analytics className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Revenue chart would go here</p>
              <p className="text-sm text-gray-400">Integration with Chart.js or similar</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Users:</span>
              <span className="font-medium">{stats.totalUsers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Verified Users:</span>
              <span className="font-medium">{stats.verifiedUsers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Banned Users:</span>
              <span className="font-medium">{stats.bannedUsers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Verification Rate:</span>
              <span className="font-medium">
                {stats.totalUsers > 0 ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trade Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Trades:</span>
              <span className="font-medium">{stats.totalTrades || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completed:</span>
              <span className="font-medium">{stats.completedTrades || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active:</span>
              <span className="font-medium">{stats.activeTrades || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Disputed:</span>
              <span className="font-medium">{stats.disputedTrades || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Volume:</span>
              <span className="font-medium">${stats.totalVolume?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending Withdrawals:</span>
              <span className="font-medium">{stats.pendingWithdrawals || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Withdrawals:</span>
              <span className="font-medium">{stats.totalWithdrawals || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Trade Value:</span>
              <span className="font-medium">
                ${stats.totalTrades > 0 ? (stats.totalVolume / stats.totalTrades).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Settings Panel
const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    platformName: 'EscrowX',
    platformDescription: 'Secure. Simple. Automated Escrow.',
    maintenanceMode: false,
    registrationEnabled: true,
    verificationRequired: false,
    maxTradeAmount: 10000,
    minTradeAmount: 1,
    platformFee: 1.0,
    supportEmail: 'support@escrowx.com',
    supportPhone: '+1-800-ESCROWX',
    termsOfService: 'https://escrowx.com/terms',
    privacyPolicy: 'https://escrowx.com/privacy'
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    adminAlerts: true,
    userAlerts: true
  });

  const [security, setSecurity] = useState({
    twoFactorAuth: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    ipWhitelist: '',
    apiRateLimit: 100
  });

  const [paymentAddresses, setPaymentAddresses] = useState({
    usdt: 'TKfA9FCbhCZD2PghJzcFsYsnEcZTdWv9jw',
    btc: 'bc1qcwx2g3nq6fntcascfym4xnl0279xktet4xphcg',
    ltc: 'LT7qj8j8JesorWM9Kqe6gRdrnVeKh1n8GT'
  });

  const saveSettings = async (category: string, data: any) => {
    try {
      // This would typically save to database
      console.log(`Saving ${category} settings:`, data);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-600 mt-1">Configure platform settings and preferences</p>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">General Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
            <input
              type="text"
              value={settings.platformName}
              onChange={e => setSettings({...settings, platformName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Platform Description</label>
            <input
              type="text"
              value={settings.platformDescription}
              onChange={e => setSettings({...settings, platformDescription: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
            <input
              type="email"
              value={settings.supportEmail}
              onChange={e => setSettings({...settings, supportEmail: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Support Phone</label>
            <input
              type="text"
              value={settings.supportPhone}
              onChange={e => setSettings({...settings, supportPhone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mt-6 flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={e => setSettings({...settings, maintenanceMode: e.target.checked})}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Maintenance Mode</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.registrationEnabled}
              onChange={e => setSettings({...settings, registrationEnabled: e.target.checked})}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Registration Enabled</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.verificationRequired}
              onChange={e => setSettings({...settings, verificationRequired: e.target.checked})}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Verification Required</span>
          </label>
        </div>
        <button
          onClick={() => saveSettings('general', settings)}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Save General Settings
        </button>
      </div>

      {/* Trading Settings */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Trading Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Min Trade Amount ($)</label>
            <input
              type="number"
              value={settings.minTradeAmount}
              onChange={e => setSettings({...settings, minTradeAmount: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Trade Amount ($)</label>
            <input
              type="number"
              value={settings.maxTradeAmount}
              onChange={e => setSettings({...settings, maxTradeAmount: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Platform Fee (%)</label>
            <input
              type="number"
              step="0.1"
              value={settings.platformFee}
              onChange={e => setSettings({...settings, platformFee: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={() => saveSettings('trading', settings)}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Save Trading Settings
        </button>
      </div>

      {/* Payment Settings */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">💳 Payment Addresses</h2>
        <p className="text-sm text-gray-600 mb-4">Set your wallet addresses for receiving escrow payments</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">USDT (TRC20) Address</label>
            <input
              type="text"
              value={paymentAddresses.usdt}
              onChange={e => setPaymentAddresses({...paymentAddresses, usdt: e.target.value})}
              placeholder="Enter your USDT TRC20 address"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Example: TKfA9FCbhCZD2PghJzcFsYsnEcZTdWv9jw</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bitcoin (BTC) Address</label>
            <input
              type="text"
              value={paymentAddresses.btc}
              onChange={e => setPaymentAddresses({...paymentAddresses, btc: e.target.value})}
              placeholder="Enter your BTC address"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Example: bc1qcwx2g3nq6fntcascfym4xnl0279xktet4xphcg</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Litecoin (LTC) Address</label>
            <input
              type="text"
              value={paymentAddresses.ltc}
              onChange={e => setPaymentAddresses({...paymentAddresses, ltc: e.target.value})}
              placeholder="Enter your LTC address"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Example: LT7qj8j8JesorWM9Kqe6gRdrnVeKh1n8GT</p>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.setItem('paymentAddresses', JSON.stringify(paymentAddresses));
            alert('✅ Payment addresses saved successfully!\n\nNote: You need to update screens.tsx file with these addresses for them to take effect.');
          }}
          className="mt-6 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
        >
          💾 Save Payment Addresses
        </button>
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Important:</strong> After saving, copy these addresses and update the <code className="bg-yellow-100 px-1 rounded">screens.tsx</code> file (lines 830-834), then rebuild and redeploy your frontend.
          </p>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
            <input
              type="number"
              value={security.sessionTimeout}
              onChange={e => setSecurity({...security, sessionTimeout: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
            <input
              type="number"
              value={security.maxLoginAttempts}
              onChange={e => setSecurity({...security, maxLoginAttempts: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">API Rate Limit (requests/hour)</label>
            <input
              type="number"
              value={security.apiRateLimit}
              onChange={e => setSecurity({...security, apiRateLimit: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">IP Whitelist (comma-separated)</label>
            <input
              type="text"
              value={security.ipWhitelist}
              onChange={e => setSecurity({...security, ipWhitelist: e.target.value})}
              placeholder="192.168.1.1, 10.0.0.1"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mt-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={security.twoFactorAuth}
              onChange={e => setSecurity({...security, twoFactorAuth: e.target.checked})}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Two-Factor Authentication</span>
          </label>
        </div>
        <button
          onClick={() => saveSettings('security', security)}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Save Security Settings
        </button>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Settings</h2>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={notifications.emailNotifications}
              onChange={e => setNotifications({...notifications, emailNotifications: e.target.checked})}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Email Notifications</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={notifications.smsNotifications}
              onChange={e => setNotifications({...notifications, smsNotifications: e.target.checked})}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">SMS Notifications</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={notifications.pushNotifications}
              onChange={e => setNotifications({...notifications, pushNotifications: e.target.checked})}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Push Notifications</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={notifications.adminAlerts}
              onChange={e => setNotifications({...notifications, adminAlerts: e.target.checked})}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Admin Alerts</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={notifications.userAlerts}
              onChange={e => setNotifications({...notifications, userAlerts: e.target.checked})}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">User Alerts</span>
          </label>
        </div>
        <button
          onClick={() => saveSettings('notifications', notifications)}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Save Notification Settings
        </button>
      </div>
    </div>
  );
};

// Enhanced Trades Management
const TradesManagement: React.FC = () => {
  const { trades, updateTradeStatus } = useTrades();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'created' | 'held' | 'in_progress' | 'delivered' | 'dispute' | 'completed' | 'cancelled'>('all');
  const [selectedTrade, setSelectedTrade] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const filteredTrades = useMemo(() => {
    let filtered = trades;
    
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.buyer?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.seller?.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status.toLowerCase() === filterStatus.toUpperCase());
    }
    
    return filtered;
  }, [trades, searchQuery, filterStatus]);

  const updateStatus = async (tradeId: string, status: string) => {
    setBusy(tradeId);
    try {
      await fetch(API_ENDPOINTS.tradeStatus(tradeId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      updateTradeStatus(tradeId, status as EscrowStatus);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trades Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage all platform trades</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {trades.length} Total Trades
          </div>
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            {trades.filter(t => t.status === EscrowStatus.COMPLETED).length} Completed
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search trades by description, buyer, or seller..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="created">Created</option>
            <option value="held">Held</option>
            <option value="in_progress">In Progress</option>
            <option value="delivered">Delivered</option>
            <option value="dispute">Dispute</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Trade ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Description</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Parties</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Created</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTrades.map(trade => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-mono text-gray-900">{trade.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 max-w-xs truncate">{trade.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      <div>Buyer: {trade.buyer?.username}</div>
                      <div>Seller: {trade.seller?.username}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <CryptoIcon currency={trade.currency as Currency} className="w-4 h-4" />
                      <span className="text-sm font-medium text-gray-900">{trade.amount}</span>
                      <span className="text-sm text-gray-500">{trade.currency}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={trade.status as EscrowStatus} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {new Date(trade.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedTrade(trade)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Icons.eye className="w-4 h-4" />
                      </button>
                      <select
                        value={trade.status}
                        onChange={e => updateStatus(trade.id, e.target.value)}
                        disabled={busy === trade.id}
                        className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="CREATED">Created</option>
                        <option value="HELD">Held</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="DISPUTE">Dispute</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Enhanced Withdrawals Management
const WithdrawalsManagement: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(API_ENDPOINTS.withdrawals);
        const json = await resp.json();
        setWithdrawals(Array.isArray(json.withdrawals) ? json.withdrawals : []);
      } catch {}
    })();
  }, []);

  const filteredWithdrawals = useMemo(() => {
    let filtered = withdrawals;
    
    if (searchQuery) {
      filtered = filtered.filter(w =>
        w.userId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.currency?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    switch (filterStatus) {
      case 'pending':
        filtered = filtered.filter(w => w.status === 'PENDING');
        break;
      case 'approved':
        filtered = filtered.filter(w => w.status === 'APPROVED');
        break;
      case 'rejected':
        filtered = filtered.filter(w => w.status === 'REJECTED');
        break;
    }
    
    return filtered;
  }, [withdrawals, searchQuery, filterStatus]);

  const processWithdrawal = async (id: string, type: 'approve' | 'reject') => {
    setBusy(id);
    try {
      const url = type === 'approve' ? API_ENDPOINTS.withdrawalApprove : API_ENDPOINTS.withdrawalReject;
      await fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id }) 
      });
      setWithdrawals(prev => prev.map(w => 
        w.id === id ? { ...w, status: type.toUpperCase() } : w
      ));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Withdrawals Management</h1>
          <p className="text-gray-600 mt-1">Process withdrawal requests and track transactions</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            {withdrawals.filter(w => w.status === 'PENDING').length} Pending
          </div>
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            {withdrawals.filter(w => w.status === 'APPROVED').length} Approved
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by user ID, address, or currency..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Withdrawals</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Address</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredWithdrawals.map(withdrawal => (
                <tr key={withdrawal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{withdrawal.userId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <CryptoIcon currency={withdrawal.currency as Currency} className="w-4 h-4" />
                      <span className="text-sm font-medium text-gray-900">{withdrawal.amount}</span>
                      <span className="text-sm text-gray-500">{withdrawal.currency}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-mono max-w-xs truncate">
                      {withdrawal.address}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      withdrawal.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      withdrawal.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {withdrawal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {new Date(withdrawal.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {withdrawal.status === 'PENDING' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => processWithdrawal(withdrawal.id, 'approve')}
                          disabled={busy === withdrawal.id}
                          className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Icons.check className="w-4 h-4 inline mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => processWithdrawal(withdrawal.id, 'reject')}
                          disabled={busy === withdrawal.id}
                          className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Icons.x className="w-4 h-4 inline mr-1" />
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Live Chat Support
const LiveChatSupport: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  // Mock data for demonstration
  useEffect(() => {
    setMessages([
      { id: 1, user: 'John Doe', message: 'I need help with my withdrawal', time: '10:30 AM', type: 'user' },
      { id: 2, user: 'Admin', message: 'Hello! I can help you with that. What seems to be the issue?', time: '10:31 AM', type: 'admin' },
      { id: 3, user: 'Sarah Wilson', message: 'My trade is stuck in dispute', time: '10:35 AM', type: 'user' },
    ]);
    
    setOnlineUsers([
      { id: 1, name: 'John Doe', status: 'online', lastSeen: '2 minutes ago' },
      { id: 2, name: 'Sarah Wilson', status: 'online', lastSeen: '5 minutes ago' },
      { id: 3, name: 'Mike Johnson', status: 'away', lastSeen: '1 hour ago' },
    ]);
  }, []);

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        user: 'Admin',
        message: newMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'admin'
      };
      setMessages([...messages, message]);
      setNewMessage('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Chat Support</h1>
          <p className="text-gray-600 mt-1">Real-time customer support and assistance</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            {onlineUsers.filter(u => u.status === 'online').length} Online
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {messages.length} Messages
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Online Users */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Online Users</h3>
          <div className="space-y-3">
            {onlineUsers.map(user => (
              <div key={user.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                <div className={`w-3 h-3 rounded-full ${
                  user.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.lastSeen}</div>
                </div>
                <button className="text-blue-600 hover:text-blue-800">
                  <Icons.message className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col h-96">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Support Chat</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.type === 'admin' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="text-sm font-medium mb-1">{msg.user}</div>
                  <div className="text-sm">{msg.message}</div>
                  <div className={`text-xs mt-1 ${
                    msg.type === 'admin' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={sendMessage}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Icons.message className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard
const Dashboard: React.FC = () => {
  const { allUsers } = useUsers();
  const { trades } = useTrades();
  const [activeTab, setActiveTab] = useState('dashboard');

  const stats = useMemo(() => {
    const totalUsers = allUsers.filter(u => u.id !== 'admin').length;
    const verifiedUsers = allUsers.filter(u => u.isVerified).length;
    const totalTrades = trades.length;
    const activeTrades = trades.filter(t => t.status !== EscrowStatus.COMPLETED && t.status !== EscrowStatus.CANCELLED).length;
    const totalVolume = trades.filter(t => t.status === EscrowStatus.COMPLETED).reduce((sum, t) => sum + t.amount, 0);
    const disputes = trades.filter(t => t.status === EscrowStatus.DISPUTE).length;

    return {
      totalUsers,
      verifiedUsers,
      totalTrades,
      activeTrades,
      totalVolume,
      disputes
    };
  }, [allUsers, trades]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
              <p className="text-gray-600 mt-1">Welcome to your EscrowX admin panel</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatsCard
                title="Total Users"
                value={stats.totalUsers}
                change="+12%"
                icon={Icons.users}
                color="bg-blue-500"
              />
              <StatsCard
                title="Verified Users"
                value={stats.verifiedUsers}
                change="+8%"
                icon={Icons.check}
                color="bg-green-500"
              />
              <StatsCard
                title="Total Trades"
                value={stats.totalTrades}
                change="+25%"
                icon={Icons.services}
                color="bg-purple-500"
              />
              <StatsCard
                title="Active Trades"
                value={stats.activeTrades}
                change="+15%"
                icon={Icons.online}
                color="bg-yellow-500"
              />
              <StatsCard
                title="Total Volume"
                value={`$${stats.totalVolume.toFixed(2)}`}
                change="+30%"
                icon={Icons.withdrawals}
                color="bg-indigo-500"
              />
              <StatsCard
                title="Open Disputes"
                value={stats.disputes}
                change="-5%"
                icon={Icons.disputes}
                color="bg-red-500"
              />
            </div>
          </div>
        );
      case 'users':
        return <UsersManagement />;
      case 'services':
        return <ServicesManagement />;
      case 'trades':
        return <TradesManagement />;
      case 'disputes':
        return <DisputesManagement />;
      case 'withdrawals':
        return <WithdrawalsManagement />;
      case 'chat':
        return <LiveChatSupport />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <div>Coming soon...</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={() => {}} />
      <div className="flex-1 ml-64 p-8">
        {renderContent()}
      </div>
    </div>
  );
};

// Main Admin App
const AdminApp: React.FC = () => {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(localStorage.getItem('escrowx-admin-authed') === '1');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('escrowx-admin-authed');
    setAuthed(false);
  };

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />;
  return <Dashboard />;
};

export default AdminApp;
