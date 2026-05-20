import React, { useEffect, useMemo, useState } from 'react';
import { useUsers } from './UserContext';
import { useTrades } from './AppContext';
import { Currency, EscrowStatus, Trade } from './types';
import { StatusBadge, CryptoIcon, Avatar } from './components';
import { API_ENDPOINTS } from './config/api';

// Professional Icons
const Icons = {
    dashboard: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" /></svg>,
    users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>,
    trades: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    services: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
    disputes: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>,
    payouts: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>,
    logout: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    filter: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>,
    refresh: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
};

const ADMIN_EMAIL = 'admin@escrowx.com';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'Admin2025@2026.Alol.Tekkie256';

const SectionCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg ${className}`}>
        <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            {title}
        </h2>
        {children}
    </div>
);

const AdminLogin: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        // Simulate loading for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPassword = password.trim();
        const configuredPassword = String(ADMIN_PASSWORD).trim();
        if (normalizedEmail === ADMIN_EMAIL && normalizedPassword === configuredPassword) {
            localStorage.setItem('escrowx-admin-authed', '1');
            onSuccess();
        } else {
            setError('Invalid credentials. Please check your email and password.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <Icons.dashboard />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">SafeEscrowX</h1>
                    <p className="text-white/70">Admin Dashboard</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Email Address</label>
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
                        <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
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
                        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Signing In...
                </div>
                        ) : (
                            'Sign In to Dashboard'
                        )}
                    </button>
            </form>
                
                <div className="mt-6 text-center">
                    <p className="text-white/50 text-sm">
                        Secure access to SafeEscrowX administration panel
                    </p>
                </div>
            </div>
        </div>
    );
};

const TradesTable: React.FC = () => {
    const [trades, setTrades] = useState<any[]>([]);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<EscrowStatus | 'all'>('all');
    const [loading, setLoading] = useState(true);

    // Fetch trades from backend
    useEffect(() => {
        const fetchTrades = async () => {
            try {
                const resp = await fetch(API_ENDPOINTS.trades);
                const json = await resp.json();
                const tradesData = Array.isArray(json.trades) ? json.trades : [];
                
                // Fetch user data for each trade
                const tradesWithUsers = await Promise.all(
                    tradesData.map(async (trade: any) => {
                        try {
                            const [buyerResp, sellerResp] = await Promise.all([
                                fetch(API_ENDPOINTS.users),
                                fetch(API_ENDPOINTS.users)
                            ]);
                            const [buyerJson, sellerJson] = await Promise.all([
                                buyerResp.json(),
                                sellerResp.json()
                            ]);
                            
                            const buyers = Array.isArray(buyerJson.users) ? buyerJson.users : [];
                            const sellers = Array.isArray(sellerJson.users) ? sellerJson.users : [];
                            
                            const buyer = buyers.find((u: any) => u.id === trade.buyer_id) || { id: trade.buyer_id, username: 'Unknown Buyer' };
                            const seller = sellers.find((u: any) => u.id === trade.seller_id) || { id: trade.seller_id, username: 'Unknown Seller' };
                            
                            return {
                                ...trade,
                                buyer: { id: buyer.id, username: buyer.username || 'Unknown Buyer' },
                                seller: { id: seller.id, username: seller.username || 'Unknown Seller' },
                                amount: Number(trade.amount),
                                createdAt: new Date(trade.created_at)
                            };
                        } catch (error) {
                            console.error('Error fetching user data for trade:', error);
                            return {
                                ...trade,
                                buyer: { id: trade.buyer_id, username: 'Unknown Buyer' },
                                seller: { id: trade.seller_id, username: 'Unknown Seller' },
                                amount: Number(trade.amount),
                                createdAt: new Date(trade.created_at)
                            };
                        }
                    })
                );
                
                setTrades(tradesWithUsers);
            } catch (error) {
                console.error('Error fetching trades:', error);
                setTrades([]);
            } finally {
                setLoading(false);
            }
        };
        
        fetchTrades();
    }, []);

    const filtered = useMemo(() => {
        let result = trades;
        
        if (query.trim()) {
        const q = query.toLowerCase();
            result = result.filter(t =>
            t.description.toLowerCase().includes(q) ||
            t.buyer.username.toLowerCase().includes(q) ||
            t.seller.username.toLowerCase().includes(q)
        );
        }
        
        if (statusFilter !== 'all') {
            result = result.filter(t => t.status === statusFilter);
        }
        
        return result;
    }, [trades, query, statusFilter]);

    const setStatus = async (t: any, s: EscrowStatus) => {
        try {
            await fetch(API_ENDPOINTS.tradeStatus(t.id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: s })
            });
            
            // Update local state
            setTrades(prev => prev.map(trade => 
                trade.id === t.id ? { ...trade, status: s } : trade
            ));
        } catch (error) {
            console.error('Error updating trade status:', error);
        }
    };

    const approveDeposit = async (tradeId: string) => {
        try {
            await fetch(API_ENDPOINTS.tradeDeposit(tradeId), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deposit_status: 'APPROVED' })
            });
            
            // Update local state
            setTrades(prev => prev.map(trade => 
                trade.id === tradeId ? { ...trade, deposit_status: 'APPROVED', status: 'HELD' } : trade
            ));
        } catch (error) {
            console.error('Error approving deposit:', error);
        }
    };

    const rejectDeposit = async (tradeId: string) => {
        try {
            await fetch(API_ENDPOINTS.tradeDeposit(tradeId), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deposit_status: 'REJECTED' })
            });
            
            // Update local state
            setTrades(prev => prev.map(trade => 
                trade.id === tradeId ? { ...trade, deposit_status: 'REJECTED' } : trade
            ));
        } catch (error) {
            console.error('Error rejecting deposit:', error);
        }
    };

    const approveDelivery = async (tradeId: string) => {
        try {
            await fetch(API_ENDPOINTS.tradeApproveDelivery(tradeId), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });
            
            // Update local state
            setTrades(prev => prev.map(trade => 
                trade.id === tradeId ? { ...trade, status: 'COMPLETED', delivery_status: 'APPROVED' } : trade
            ));
        } catch (error) {
            console.error('Error approving delivery:', error);
        }
    };

    const requestRevision = async (tradeId: string, revisionMessage: string) => {
        try {
            await fetch(API_ENDPOINTS.tradeRequestRevision(tradeId), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ revision_message: revisionMessage })
            });
            
            // Update local state
            setTrades(prev => prev.map(trade => 
                trade.id === tradeId ? { ...trade, delivery_status: 'REVISION_REQUESTED' } : trade
            ));
        } catch (error) {
            console.error('Error requesting revision:', error);
        }
    };

    const cancelTrade = async (tradeId: string, cancelledBy: string, reason: string) => {
        try {
            await fetch(API_ENDPOINTS.tradeCancel(tradeId), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cancelled_by: cancelledBy, cancellation_reason: reason })
            });
            
            // Update local state
            setTrades(prev => prev.map(trade => 
                trade.id === tradeId ? { ...trade, status: 'CANCELLED' } : trade
            ));
        } catch (error) {
            console.error('Error cancelling trade:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Icons.search />
                    <input 
                        value={query} 
                        onChange={e => setQuery(e.target.value)} 
                        placeholder="Search trades by description, buyer, or seller..." 
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pl-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Icons.filter />
                    <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value as EscrowStatus | 'all')}
                        className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                        <option value="all" className="bg-slate-800">All Status</option>
                        {Object.values(EscrowStatus).map(status => (
                            <option key={status} value={status} className="bg-slate-800">
                                {status.replace('_', ' ')}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-2xl font-bold text-white">{trades.length}</div>
                    <div className="text-white/60 text-sm">Total Trades</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-2xl font-bold text-blue-400">{trades.filter(t => t.status === EscrowStatus.IN_PROGRESS).length}</div>
                    <div className="text-white/60 text-sm">In Progress</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-2xl font-bold text-yellow-400">{trades.filter(t => t.status === EscrowStatus.DISPUTE).length}</div>
                    <div className="text-white/60 text-sm">Disputes</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-2xl font-bold text-green-400">{trades.filter(t => t.status === EscrowStatus.COMPLETED).length}</div>
                    <div className="text-white/60 text-sm">Completed</div>
                </div>
            </div>

            {/* Trades List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-8">
                        <div className="text-white/70">Loading trades...</div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-white/70">No trades found</div>
                    </div>
                ) : (
                    filtered.map(t => (
                    <div key={t.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-200">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-4">
                                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
                                    <CryptoIcon currency={t.currency as Currency} className="w-6 h-6 text-white"/>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white text-lg">{t.description}</h3>
                                    <p className="text-white/70 text-sm">{t.amount} {t.currency}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-white/60">
                                        <span>Buyer: <span className="text-white">{t.buyer.username}</span></span>
                                        <span>Seller: <span className="text-white">{t.seller.username}</span></span>
                                        <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                            <span>Deposit: <span className={`${t.deposit_status === 'APPROVED' ? 'text-green-400' : t.deposit_status === 'REJECTED' ? 'text-red-400' : 'text-yellow-400'}`}>{t.deposit_status || 'PENDING'}</span></span>
                                    </div>
                                </div>
                            </div>
                            <StatusBadge status={t.status} />
                        </div>
                        
                        <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            {[EscrowStatus.HELD, EscrowStatus.IN_PROGRESS, EscrowStatus.DELIVERED, EscrowStatus.DISPUTE, EscrowStatus.COMPLETED, EscrowStatus.CANCELLED].map(s => (
                                <button 
                                    key={s} 
                                    onClick={() => setStatus(t, s)} 
                                    className={`px-4 py-2 text-sm rounded-lg border transition-all duration-200 ${
                                        t.status === s 
                                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' 
                                            : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {s.replace('_',' ')}
                                </button>
                            ))}
                        </div>
                            
                            {/* Deposit Approval Controls */}
                            {(t.deposit_status === 'PENDING' || !t.deposit_status) && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => approveDeposit(t.id)}
                                        className="px-4 py-2 text-sm rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 hover:bg-green-500/30 transition-all duration-200"
                                    >
                                        Approve Deposit
                                    </button>
                                    <button
                                        onClick={() => rejectDeposit(t.id)}
                                        className="px-4 py-2 text-sm rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30 transition-all duration-200"
                                    >
                                        Reject Deposit
                                    </button>
                    </div>
                            )}
                            
                            {/* Delivery Management Controls */}
                            {t.status === 'HELD' && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => cancelTrade(t.id, 'admin', 'Cancelled by admin')}
                                        className="px-4 py-2 text-sm rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30 transition-all duration-200"
                                    >
                                        Cancel Trade
                                    </button>
                        </div>
                            )}
                            
                            {t.status === 'DELIVERED' && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => approveDelivery(t.id)}
                                        className="px-4 py-2 text-sm rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 hover:bg-green-500/30 transition-all duration-200"
                                    >
                                        Force Approve
                                    </button>
                                    <button
                                        onClick={() => requestRevision(t.id, 'Admin requested revision')}
                                        className="px-4 py-2 text-sm rounded-lg bg-orange-500/20 border border-orange-500/50 text-orange-300 hover:bg-orange-500/30 transition-all duration-200"
                                    >
                                        Request Revision
                                    </button>
                    </div>
                            )}
                        </div>
                    </div>
                ))
                )}
            </div>
        </div>
    );
};

const UsersTable: React.FC = () => {
    const { allUsers, refreshUsers, updateUserModeration } = useUsers();
    const [query, setQuery] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const filtered = useMemo(() => {
        const q = query.toLowerCase();
        return allUsers.filter(u => u.username.toLowerCase().includes(q));
    }, [allUsers, query]);
    const moderate = async (userId: string, updates: { banned?: boolean; verified?: boolean }) => {
        setBusy(userId);
        console.log('🔄 Starting moderation for user:', userId, 'with updates:', updates);
        
        try {
            const requestBody = { userId, banned: updates.banned, verified: updates.verified };
            console.log('📤 Sending request to backend:', requestBody);
            
            const response = await fetch(API_ENDPOINTS.moderateUser, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            console.log('📥 Response status:', response.status, response.statusText);
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ User moderation successful:', result);
                alert(`User ${updates.verified ? 'verified' : updates.banned ? 'banned' : 'updated'} successfully!`);
                // Optimistically update and then refresh from backend for consistency
                updateUserModeration(userId, updates);
                await refreshUsers();
                console.log('✅ User moderation completed and users refreshed');
            } else {
                const errorText = await response.text();
                console.error('❌ User moderation failed - Status:', response.status);
                console.error('❌ Error response:', errorText);
                
                let errorMessage = 'Unknown error';
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorJson.message || errorText;
                } catch (e) {
                    errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
                }
                
                alert(`Failed to moderate user: ${errorMessage}`);
            }
        } catch (error) {
            console.error('❌ User moderation network error:', error);
            alert(`Network error: ${error.message || 'Please check your connection and try again.'}`);
        } finally {
            setBusy(null);
        }
    };
    return (
        <div>
            <div className="mb-3">
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search users..." className="w-full bg-background p-3 rounded-2xl border border-border-color" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered.map(u => (
                    <div key={u.id} className="bg-surface p-4 rounded-2xl border border-border-color">
                        <div className="flex items-center space-x-3">
                        <Avatar src={u.avatarUrl} name={u.username} className="w-10 h-10" />
                            <div>
                                <p className="font-semibold">{u.username}</p>
                                <p className="text-xs text-text-body">Rating: {(Number(u.rating) || 0).toFixed(1)}</p>
                                <div className="flex gap-1 mt-1">
                                    {u.isVerified && <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-500/40">Verified</span>}
                                    {u.isBanned && <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-300 border border-red-500/40">Banned</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <button disabled={busy===u.id} onClick={() => moderate(u.id, { verified: !u.isVerified })} className="px-3 py-1 text-xs rounded-full bg-success/20 text-success border border-success/40">{u.isVerified ? 'Unverify' : 'Verify'}</button>
                            <button disabled={busy===u.id} onClick={() => moderate(u.id, { banned: !u.isBanned })} className="px-3 py-1 text-xs rounded-full bg-danger/20 text-danger border border-danger/40">{u.isBanned ? 'Unban' : 'Ban'}</button>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && <div className="text-text-body">No users found.</div>}
            </div>
        </div>
    );
};

const DisputesView: React.FC = () => {
    const { trades } = useTrades();
    const disputes = trades.filter(t => t.status === EscrowStatus.DISPUTE);
    return (
        <div className="space-y-3">
            {disputes.map(t => (
                <div key={t.id} className="bg-surface p-4 rounded-2xl border border-border-color">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold">{t.description}</p>
                            <p className="text-xs text-text-body">Buyer: {t.buyer.username} • Seller: {t.seller.username}</p>
                        </div>
                        <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-2 text-sm text-text-body">
                        {(t.disputeMessages || []).length} dispute messages
                    </div>
                </div>
            ))}
            {disputes.length === 0 && <div className="text-text-body">No open disputes.</div>}
        </div>
    );
};

const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [tab, setTab] = useState<'trades' | 'users' | 'disputes' | 'services' | 'payouts'>('trades');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        return window.innerWidth >= 1024;
    });
    const [services, setServices] = useState<any[]>([]);
    const [trades, setTrades] = useState<any[]>([]);
    const [marketRates, setMarketRates] = useState<Record<Currency, number>>({
        [Currency.USDT]: 1,
        [Currency.BTC]: 0,
        [Currency.LTC]: 0
    });
    
    // Fetch services for pending count
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

    useEffect(() => {
        let mounted = true;
        const fetchRates = async () => {
            try {
                const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin,tether&vs_currencies=usd');
                const json = await resp.json();
                if (!mounted) return;
                setMarketRates({
                    [Currency.USDT]: Number(json?.tether?.usd) || 1,
                    [Currency.BTC]: Number(json?.bitcoin?.usd) || 0,
                    [Currency.LTC]: Number(json?.litecoin?.usd) || 0
                });
            } catch {}
        };
        fetchRates();
        const timer = setInterval(fetchRates, 60000);
        return () => {
            mounted = false;
            clearInterval(timer);
        };
    }, []);

    const formatRate = (value: number) => {
        if (!value) return '--';
        if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
        if (value >= 1) return value.toFixed(2);
        return value.toFixed(4);
    };

    useEffect(() => {
        const handleResize = () => {
            const desktop = window.innerWidth >= 1024;
            setIsDesktop(desktop);
            if (desktop) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    const pendingServicesCount = services.filter(s => !s.approved && !s.rejected).length;
    const pendingTradesCount = trades.filter(t => t.status === 'DISPUTE').length;
    
    const menuItems = [
        { id: 'trades', label: 'Trades', icon: Icons.trades, count: pendingTradesCount },
        { id: 'users', label: 'Users', icon: Icons.users, count: 0 },
        { id: 'services', label: 'Services', icon: Icons.services, count: pendingServicesCount },
        { id: 'disputes', label: 'Disputes', icon: Icons.disputes, count: pendingTradesCount },
        { id: 'payouts', label: 'Payouts', icon: Icons.payouts, count: 0 },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex relative">
            {!isDesktop && sidebarOpen && (
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-black/50 z-30"
                    aria-label="Close sidebar"
                />
            )}
            {/* Sidebar */}
            <div
                className={`${
                    isDesktop
                        ? sidebarOpen ? 'w-64' : 'w-16'
                        : sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } ${
                    isDesktop ? 'relative' : 'fixed'
                } top-0 left-0 h-full z-40 bg-white/10 backdrop-blur-lg border-r border-white/10 transition-all duration-300 ${
                    isDesktop ? '' : 'w-64'
                }`}
            >
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Icons.dashboard />
                        </div>
                        {sidebarOpen && (
                            <div>
                                <h1 className="text-xl font-bold text-white">SafeEscrowX</h1>
                                <p className="text-white/60 text-sm">Admin Panel</p>
                            </div>
                        )}
                    </div>
                    
                    <nav className="space-y-2">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setTab(item.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                    tab === item.id
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <item.icon />
                                {sidebarOpen && (
                                    <>
                                        <span className="font-medium">{item.label}</span>
                                        {item.count > 0 && (
                                            <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                                {item.count}
                                            </span>
                                        )}
                                    </>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>
                
                <div className="absolute bottom-6 left-6 right-6">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/20 rounded-xl transition-all duration-200"
                    >
                        <Icons.logout />
                        {sidebarOpen && <span className="font-medium">Logout</span>}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col w-full">
                {/* Header */}
                <header className="bg-white/5 backdrop-blur-sm border-b border-white/10 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white capitalize">
                                {tab === 'trades' ? 'Trade Management' : 
                                 tab === 'users' ? 'User Management' : 
                                 tab === 'services' ? 'Service Management' : 
                                 tab === 'disputes' ? 'Dispute Resolution' : 
                                 'Withdrawal Management'}
                            </h2>
                            <p className="text-white/60 mt-1">
                                {tab === 'trades' ? 'Monitor and manage all escrow transactions' : 
                                 tab === 'users' ? 'Manage user accounts and verification status' : 
                                 tab === 'services' ? 'Approve and manage marketplace services' : 
                                 tab === 'disputes' ? 'Resolve trade disputes and conflicts' : 
                                 'Process withdrawal requests and payments'}
                            </p>
            </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            
                            <div className="flex items-center gap-2 text-white/60">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-sm">System Online</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 p-6 overflow-auto">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-white">Live Market Prices (USD)</h3>
                            <span className="text-xs text-white/60">1m refresh</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.values(Currency).map((c) => (
                                <div key={c} className="bg-slate-900/40 border border-white/10 rounded-lg px-3 py-2">
                                    <p className="text-xs text-white/60">{c}</p>
                                    <p className="text-sm font-semibold text-white">${formatRate(marketRates[c])}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <SectionCard title={`${tab === 'trades' ? 'All Trades' : tab === 'users' ? 'All Users' : tab==='services' ? 'All Services' : tab==='payouts' ? 'Withdrawal Requests' : 'Open Disputes'}`}>
                {tab === 'trades' && <TradesTable />}
                {tab === 'users' && <UsersTable />}
                {tab === 'services' && <ServicesTable />}
                {tab === 'disputes' && <DisputesView />}
                {tab === 'payouts' && <PayoutsTable />}
            </SectionCard>
                </main>
            </div>
        </div>
    );
};

const ServicesTable: React.FC = () => {
    const [services, setServices] = useState<any[]>([]);
    const { allUsers } = useUsers();
    const [query, setQuery] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    
    useEffect(() => {
        (async () => {
            try {
                const resp = await fetch(API_ENDPOINTS.services);
                const json = await resp.json();
                setServices(Array.isArray(json.services) ? json.services : []);
            } catch {}
        })();
    }, []);
    
    const filtered = useMemo(() => {
        let result = services;
        
        if (query.trim()) {
        const q = query.toLowerCase();
            result = result.filter((s) =>
            s.title?.toLowerCase().includes(q) ||
            s.description?.toLowerCase().includes(q) ||
            s.user?.username?.toLowerCase().includes(q)
        );
        }
        
        if (statusFilter !== 'all') {
            result = result.filter(s => {
                if (statusFilter === 'pending') return !s.approved && !s.rejected;
                if (statusFilter === 'approved') return s.approved;
                if (statusFilter === 'rejected') return s.rejected;
                return true;
            });
        }
        
        return result;
    }, [services, query, statusFilter]);
    
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
    
    const moderate = async (userId: string, serviceId: string, approved: boolean) => {
        setBusy(serviceId);
        try {
            // Resolve userId fallback via username->id map if missing
            let resolvedUserId = userId as any;
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
                const items = Array.isArray(json.services) ? json.services : [];
                const mapped = items.map((s: any) => ({
                    ...s,
                    userId: s.user_id ?? s.userId,
                    user: s.username ? { username: s.username, avatarUrl: s.photo_url } : s.user,
                    approved: Boolean(s.approved),
                    rejected: Boolean(s.rejected),
                }));
                setServices(mapped);
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
    
    const pendingCount = services.filter(s => !s.approved && !s.rejected).length;
    const approvedCount = services.filter(s => s.approved).length;
    const rejectedCount = services.filter(s => s.rejected).length;
    
    return (
        <div className="space-y-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Icons.search />
                    <input 
                        value={query} 
                        onChange={e => setQuery(e.target.value)} 
                        placeholder="Search services by title, description, or seller..." 
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pl-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Icons.filter />
                    <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                        <option value="all" className="bg-slate-800">All Services</option>
                        <option value="pending" className="bg-slate-800">Pending Review</option>
                        <option value="approved" className="bg-slate-800">Approved</option>
                        <option value="rejected" className="bg-slate-800">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-2xl font-bold text-white">{services.length}</div>
                    <div className="text-white/60 text-sm">Total Services</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
                    <div className="text-white/60 text-sm">Pending Review</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-2xl font-bold text-green-400">{approvedCount}</div>
                    <div className="text-white/60 text-sm">Approved</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-2xl font-bold text-red-400">{rejectedCount}</div>
                    <div className="text-white/60 text-sm">Rejected</div>
                </div>
            </div>

            {/* Services List */}
            <div className="space-y-4">
                {filtered.map(s => (
                    <div key={`${s.userId}-${s.id}`} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-200">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-white text-lg">{s.title}</h3>
                                    <span className={`px-3 py-1 text-xs rounded-full border ${
                                        s.approved 
                                            ? 'bg-green-500/20 text-green-300 border-green-500/40' 
                                            : s.rejected 
                                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                            : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                                    }`}>
                                        {s.approved ? 'Approved' : s.rejected ? 'Rejected' : 'Pending Review'}
                                    </span>
                            </div>
                                <p className="text-white/70 text-sm mb-3">{s.description}</p>
                                <div className="flex items-center gap-4 text-xs text-white/60">
                                    <span>Seller: <span className="text-white">{s.user?.username}</span></span>
                                    <span>Price: <span className="text-white">{s.price} {s.currency}</span></span>
                                    <span>Created: {new Date(s.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                        </div>
                        </div>
                        
                        {!s.approved && !s.rejected && (
                            <div className="flex gap-3">
                                <button 
                                    disabled={busy === s.id} 
                                    onClick={() => moderate(s.userId, s.id, true)} 
                                    className="px-6 py-2 text-sm rounded-lg bg-green-500/20 text-green-300 border border-green-500/40 hover:bg-green-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {busy === s.id ? 'Processing...' : 'Approve Service'}
                                </button>
                                <button 
                                    disabled={busy === s.id} 
                                    onClick={() => moderate(s.userId, s.id, false)} 
                                    className="px-6 py-2 text-sm rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {busy === s.id ? 'Processing...' : 'Reject Service'}
                                </button>
                            </div>
                        )}
                        
                        {(s.approved || s.rejected) && (
                            <div className="text-sm text-white/60">
                                {s.approved ? '✅ This service is now visible to all buyers' : '❌ This service has been rejected and is not visible to buyers'}
                            </div>
                        )}
                    </div>
                ))}
                
                {filtered.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-white/40 text-lg mb-2">No services found</div>
                        <div className="text-white/60 text-sm">
                            {query || statusFilter !== 'all' ? 'Try adjusting your search or filter criteria' : 'No services have been submitted yet'}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

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
    return <AdminDashboard onLogout={handleLogout} />;
};

export default AdminApp;

const PayoutsTable: React.FC = () => {
    const [items, setItems] = useState<any[]>([]);
    const [busy, setBusy] = useState<string | null>(null);
    useEffect(() => {
        (async () => {
            try {
                const resp = await fetch(API_ENDPOINTS.withdrawals);
                const json = await resp.json();
                setItems(Array.isArray(json.withdrawals) ? json.withdrawals : []);
            } catch {}
        })();
    }, []);
    const act = async (id: string, type: 'approve' | 'reject') => {
        setBusy(id);
        try {
            const url = type === 'approve' ? API_ENDPOINTS.withdrawalApprove : API_ENDPOINTS.withdrawalReject;
            const payload: Record<string, string> = { id };
            if (type === 'approve') {
                const txId = window.prompt('Optional: transaction hash');
                const transferProofUrl = window.prompt('Optional: transfer proof screenshot URL');
                if (txId) payload.txId = txId;
                if (transferProofUrl) payload.transferProofUrl = transferProofUrl;
            } else {
                const reason = window.prompt('Optional rejection reason');
                if (reason) payload.reason = reason;
            }
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                throw new Error(json.error || 'Failed to process withdrawal');
            }
            setItems(prev => prev.map(w => (w.id === id ? { ...w, ...(json.withdrawal || {}) } : w)));
        } finally {
            setBusy(null);
        }
    };
    return (
        <div className="space-y-3">
            {items.map(w => (
                <div key={w.id} className="bg-surface p-4 rounded-2xl border border-border-color">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold">
                                {w.amount} {w.currency} ({w.network || '-'}) → {w.address}
                            </p>
                            <p className="text-xs text-text-body">
                                User: {w.userId || w.user_id} • {new Date(w.createdAt || w.created_at || Date.now()).toLocaleString()}
                            </p>
                            <p className="text-xs text-text-body">
                                Fee: ${Number(w.fee || 1).toFixed(2)} • Net: {Number(w.amountAfterFee ?? w.amount).toFixed(4)} {w.currency}
                            </p>
                            {w.transferProofUrl && (
                                <a className="text-xs text-primary hover:underline" href={w.transferProofUrl} target="_blank" rel="noreferrer">
                                    View transfer proof
                                </a>
                            )}
                        </div>
                        <span className={`px-3 py-1 text-xs rounded-full border ${w.status==='APPROVED' ? 'bg-success/20 text-success border-success/40' : w.status==='REJECTED' ? 'bg-danger/20 text-danger border-danger/40' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500'}`}>{w.status}</span>
                    </div>
                    {w.status==='PENDING' && (
                        <div className="flex gap-2 mt-3">
                            <button disabled={busy===w.id} onClick={() => act(w.id, 'approve')} className="px-3 py-1 text-xs rounded-full bg-success/20 text-success border border-success/40">Approve</button>
                            <button disabled={busy===w.id} onClick={() => act(w.id, 'reject')} className="px-3 py-1 text-xs rounded-full bg-danger/20 text-danger border border-danger/40">Reject</button>
                        </div>
                    )}
                </div>
            ))}
            {items.length === 0 && <div className="text-text-body">No withdrawal requests.</div>}
        </div>
    );
};


