import React, { useState, useEffect, useMemo, useRef } from 'react';
import { adminUser } from './data';
import { Currency, EscrowStatus, Message, MessageType, Trade, User, Review, Service } from './types';
import { ICONS, APP_NAME, APP_TAGLINE } from './constants';
import { StatusBadge, CryptoIcon, CountdownTimer, Modal, Header, Avatar } from './components';
import { useTrades, useNotifications } from './AppContext';
import { useUsers } from './UserContext';
import { useMode } from './ModeContext';
import { API_ENDPOINTS } from './config/api';

// Fix for Telegram WebApp types not being available on window object.
declare global {
  interface Window {
    Telegram: any;
  }
}

const tg = window.Telegram?.WebApp;
const MIN_DEPOSIT_USD = 1;
const MIN_WITHDRAWAL_USD = 5;
const WITHDRAWAL_FEE_USD = 1;
const MAX_TRADE_USD = 2500;
const NETWORK_WARNING = 'Wrong network selection may result in permanent loss of funds. Please make sure before proceeding.';

const getDepositFee = (amount: number): number => {
    if (amount <= 0) return 0;
    return amount < 100 ? 1 : amount * 0.01;
};

const NETWORKS_BY_CURRENCY: Record<Currency, string[]> = {
    [Currency.USDT]: ['TRC20', 'ERC20', 'BEP20'],
    [Currency.BTC]: ['BTC'],
    [Currency.LTC]: ['LTC']
};

const timeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) {
        return `${Math.floor(interval)} years ago`;
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return `${Math.floor(interval)} months ago`;
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return `${Math.floor(interval)} days ago`;
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return `${Math.floor(interval)} hours ago`;
    }
    interval = seconds / 60;
    if (interval > 1) {
        return `${Math.floor(interval)} minutes ago`;
    }
    return `${Math.floor(seconds)} seconds ago`;
};

const highlightText = (text: string, highlight: string): React.ReactNode => {
    if (!highlight.trim()) {
        return text;
    }
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
        {parts.map((part, i) =>
            part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-yellow-400 text-black px-0.5 rounded-sm">
                {part}
            </mark>
            ) : (
            part
            )
        )}
        </>
    );
};

const getSellerTierLabel = (rating: number): string => {
    if (rating >= 4.8) return 'Top Rated Seller';
    if (rating >= 4.5) return 'Level 2 Seller';
    if (rating >= 4.0) return 'Level 1 Seller';
    return 'New Seller';
};


interface ScreenProps {
  setCurrentView: (view: any, tradeId?: string | null, userId?: string | null) => void;
  setSelectedTradeId: (id: string | null) => void;
  setSelectedUserId: (id: string | null) => void;
  setCreatingNew: (creating: boolean) => void;
  selectedTradeId?: string | null;
  selectedUserId?: string | null;
  showToast: (message: string) => void;
  currentUser: User;
  handleStartTradeFromService?: (service: Service, userId: string) => void;
  prefillTrade?: {description: string, amount: string, currency: Currency} | null;
}

const StarDisplay: React.FC<{ rating: number, className?: string }> = ({ rating, className = '' }) => {
    const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
    
    return (
        <div className={`flex items-center space-x-1 text-yellow-400 ${className}`}>
            <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={star <= Math.round(safeRating) ? 'text-yellow-400' : 'text-gray-600'}>★</span>
                ))}
            </div>
            <span className="text-[11px] text-text-body">({safeRating.toFixed(1)})</span>
        </div>
    );
};

// Buyer Profile Component
const BuyerProfile: React.FC<{
    currentUser: User;
    buyingTrades: Trade[];
    completedBuyingTrades: Trade[];
    givenReviews: { review: Review; trade: Trade }[];
    balances: Record<Currency, number>;
    onWithdraw: () => void;
}> = ({ currentUser, buyingTrades, completedBuyingTrades, givenReviews, balances, onWithdraw }) => {
    return (
        <div className="space-y-8">
            {/* Buyer Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-6 rounded-2xl border border-blue-500/30 text-center">
                    <div className="text-3xl font-bold text-blue-300">{buyingTrades.length}</div>
                    <div className="text-blue-200 text-sm">Total Orders</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 p-6 rounded-2xl border border-green-500/30 text-center">
                    <div className="text-3xl font-bold text-green-300">{completedBuyingTrades.length}</div>
                    <div className="text-green-200 text-sm">Completed</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-6 rounded-2xl border border-purple-500/30 text-center">
                    <div className="text-3xl font-bold text-purple-300">{givenReviews.length}</div>
                    <div className="text-purple-200 text-sm">Reviews Given</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 p-6 rounded-2xl border border-yellow-500/30 text-center">
                    <div className="text-3xl font-bold text-yellow-300">{(Number(currentUser.rating) || 0).toFixed(1)}</div>
                    <div className="text-yellow-200 text-sm">Buyer Rating</div>
                </div>
            </div>

            {/* Recent Orders */}
            <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <ICONS.shopping className="w-6 h-6 text-blue-400" />
                    Recent Orders
                </h2>
                <div className="space-y-3">
                    {buyingTrades.slice(0, 5).map(trade => (
                        <div key={trade.id} className="bg-surface p-4 rounded-2xl border border-border-color hover:border-blue-500/50 transition-all">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white">{trade.description}</h3>
                                    <p className="text-sm text-text-body mt-1">From: {trade.seller.username}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                            trade.status === EscrowStatus.COMPLETED ? 'bg-green-500/20 text-green-300' :
                                            trade.status === EscrowStatus.DISPUTE ? 'bg-red-500/20 text-red-300' :
                                            'bg-yellow-500/20 text-yellow-300'
                                        }`}>
                                            {trade.status}
                                        </span>
                                        <span className="text-sm text-text-body">{timeAgo(trade.createdAt)}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-primary">${trade.amount.toFixed(2)} • {trade.currency}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {buyingTrades.length === 0 && (
                        <div className="text-center py-8 bg-surface rounded-2xl">
                            <ICONS.shopping className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                            <p className="text-text-body">No orders yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Reviews Given */}
            <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <ICONS.star className="w-6 h-6 text-yellow-400" />
                    Reviews Given
                </h2>
                <div className="space-y-3">
                    {givenReviews.slice(0, 3).map(({ review, trade }) => (
                        <div key={`${review.timestamp.getTime()}-${trade.id}`} className="bg-surface p-4 rounded-2xl border border-border-color">
                            <div className="flex items-start gap-3">
                                <Avatar src={trade.seller.avatarUrl} name={trade.seller.username} className="w-10 h-10" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold">{trade.seller.username}</span>
                                        <StarDisplay rating={review.rating} className="text-sm" />
                                    </div>
                                    <p className="text-sm text-text-body">{review.comment}</p>
                                    <p className="text-xs text-text-body mt-1">{timeAgo(review.timestamp)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {givenReviews.length === 0 && (
                        <div className="text-center py-8 bg-surface rounded-2xl">
                            <ICONS.star className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                            <p className="text-text-body">No reviews given yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Wallet */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ICONS.wallet className="w-6 h-6 text-green-400" />
                        Wallet
                    </h2>
                    <button onClick={onWithdraw} className="bg-primary/20 text-primary font-bold py-2 px-4 rounded-lg text-sm border border-primary/50 hover:bg-primary/30">
                        Withdraw
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(balances).map(([currency, balance]) => (
                        <div key={currency} className="bg-surface p-4 rounded-2xl border border-border-color">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                        <span className="text-primary font-bold">{currency.charAt(0)}</span>
                                    </div>
                                    <span className="font-semibold">{currency}</span>
                                </div>
                                <span className="font-bold text-lg">{balance.toFixed(8)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Seller Profile Component
const SellerProfile: React.FC<{
    currentUser: User;
    sellingTrades: Trade[];
    completedSellingTrades: Trade[];
    receivedReviews: { review: Review; trade: Trade }[];
    onAddService: () => void;
    onEditService: (service: Service) => void;
    onDeleteService: (serviceId: string) => void;
    balances: Record<Currency, number>;
    onWithdraw: () => void;
}> = ({ currentUser, sellingTrades, completedSellingTrades, receivedReviews, onAddService, onEditService, onDeleteService, balances, onWithdraw }) => {
    return (
        <div className="space-y-8">
            {/* Seller Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 p-6 rounded-2xl border border-green-500/30 text-center">
                    <div className="text-3xl font-bold text-green-300">{sellingTrades.length}</div>
                    <div className="text-green-200 text-sm">Total Sales</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-6 rounded-2xl border border-blue-500/30 text-center">
                    <div className="text-3xl font-bold text-blue-300">{completedSellingTrades.length}</div>
                    <div className="text-blue-200 text-sm">Completed</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-6 rounded-2xl border border-purple-500/30 text-center">
                    <div className="text-3xl font-bold text-purple-300">{currentUser.services?.length || 0}</div>
                    <div className="text-purple-200 text-sm">Services</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 p-6 rounded-2xl border border-yellow-500/30 text-center">
                    <div className="text-3xl font-bold text-yellow-300">{(Number(currentUser.rating) || 0).toFixed(1)}</div>
                    <div className="text-yellow-200 text-sm">Seller Rating</div>
                </div>
            </div>

            {/* My Services */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ICONS.briefcase className="w-6 h-6 text-green-400" />
                        My Services
                    </h2>
                    <button onClick={onAddService} className="bg-primary/20 text-primary font-bold py-2 px-4 rounded-lg text-sm border border-primary/50 hover:bg-primary/30 flex items-center space-x-2">
                        <ICONS.add className="w-4 h-4" />
                        <span>Add Service</span>
                    </button>
                </div>
                <div className="space-y-3">
                    {(currentUser.services && currentUser.services.length > 0) ? (
                        currentUser.services.map(service => (
                            <div key={service.id} className="bg-surface p-4 rounded-2xl border border-border-color hover:border-green-500/50 transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-white">{service.title}</h3>
                                            {service.approved === true && (
                                                <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-500/40">
                                                    Approved
                                                </span>
                                            )}
                                            {service.approved === false && service.rejected === false && (
                                                <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                                                    Pending Review
                                                </span>
                                            )}
                                            {service.rejected === true && (
                                                <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                                                    Rejected
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-text-body mt-1">{service.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-primary text-lg">{service.price} {service.currency}</div>
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => onEditService(service)} className="px-3 py-1 text-xs rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30">
                                                Edit
                                            </button>
                                            <button onClick={() => onDeleteService(service.id)} className="px-3 py-1 text-xs rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30">
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 bg-surface rounded-2xl">
                            <ICONS.briefcase className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                            <p className="text-text-body">No services added yet</p>
                            <button onClick={onAddService} className="mt-4 bg-primary/20 text-primary font-bold py-2 px-4 rounded-lg text-sm border border-primary/50 hover:bg-primary/30">
                                Add Your First Service
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Sales */}
            <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <ICONS.trendingUp className="w-6 h-6 text-green-400" />
                    Recent Sales
                </h2>
                <div className="space-y-3">
                    {sellingTrades.slice(0, 5).map(trade => (
                        <div key={trade.id} className="bg-surface p-4 rounded-2xl border border-border-color hover:border-green-500/50 transition-all">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white">{trade.description}</h3>
                                    <p className="text-sm text-text-body mt-1">To: {trade.buyer.username}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                            trade.status === EscrowStatus.COMPLETED ? 'bg-green-500/20 text-green-300' :
                                            trade.status === EscrowStatus.DISPUTE ? 'bg-red-500/20 text-red-300' :
                                            'bg-yellow-500/20 text-yellow-300'
                                        }`}>
                                            {trade.status}
                                        </span>
                                        <span className="text-sm text-text-body">{timeAgo(trade.createdAt)}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-primary">${trade.amount.toFixed(2)} • {trade.currency}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {sellingTrades.length === 0 && (
                        <div className="text-center py-8 bg-surface rounded-2xl">
                            <ICONS.trendingUp className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                            <p className="text-text-body">No sales yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Reviews Received */}
            <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <ICONS.star className="w-6 h-6 text-yellow-400" />
                    Reviews Received
                </h2>
                <div className="space-y-3">
                    {receivedReviews.slice(0, 3).map(({ review, trade }) => (
                        <div key={`${review.timestamp.getTime()}-${trade.id}`} className="bg-surface p-4 rounded-2xl border border-border-color">
                            <div className="flex items-start gap-3">
                                <Avatar src={trade.buyer.avatarUrl} name={trade.buyer.username} className="w-10 h-10" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold">{trade.buyer.username}</span>
                                        <StarDisplay rating={review.rating} className="text-sm" />
                                    </div>
                                    <p className="text-sm text-text-body">{review.comment}</p>
                                    <p className="text-xs text-text-body mt-1">{timeAgo(review.timestamp)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {receivedReviews.length === 0 && (
                        <div className="text-center py-8 bg-surface rounded-2xl">
                            <ICONS.star className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                            <p className="text-text-body">No reviews received yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Wallet */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ICONS.wallet className="w-6 h-6 text-green-400" />
                        Earnings
                    </h2>
                    <button onClick={onWithdraw} className="bg-primary/20 text-primary font-bold py-2 px-4 rounded-lg text-sm border border-primary/50 hover:bg-primary/30">
                        Withdraw
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(balances).map(([currency, balance]) => (
                        <div key={currency} className="bg-surface p-4 rounded-2xl border border-border-color">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                        <span className="text-primary font-bold">{currency.charAt(0)}</span>
                                    </div>
                                    <span className="font-semibold">{currency}</span>
                                </div>
                                <span className="font-bold text-lg">{balance.toFixed(8)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ReviewCard: React.FC<{ review: Review; reviewer: User | undefined; trade: Trade; onViewTrade: (tradeId: string) => void; }> = ({ review, reviewer, trade, onViewTrade }) => {
    if (!reviewer) return null;
    return (
        <div className="bg-surface/90 p-4 rounded-2xl border border-border-color glass-card surface-hover">
            <div className="flex items-start space-x-3">
                <Avatar src={reviewer.avatarUrl} name={reviewer.username} className="w-10 h-10" />
                <div className="flex-1">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-semibold">{reviewer.username}</p>
                                <span className="px-2 py-0.5 rounded-full text-[10px] border border-green-400/40 bg-green-500/10 text-green-300">
                                    Verified Purchase
                                </span>
                            </div>
                            <StarDisplay rating={review.rating} className="text-sm" />
                        </div>
                        <p className="text-xs text-text-body">{timeAgo(review.timestamp)}</p>
                    </div>
                    <p className="text-text-body mt-2 text-sm">{review.comment}</p>
                    {trade && <button onClick={() => onViewTrade(trade.id)} className="mt-3 pt-3 border-t border-border-color/50 text-xs text-text-body w-full text-left hover:text-white transition-colors">
                       For: <span className="font-medium text-white/80 underline decoration-dotted">{trade.description}</span>
                    </button>}
                </div>
            </div>
        </div>
    );
};

const StarRatingInput: React.FC<{ rating: number; setRating: (r: number) => void; }> = ({ rating, setRating }) => (
    <div className="flex justify-center space-x-2 my-4">
        {[1, 2, 3, 4, 5].map(star => (
            <button key={star} onClick={() => setRating(star)} className="text-4xl transition-transform duration-200 hover:scale-125 focus:outline-none">
                <span className={star <= rating ? 'text-yellow-400' : 'text-gray-600'}>★</span>
            </button>
        ))}
    </div>
);

const LeaveReviewForm: React.FC<{ trade: Trade; currentUser: User; onSubmit: () => void; }> = ({ trade, currentUser, onSubmit }) => {
    const { addReview } = useTrades();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const otherParty = trade.buyer.id === currentUser.id ? trade.seller : trade.buyer;

    const handleSubmit = () => {
        if (rating === 0 || !comment.trim()) {
            tg?.HapticFeedback.notificationOccurred('error');
            alert('Please provide a rating and a comment.');
            return;
        }
        addReview(trade.id, currentUser.id, rating, comment);
        tg?.HapticFeedback.notificationOccurred('success');
        onSubmit();
    };

    return (
        <div className="bg-surface-alt border border-border-color p-4 rounded-2xl my-4">
            <h3 className="font-bold text-center text-lg mb-2">Leave a Review for {otherParty.username}</h3>
            <StarRatingInput rating={rating} setRating={setRating} />
            <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full bg-background p-3 rounded-2xl focus:ring-2 focus:ring-primary focus:outline-none border border-border-color"
                rows={3}
                placeholder={`How was your experience with ${otherParty.username}?`}
            />
            <button
                onClick={handleSubmit}
                disabled={rating === 0 || !comment.trim()}
                className="w-full mt-4 bg-gradient-primary text-white font-bold py-3 rounded-2xl shadow-glow-primary disabled:bg-gray-600 disabled:shadow-none disabled:opacity-50 transition-all"
            >
                Submit Review
            </button>
        </div>
    );
};


export const WelcomeScreen: React.FC<Pick<ScreenProps, 'setCurrentView'>> = ({ setCurrentView }) => {
  const [slide, setSlide] = useState(0);
  const slides = [
    { title: "Start Escrow easily.", description: "Create a secure trade in seconds." },
    { title: "Funds are held securely.", description: "We lock the crypto until you approve." },
    { title: "Approve or Dispute anytime.", description: "You are in full control of the transaction." },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setSlide((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearTimeout(timer);
  }, [slide, slides.length]);
  
  const handleOpen = () => {
      tg?.HapticFeedback.impactOccurred('medium');
      setCurrentView('home');
  }

  return (
    <div className="min-h-screen bg-gradient-dark text-white flex flex-col justify-between items-center text-center p-8 overflow-hidden relative">
       <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full filter blur-3xl animate-float"></div>
       <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/20 rounded-full filter blur-3xl animate-float animation-delay-3000"></div>

      <div className="w-full mt-16 z-10">
        <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-blue-300 flex items-center justify-center shadow-[0_18px_40px_rgba(63,109,244,0.45)] mb-5 ring-1 ring-white/30">
            <span className="text-3xl font-black tracking-tight text-slate-950">Sx</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">{APP_NAME}</h1>
        <p className="text-text-body mt-2 max-w-xs mx-auto">{APP_TAGLINE}</p>
      </div>

      <div className="w-full z-10">
        <div className="h-28 flex items-center justify-center">
            <div className="transition-opacity duration-500 ease-in-out bg-surface/55 border border-border-color/80 backdrop-blur-sm rounded-2xl px-5 py-4 w-full max-w-sm">
                <h2 className="text-2xl font-semibold">{slides[slide].title}</h2>
                <p className="text-text-body mt-2">{slides[slide].description}</p>
            </div>
        </div>
        <div className="flex justify-center space-x-2 mt-4">
          {slides.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors duration-300 ${i === slide ? 'bg-primary' : 'bg-surface'}`}></div>
          ))}
        </div>
      </div>

      <div className="w-full mb-8 z-10">
        <button onClick={handleOpen} className="w-full bg-gradient-primary text-white font-bold py-4 rounded-2xl shadow-glow-primary hover:brightness-110 transition-all duration-300 transform hover:scale-105">
          Open Mini App
        </button>
        <button 
          onClick={() => window.open('https://t.me/SafeEscrowX', '_blank')}
          className="w-full mt-4 text-text-body font-medium py-4 rounded-2xl hover:bg-surface transition-colors"
        >
          Join Community
        </button>
      </div>
    </div>
  );
};


export const HomeScreen: React.FC<ScreenProps> = ({ setCurrentView, currentUser }) => {
    const { trades } = useTrades();
    const { mode } = useMode();
    const isBuyerMode = mode === 'buyer';
    const [showDebug, setShowDebug] = useState(false);
    const [homeRates, setHomeRates] = useState<Record<Currency, number>>({
        [Currency.USDT]: 1,
        [Currency.BTC]: 0,
        [Currency.LTC]: 0
    });

    const relevantTrades = isBuyerMode
      ? trades.filter(t => t.buyer.id === currentUser.id)
      : trades.filter(t => t.seller.id === currentUser.id);

    const activeEscrows = relevantTrades.filter(t => t.status !== EscrowStatus.COMPLETED && t.status !== EscrowStatus.CANCELLED).length;
    
    const totalValue = relevantTrades
        .filter(t => t.status === EscrowStatus.COMPLETED)
        .reduce((sum, t) => sum + t.amount, 0);

    const handleTradeClick = (tradeId: string) => {
        setCurrentView('tradeRoom', tradeId);
    };

    useEffect(() => {
        let mounted = true;
        const fetchRates = async () => {
            try {
                const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin,tether&vs_currencies=usd');
                const json = await resp.json();
                if (!mounted) return;
                setHomeRates({
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

    return (
        <div className="p-4 text-white">
            <div className="flex items-center space-x-3 mb-8">
                <Avatar src={currentUser.avatarUrl} name={currentUser.username} className="w-14 h-14 border-2 border-primary" />
                <div>
                    <h1 className="text-2xl font-bold">👋 Hi {currentUser.username}!</h1>
                    <p className="text-text-body">You are in {isBuyerMode ? 'Buyer' : 'Seller'} mode.</p>
                    <button 
                        onClick={() => setShowDebug(!showDebug)}
                        className="text-xs text-primary/60 hover:text-primary mt-1"
                    >
                        {showDebug ? 'Hide Debug' : 'Show Debug'}
                    </button>
                </div>
            </div>

            {showDebug && (
                <div className="bg-surface/50 border border-border-color rounded-lg p-3 mb-4 text-xs">
                    <h3 className="font-bold mb-2">🐛 Debug Info:</h3>
                    <div className="space-y-1 text-text-body">
                        <p><strong>User ID:</strong> {currentUser.id}</p>
                        <p><strong>Username:</strong> {currentUser.username}</p>
                        <p><strong>Avatar URL:</strong> {currentUser.avatarUrl}</p>
                        <p><strong>Verified:</strong> {currentUser.isVerified ? 'Yes' : 'No'}</p>
                        <p><strong>Rating:</strong> {currentUser.rating}</p>
                        <p><strong>Telegram WebApp:</strong> {window.Telegram?.WebApp ? 'Available' : 'Not Available'}</p>
                        <p><strong>Platform:</strong> {window.Telegram?.WebApp?.platform || 'Unknown'}</p>
                        <p><strong>Version:</strong> {window.Telegram?.WebApp?.version || 'Unknown'}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-surface border border-border-color p-4 rounded-2xl flex items-start space-x-3">
                    <div className="bg-primary/20 p-2 rounded-full"><ICONS.chat className="w-6 h-6 text-primary"/></div>
                    <div>
                        <p className="text-text-body text-sm">{isBuyerMode ? 'Active Orders' : 'Active Sales'}</p>
                        <p className="text-2xl font-bold">{activeEscrows}</p>
                    </div>
                </div>
                 <div className="bg-surface border border-border-color p-4 rounded-2xl flex items-start space-x-3">
                    <div className="bg-success/20 p-2 rounded-full"><ICONS.check className="w-6 h-6 text-success"/></div>
                    <div>
                        <p className="text-text-body text-sm">{isBuyerMode ? 'Total Spent' : 'Total Earned'}</p>
                        <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-surface border border-border-color/80 rounded-2xl p-4 mb-8">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-white">Live Prices (USD)</h2>
                    <span className="text-xs text-text-body">1m refresh</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {Object.values(Currency).map((c) => (
                        <div key={c} className="bg-background/50 border border-border-color/70 rounded-xl px-3 py-2">
                            <p className="text-xs text-text-body">{c}</p>
                            <p className="text-sm font-semibold text-white">${formatRate(homeRates[c])}</p>
                        </div>
                    ))}
                </div>
            </div>

             <div className="space-y-3">
                <h2 className="text-xl font-bold mb-3">Recent {isBuyerMode ? 'Orders' : 'Sales'}</h2>
                {relevantTrades.length > 0 ? relevantTrades.slice(0, 3).map(trade => (
                    <div key={trade.id} onClick={() => handleTradeClick(trade.id)} className="bg-surface/90 p-4 rounded-2xl flex items-center justify-between cursor-pointer border border-border-color/80 hover:border-primary/70 hover:shadow-[0_10px_24px_rgba(0,0,0,0.25)] transition-all">
                        <div className="flex items-center space-x-4">
                            <div className="bg-surface-alt p-3 rounded-full">
                                <CryptoIcon currency={trade.currency} className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold">{trade.description}</p>
                                <p className="text-sm text-text-body">${trade.amount.toFixed(2)} • {trade.currency}</p>
                            </div>
                        </div>
                        <StatusBadge status={trade.status} />
                    </div>
                )) : (
                    <div className="text-center text-text-body mt-8 p-4 bg-surface rounded-2xl">
                        <p>No recent {isBuyerMode ? 'orders' : 'sales'} found.</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export const CreateEscrowScreen: React.FC<ScreenProps> = ({ setCurrentView, setCreatingNew, selectedUserId, currentUser, prefillTrade }) => {
    const { addTrade, trades } = useTrades();
    const { getUserById } = useUsers();
    const { mode } = useMode();
    const [description, setDescription] = useState(prefillTrade?.description || '');
    const [amount, setAmount] = useState(prefillTrade?.amount || '');
    const [currency, setCurrency] = useState<Currency>(prefillTrade?.currency || Currency.USDT);
    const [deliveryTime, setDeliveryTime] = useState('');
    const [termsAgreed, setTermsAgreed] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [usdRates, setUsdRates] = useState<Record<Currency, number>>({
        [Currency.USDT]: 1,
        [Currency.BTC]: 0,
        [Currency.LTC]: 0
    });
    const [ratesLoading, setRatesLoading] = useState(true);
    const [ratesUpdatedAt, setRatesUpdatedAt] = useState<Date | null>(null);

    const handleAmountChange = (value: string) => {
        const normalized = value
            .replace(/[^\d.]/g, '')
            .replace(/(\..*)\./g, '$1');
        setAmount(normalized);
    };

    const handleDeliveryTimeChange = (value: string) => {
        const normalized = value.replace(/\D/g, '');
        setDeliveryTime(normalized);
    };

    // If seller tries to access this screen, redirect to profile
    if (mode === 'seller') {
        return (
            <div className="fixed inset-0 bg-background z-50 p-4 flex flex-col text-white items-center justify-center">
                <div className="text-center">
                    <ICONS.briefcase className="w-16 h-16 mx-auto text-primary mb-4" />
                    <h1 className="text-2xl font-bold mb-4">Seller Mode</h1>
                    <p className="text-text-body mb-6">Sellers cannot create escrows. Go to your profile to add services instead.</p>
                    <button 
                        onClick={() => {
                            setCreatingNew(false);
                            setCurrentView('profile');
                        }} 
                        className="bg-primary text-white font-bold py-3 px-6 rounded-2xl"
                    >
                        Go to Profile
                    </button>
                </div>
            </div>
        );
    }

    const seller = useMemo(() => getUserById(selectedUserId) || null, [selectedUserId, getUserById]);

    const enteredUsdAmount = useMemo(() => parseFloat(amount) || 0, [amount]);
    const usdtRate = usdRates[Currency.USDT] || 1;
    const convertedUsdtAmount = useMemo(() => enteredUsdAmount / usdtRate, [enteredUsdAmount, usdtRate]);
    const selectedRate = usdRates[currency] || 0;
    const payableInSelectedCurrency = useMemo(() => {
        if (!convertedUsdtAmount) return 0;
        if (!selectedRate) return 0;
        return convertedUsdtAmount / selectedRate;
    }, [convertedUsdtAmount, selectedRate]);
    const fee = useMemo(() => getDepositFee(convertedUsdtAmount), [convertedUsdtAmount]);
    const total = useMemo(() => convertedUsdtAmount + fee, [convertedUsdtAmount, fee]);

    useEffect(() => {
        let mounted = true;
        const fetchRates = async () => {
            try {
                const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin,tether&vs_currencies=usd');
                const json = await resp.json();
                if (!mounted) return;
                setUsdRates({
                    [Currency.USDT]: Number(json?.tether?.usd) || 1,
                    [Currency.BTC]: Number(json?.bitcoin?.usd) || 0,
                    [Currency.LTC]: Number(json?.litecoin?.usd) || 0
                });
                setRatesUpdatedAt(new Date());
            } catch (error) {
                // keep previous/initial values
            } finally {
                if (mounted) setRatesLoading(false);
            }
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

    const handleCreate = () => {
        if (!description || !amount || !deliveryTime || !termsAgreed) {
            tg?.HapticFeedback.notificationOccurred('error');
            alert("Please fill all fields and agree to the terms.");
            return;
        }
        if (currency !== Currency.USDT && !(usdRates[currency] > 0)) {
            tg?.HapticFeedback.notificationOccurred('error');
            alert(`Live ${currency} price is unavailable. Please wait and try again.`);
            return;
        }
        if (!enteredUsdAmount) {
            tg?.HapticFeedback.notificationOccurred('error');
            alert('Please enter a valid amount.');
            return;
        }
        if (!convertedUsdtAmount || convertedUsdtAmount < MIN_DEPOSIT_USD) {
            tg?.HapticFeedback.notificationOccurred('error');
            alert(`Minimum trade amount is ${MIN_DEPOSIT_USD} USDT.`);
            return;
        }
        if (convertedUsdtAmount > MAX_TRADE_USD) {
            tg?.HapticFeedback.notificationOccurred('error');
            alert(`Maximum trade amount is ${MAX_TRADE_USD} USDT.`);
            return;
        }
        // If seller is not selected, guide the user immediately
        if (!seller) {
            alert('Please choose a seller before creating an escrow.');
            setCurrentView('explore');
            return;
        }
        setIsConfirmModalOpen(true);
    };

    const confirmCreateTrade = () => {
        // Resolve seller again at confirm time in case user directory was still hydrating
        const effectiveSeller = seller || getUserById(selectedUserId) || null;
        if (!effectiveSeller) {
            tg?.HapticFeedback.notificationOccurred('error');
            alert('Please select a seller before creating an escrow.');
            return;
        }
        const newTrade = addTrade({
            buyer: currentUser,
            seller: effectiveSeller,
            description,
            amount: Number(convertedUsdtAmount.toFixed(6)),
            currency,
            deliveryTimeHours: parseInt(deliveryTime) * 24,
        });
        setIsConfirmModalOpen(false);
        tg?.HapticFeedback.notificationOccurred('success');
        // Open chat immediately; buyer can pay later from trade room.
        setCurrentView('tradeRoom', newTrade.id);
    };

    return (
    <>
        <Modal
            isOpen={isConfirmModalOpen}
            onClose={() => setIsConfirmModalOpen(false)}
            onConfirm={confirmCreateTrade}
            title="Confirm New Escrow"
            confirmText="Yes, Create Escrow"
        >
            <div className="space-y-2 text-sm">
                <p>
                    You are about to create an escrow with
                    <span className="font-bold text-white"> {seller ? seller.username : 'selected seller'}</span>.
                </p>
                <p>Amount: <span className="font-bold text-white">${enteredUsdAmount.toFixed(2)}</span> <span className="text-text-body">(≈ {convertedUsdtAmount.toFixed(2)} USDT)</span></p>
                <p>Payable in {currency}: <span className="font-bold text-white">{payableInSelectedCurrency.toFixed(8)} {currency}</span></p>
                <p>Description: <span className="font-bold text-white">{description}</span></p>
                <p className="pt-2">Please confirm the details are correct before proceeding.</p>
            </div>
        </Modal>
        <div className="fixed inset-0 bg-background z-50 p-4 flex flex-col text-white">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">New Escrow</h1>
                <button
                    onClick={() => {
                        sessionStorage.removeItem('escrowx-seller-picker');
                        setCreatingNew(false);
                    }}
                    className="text-text-body p-2 rounded-full bg-surface border border-border-color/80 hover:bg-surface-alt transition-colors"
                >
                    <ICONS.x className="w-6 h-6" />
                </button>
            </div>
            
            <div className="flex-grow space-y-5 overflow-y-auto pr-2">
                <div>
                    <label className="text-text-body mb-2 block font-medium">Seller</label>
                    {seller ? (
                        <div className="bg-surface p-3 rounded-2xl flex items-center space-x-3 border border-border-color/80 shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
                            <Avatar src={seller.avatarUrl} name={seller.username} className="w-10 h-10" />
                            <div>
                                <p className="font-semibold">{seller.username}</p>
                                <span className="text-sm text-text-body">@{seller.username}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-surface p-3 rounded-2xl border border-border-color/80 text-text-body flex items-center justify-between">
                            <span>No seller selected.</span>
                            <button
                                onClick={() => {
                                    sessionStorage.setItem('escrowx-seller-picker', '1');
                                    setCurrentView('explore');
                                }}
                                className="bg-primary/20 text-primary font-bold py-1 px-3 rounded-lg text-sm border border-primary/50 hover:bg-primary/30"
                            >
                                Choose Seller
                            </button>
                        </div>
                    )}
                </div>

                <div>
                    <label className="text-text-body mb-2 block font-medium">Item/Service Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-surface p-3 rounded-2xl focus:ring-2 focus:ring-primary focus:outline-none border border-border-color/80" rows={3} placeholder="e.g. Custom logo design package"></textarea>
                </div>

                 <div>
                    <label className="text-text-body mb-2 block font-medium">Trade Amount (USD)</label>
                    <div className="flex space-x-2">
                        <input type="text" inputMode="decimal" value={amount} onChange={e => handleAmountChange(e.target.value)} placeholder="e.g. 50.00" className="w-full bg-surface p-3 rounded-2xl focus:ring-2 focus:ring-primary focus:outline-none border border-border-color/80" />
                        <div className="bg-surface rounded-2xl p-1 flex space-x-1 border border-border-color/80">
                            {Object.values(Currency).map(c => (
                                <button key={c} onClick={() => setCurrency(c)} className={`p-2 rounded-xl transition-all ${currency === c ? 'bg-primary shadow-[0_8px_18px_rgba(63,109,244,0.45)]' : 'hover:bg-surface-alt'}`}>
                                    <CryptoIcon currency={c} className="w-6 h-6"/>
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className="text-xs text-text-body mt-2">
                        Selected {currency} price: {ratesLoading ? 'Loading...' : `$${formatRate(usdRates[currency])}`} •
                        You will pay: <span className="text-white">{payableInSelectedCurrency.toFixed(8)} {currency}</span>
                    </p>
                </div>

                <div className="bg-surface border border-border-color/80 rounded-2xl p-4 shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-white">Live Market Prices (USD)</h3>
                        <span className="text-xs text-text-body">{ratesUpdatedAt ? ratesUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.values(Currency).map((c) => (
                            <div key={c} className={`rounded-xl px-3 py-2 border ${currency === c ? 'border-primary/60 bg-primary/10' : 'border-border-color/70 bg-background/40'}`}>
                                <p className="text-xs text-text-body">{c}</p>
                                <p className="text-sm font-semibold text-white">${ratesLoading ? '...' : formatRate(usdRates[c])}</p>
                            </div>
                        ))}
                    </div>
                </div>
                 <div>
                    <label className="text-text-body mb-2 block font-medium">Delivery Time (days)</label>
                    <input type="text" inputMode="numeric" value={deliveryTime} onChange={e => handleDeliveryTimeChange(e.target.value)} placeholder="e.g. 3" className="w-full bg-surface p-3 rounded-2xl focus:ring-2 focus:ring-primary focus:outline-none border border-border-color/80" />
                </div>

                <div className="bg-surface border border-border-color/80 rounded-2xl p-4 space-y-2 shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
                    <div className="text-text-body text-sm flex justify-between">
                        <span>Fee ({(parseFloat(amount) || 0) < 100 ? '$1 under $100' : '1% above $100'})</span>
                        <span>${fee.toFixed(2)} (USDT)</span>
                    </div>
                     <div className="text-text-body text-sm flex justify-between font-bold">
                        <span>Total charge (USDT)</span>
                        <span className="text-white">{total.toFixed(2)} USDT</span>
                    </div>
                    <p className="text-xs text-text-body">
                        Buyer can choose payment currency in chat. Conversion uses live market price.
                    </p>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                    <input id="terms" type="checkbox" checked={termsAgreed} onChange={e => setTermsAgreed(e.target.checked)} className="h-5 w-5 rounded bg-surface border-gray-600 text-primary focus:ring-primary" />
                    <label htmlFor="terms" className="text-text-body text-sm">I agree to the SafeEscrowX Policy.</label>
                </div>
            </div>

            <div className="mt-auto pt-4">
                 <button onClick={handleCreate} disabled={!termsAgreed || !description || !amount || !deliveryTime} className="w-full bg-gradient-primary text-white font-bold py-4 rounded-2xl shadow-glow-primary disabled:bg-gray-600 disabled:shadow-none disabled:opacity-50 transition-all">Create Escrow</button>
            </div>
        </div>
    </>
    )
}

export const DepositScreen: React.FC<Pick<ScreenProps, 'setCurrentView' | 'showToast' | 'selectedTradeId'>> = ({ setCurrentView, showToast, selectedTradeId }) => {
    const { trades, updateTradeStatus } = useTrades();
    const trade = trades.find(t => t.id === selectedTradeId);
    const [paid, setPaid] = useState(false);
    
    // Load payment addresses from localStorage if available, otherwise use defaults
    const defaultAddresses: Record<Currency, string> = {
        [Currency.USDT]: 'TKfA9FCbhCZD2PghJzcFsYsnEcZTdWv9jw', // USDT TRC20
        [Currency.BTC]: 'bc1qcwx2g3nq6fntcascfym4xnl0279xktet4xphcg', // BTC SegWit
        [Currency.LTC]: 'LT7qj8j8JesorWM9Kqe6gRdrnVeKh1n8GT', // Litecoin
    };
    
    const [addresses, setAddresses] = useState<Record<Currency, string>>(defaultAddresses);
    const [usdRates, setUsdRates] = useState<Record<Currency, number>>({
        [Currency.USDT]: 1,
        [Currency.BTC]: 0,
        [Currency.LTC]: 0
    });
    
    useEffect(() => {
        const savedAddresses = localStorage.getItem('paymentAddresses');
        if (savedAddresses) {
            try {
                const parsed = JSON.parse(savedAddresses);
                setAddresses({
                    [Currency.USDT]: parsed.usdt || defaultAddresses[Currency.USDT],
                    [Currency.BTC]: parsed.btc || defaultAddresses[Currency.BTC],
                    [Currency.LTC]: parsed.ltc || defaultAddresses[Currency.LTC],
                });
            } catch (e) {
                console.error('Failed to load payment addresses:', e);
            }
        }
    }, []);

    useEffect(() => {
        const loadRates = async () => {
            try {
                const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin,tether&vs_currencies=usd');
                const json = await resp.json();
                setUsdRates({
                    [Currency.USDT]: Number(json?.tether?.usd) || 1,
                    [Currency.BTC]: Number(json?.bitcoin?.usd) || 0,
                    [Currency.LTC]: Number(json?.litecoin?.usd) || 0
                });
            } catch (error) {
                // keep defaults; user can still copy address and pay manually
            }
        };
        loadRates();
    }, []);

    useEffect(() => {
        const handleBack = () => setCurrentView('home');
        if (tg?.BackButton) {
            tg.BackButton.show();
            tg.BackButton.onClick(handleBack);
        }
        return () => {
            if (tg?.BackButton) {
                tg.BackButton.offClick(handleBack);
                tg.BackButton.hide();
            }
        };
    }, [setCurrentView]);

    const handleCopy = () => {
        const address = trade ? addresses[trade.currency] : '';
        navigator.clipboard.writeText(address);
        showToast("Address copied to clipboard!");
        tg?.HapticFeedback.notificationOccurred('success');
    }

    const [verifying, setVerifying] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed'>('pending');
    const [txHash, setTxHash] = useState('');
    const [verificationMessage, setVerificationMessage] = useState('');

    const verifyPayment = async () => {
        if (!trade) return;
        if (!txHash.trim()) {
            setVerificationStatus('failed');
            setVerificationMessage('Please enter your transaction hash before verification.');
            return;
        }
        
        setVerifying(true);
        setVerificationMessage('');
        try {
            // Call backend to verify payment on blockchain
                        const response = await fetch(API_ENDPOINTS.tradeVerifyPayment(trade.id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    address: addresses[trade.currency],
                    amount: totalInCurrency,
                    currency: trade.currency,
                    txHash: txHash.trim()
                })
            });
            
            const result = await response.json();
            
            if (result.ok && result.verified) {
                setVerificationStatus('verified');
                setVerificationMessage('Payment verified on backend. Activating escrow now...');
        setPaid(true);
        tg?.HapticFeedback.notificationOccurred('success');
                showToast("Payment verified! Trade is now active.");
             setTimeout(() => {
                    updateTradeStatus(trade.id, EscrowStatus.HELD);
                setCurrentView('tradeRoom', trade.id);
            }, 2000);
            } else {
                setVerificationStatus('failed');
                const backendMessage = result?.error || result?.message || "Payment not found. Please ensure you've sent the exact amount to the address.";
                setVerificationMessage(backendMessage);
                showToast(backendMessage);
            }
        } catch (error) {
            setVerificationStatus('failed');
            setVerificationMessage('Verification failed due to a network/server error.');
            showToast("Verification failed. Please try again.");
        } finally {
            setVerifying(false);
        }
    }

    if (!trade) return <div className="p-4 text-white">Trade not found.</div>;

    const fee = getDepositFee(trade.amount);
    const totalUsd = trade.amount + fee;
    const selectedRate = usdRates[trade.currency] || 0;
    const totalInCurrency = trade.currency === Currency.USDT ? totalUsd : (selectedRate > 0 ? totalUsd / selectedRate : 0);
    const networkByCurrency: Record<Currency, string> = {
        [Currency.USDT]: 'TRC20',
        [Currency.BTC]: 'BTC',
        [Currency.LTC]: 'LTC'
    };
    const address = addresses[trade.currency];
    const formatRate = (value: number) => {
        if (!value) return '--';
        if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
        if (value >= 1) return value.toFixed(2);
        return value.toFixed(4);
    };

    return (
        <div className="p-4 text-white text-center flex flex-col h-full">
            <h1 className="text-2xl font-bold mt-4">Deposit Funds</h1>
            <p className="text-text-body mb-2">
                Send exactly <span className="font-semibold text-white">{totalInCurrency.toFixed(8)} {trade.currency}</span> (≈ ${totalUsd.toFixed(2)}) to the address below.
            </p>
            <p className="text-xs text-text-body mb-6">
                Fee: {trade.amount < 100 ? '$1 under $100' : '1% above $100'}
            </p>

            <div className="bg-surface border border-border-color/80 rounded-2xl p-3 mb-4">
                <div className="grid grid-cols-3 gap-2">
                    {Object.values(Currency).map((c) => (
                        <div key={c} className={`rounded-xl px-3 py-2 border ${trade.currency === c ? 'border-primary/60 bg-primary/10' : 'border-border-color/70 bg-background/40'}`}>
                            <p className="text-xs text-text-body">{c}</p>
                            <p className="text-sm font-semibold text-white">${formatRate(usdRates[c])}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-surface p-6 rounded-2xl flex flex-col items-center border border-border-color">
                <div className="bg-white p-2 rounded-lg">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${address}`} alt="QR Code" className="rounded-lg"/>
                </div>
                <p className="text-lg font-bold mt-4">{totalInCurrency.toFixed(8)} {trade.currency}</p>
                <p className="text-sm text-amber-300 mt-1">Network: {networkByCurrency[trade.currency]}</p>
                <div className="bg-background w-full p-3 rounded-lg flex items-center justify-between mt-4 border border-border-color">
                    <span className="text-sm font-mono truncate mr-2">{address}</span>
                    <button onClick={handleCopy} className="text-primary hover:text-primary-hover"><ICONS.copy className="w-5 h-5"/></button>
                </div>
            </div>

            <div className="mt-8">
                {paid ? (
                    <>
                        <div className="flex items-center justify-center text-success mb-2">
                           <ICONS.check className="w-6 h-6 mr-2" />
                           <p className="font-semibold">Payment Confirmed!</p>
                        </div>
                        <div className="w-full bg-surface rounded-full h-2.5">
                            <div className="bg-success h-2.5 rounded-full w-full animate-pulse"></div>
                        </div>
                        <p className="text-sm text-text-body mt-2">Redirecting to trade chat...</p>
                    </>
                ) : (
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={txHash}
                            onChange={(e) => setTxHash(e.target.value)}
                            placeholder="Paste transaction hash (TXID)"
                            className="w-full bg-surface border border-border-color rounded-2xl px-4 py-3 text-white placeholder:text-text-body focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button 
                            onClick={verifyPayment} 
                            disabled={verifying || !txHash.trim()}
                            className="w-full bg-gradient-primary text-white font-bold py-3 rounded-2xl shadow-glow-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {verifying ? 'Verifying Payment...' : 'Verify Payment'}
                        </button>
                        {verificationStatus === 'failed' && (
                            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                                <p className="text-red-300 text-sm text-center">
                                    {verificationMessage || `Payment not found. Please ensure you've sent exactly ${totalInCurrency.toFixed(8)} ${trade.currency} on ${networkByCurrency[trade.currency]}.`}
                                </p>
                            </div>
                        )}
                        <p className="text-xs text-text-body text-center">
                            After sending payment, paste your transaction hash and click "Verify Payment".
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-auto text-sm text-text-body pb-24">
                Funds are held safely in escrow 🔒
            </div>
        </div>
    );
};

export const TradeRoomScreen: React.FC<ScreenProps> = ({ setCurrentView, selectedTradeId, currentUser, showToast }) => {
    const { trades, isLoading, addMessage, updateTradeStatus, loadMessages } = useTrades();
    const { addNotification } = useNotifications();
    const trade = trades.find(t => t.id === selectedTradeId);
    const [message, setMessage] = useState('');
    const [modal, setModal] = useState<'approve' | 'decline' | 'deliver' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [submittedReview, setSubmittedReview] = useState(false);
    const [liveMessages, setLiveMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const seenIncomingRef = useRef<Set<string>>(new Set());

     useEffect(() => {
        const handleBack = () => setCurrentView('chats');
        if (tg?.BackButton) {
            tg.BackButton.show();
            tg.BackButton.onClick(handleBack);
        }
        return () => {
            if (tg?.BackButton) {
                tg.BackButton.offClick(handleBack);
                tg.BackButton.hide();
            }
        };
    }, [setCurrentView]);

    useEffect(() => {
        if (!trade) return;
        setLiveMessages(trade.messages || []);
    }, [trade?.id]);

    const otherParty = trade ? (trade.buyer.id === currentUser.id ? trade.seller : trade.buyer) : null;

    useEffect(() => {
        if (!trade || !otherParty) return;
        let mounted = true;

        const syncMessages = async () => {
            const serverMessages = await loadMessages(trade.id);
            if (!mounted || !serverMessages.length) return;
            setLiveMessages(serverMessages);
            if (seenIncomingRef.current.size === 0) {
                serverMessages.forEach((msg) => seenIncomingRef.current.add(msg.id));
                return;
            }
            for (const msg of serverMessages) {
                if (msg.senderId === currentUser.id || msg.senderId === 'system') continue;
                if (seenIncomingRef.current.has(msg.id)) continue;
                seenIncomingRef.current.add(msg.id);
                addNotification(trade.id, `New message from ${otherParty.username}`);
            }
        };

        syncMessages();
        const timer = setInterval(syncMessages, 3000);
        return () => {
            mounted = false;
            clearInterval(timer);
        };
    }, [trade?.id, otherParty?.id, currentUser.id, loadMessages, addNotification]);

    const filteredMessages = useMemo(() => {
        if (!searchQuery.trim()) return liveMessages;
        return liveMessages.filter(msg =>
            msg.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [liveMessages, searchQuery]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [filteredMessages]);

    const sendMessage = () => {
        if (!message.trim() || !trade) return;
        const newMessage: Message = {
            id: `m${Date.now()}`,
            senderId: currentUser.id,
            type: MessageType.TEXT,
            content: message,
            timestamp: new Date(),
        };
        addMessage(trade.id, newMessage);
        setLiveMessages(prev => [...prev, newMessage]);
        setMessage('');
        tg?.HapticFeedback.impactOccurred('light');
    };

    const handleAction = async (action: 'approve' | 'decline' | 'deliver') => {
        if (!trade) return;
        
        if (action === 'approve') {
            // Buyer approves delivery
            try {
                                await fetch(API_ENDPOINTS.tradeApproveDelivery(trade.id), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' }
                });
            updateTradeStatus(trade.id, EscrowStatus.COMPLETED);
                showToast("Delivery approved! Trade completed.");
            } catch (error) {
                showToast("Failed to approve delivery. Please try again.");
            }
        } else if (action === 'decline') {
            // Buyer requests revision
            const revisionMessage = prompt("Please explain what needs to be revised:");
            if (revisionMessage) {
                try {
                                        await fetch(API_ENDPOINTS.tradeRequestRevision(trade.id), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ revision_message: revisionMessage })
                    });
                    showToast("Revision requested. Seller will update the delivery.");
                } catch (error) {
                    showToast("Failed to request revision. Please try again.");
                }
            }
        } else if (action === 'deliver') {
            // Seller delivers work
            const deliveryMessage = prompt("Please describe what you're delivering:");
            if (deliveryMessage) {
                try {
                                            await fetch(API_ENDPOINTS.tradeDeliver(trade.id), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ delivery_message: deliveryMessage })
                    });
            updateTradeStatus(trade.id, EscrowStatus.DELIVERED);
                    showToast("Work delivered! Waiting for buyer approval.");
                } catch (error) {
                    showToast("Failed to deliver work. Please try again.");
                }
            }
        }
        setModal(null);
    };
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-text-body">Loading trade data...</p>
                </div>
            </div>
        );
    }
    
    if (!trade) {
        return <div className="p-4 text-white">Trade not found. <button onClick={() => setCurrentView('home')}>Go Home</button></div>;
    }

    const resolvedOtherParty = trade.buyer.id === currentUser.id ? trade.seller : trade.buyer;
    const isBuyer = trade.buyer.id === currentUser.id;

    const hasBuyerReviewed = !!trade.buyerReview;
    const hasSellerReviewed = !!trade.sellerReview;
    const canLeaveReview = trade.status === EscrowStatus.COMPLETED &&
        ((isBuyer && !hasBuyerReviewed) || (!isBuyer && !hasSellerReviewed));

    const myReview = isBuyer ? trade.buyerReview : trade.sellerReview;
    const otherPartyReview = isBuyer ? trade.sellerReview : trade.buyerReview;
    
    const handleReviewSubmit = () => {
        showToast("Your review has been submitted!");
        setSubmittedReview(true);
    };
    


    return (
        <div className="flex flex-col h-screen bg-background text-white">
             <Modal
                isOpen={modal === 'approve'}
                onClose={() => setModal(null)}
                onConfirm={() => handleAction('approve')}
                title="Approve Delivery?"
                confirmText="Yes, Release Funds"
                confirmClass="bg-gradient-to-r from-green-500 to-success"
            >
                Are you sure you want to approve? This will release the funds to the seller. This action is irreversible.
            </Modal>
             <Modal
                isOpen={modal === 'decline'}
                onClose={() => setModal(null)}
                onConfirm={() => handleAction('decline')}
                title="Request Revision?"
                confirmText="Yes, Request Revision"
                confirmClass="bg-gradient-to-r from-orange-500 to-yellow-500"
            >
                This will request the seller to revise their delivery. The seller will be notified and can update their work.
            </Modal>
            <Modal
                isOpen={modal === 'deliver'}
                onClose={() => setModal(null)}
                onConfirm={() => handleAction('deliver')}
                title="Mark as Delivered?"
                confirmText="Yes, Mark Delivered"
            >
                Are you sure you have delivered the item/service to the buyer?
            </Modal>

            <div className="bg-surface/80 backdrop-blur-lg p-3 flex items-center justify-between border-b border-border-color sticky top-0 z-10">
                {isSearching ? (
                     <div className="flex items-center space-x-2 flex-grow">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search messages..."
                            className="flex-grow bg-background p-2 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary w-full"
                            autoFocus
                        />
                        <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="text-text-body p-2">
                            <ICONS.x className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center space-x-3">
                            {/* Back button is handled by native TG button */}
                            <Avatar src={resolvedOtherParty.avatarUrl} name={resolvedOtherParty.username} className="w-10 h-10" onClick={() => setCurrentView('userProfile', null, resolvedOtherParty.id)} />
                            <div>
                                <p className="font-bold">{resolvedOtherParty.username}</p>
                                <p className="text-xs text-text-body">${trade.amount.toFixed(2)} • pay via {trade.currency}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                             <StatusBadge status={trade.status} />
                             <button onClick={() => setIsSearching(true)} className="text-text-body p-2">
                                <ICONS.search className="w-5 h-5" />
                             </button>
                        </div>
                    </>
                )}
            </div>

            {/* Delivery Status Display */}
            {trade.status === EscrowStatus.HELD && (
                <div className="bg-blue-900/50 text-center p-3 text-blue-300">
                    <div className="flex items-center justify-center space-x-2">
                    <ICONS.clock className="w-4 h-4"/>
                        <span>Waiting for seller to deliver work</span>
                    </div>
                </div>
            )}

            {trade.status === EscrowStatus.CREATED && (
                <div className="bg-purple-900/50 p-3 text-purple-200 flex items-center justify-between gap-2">
                    <span className="text-sm">{isBuyer ? 'Trade created. You can pay anytime to activate escrow protection.' : 'Trade created. Waiting for buyer payment.'}</span>
                    {isBuyer && (
                        <button onClick={() => setCurrentView('deposit', trade.id)} className="shrink-0 bg-gradient-primary text-white text-xs px-3 py-2 rounded-xl font-semibold">
                            Pay Now
                        </button>
                    )}
                </div>
            )}
            
            {trade.status === EscrowStatus.DELIVERED && isBuyer && (
                 <div className="bg-yellow-900/50 text-center p-3 text-warning flex items-center justify-center space-x-2">
                    <ICONS.check className="w-4 h-4"/>
                    <span>Work delivered! Please review and approve.</span>
                </div>
            )}
            
            {trade.status === EscrowStatus.DELIVERED && !isBuyer && (
                 <div className="bg-green-900/50 text-center p-3 text-green-300 flex items-center justify-center space-x-2">
                    <ICONS.check className="w-4 h-4"/>
                    <span>Work delivered! Waiting for buyer approval.</span>
                </div>
            )}
            
            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                {filteredMessages.map(msg => {
                    if (msg.type === MessageType.SYSTEM) {
                        return <div key={msg.id} className="text-center text-xs text-text-body my-2">-- {highlightText(msg.content, searchQuery)} --</div>;
                    }
                    const isMe = msg.senderId === currentUser.id;
                    const hasMedia = !!msg.media;
                    const hasContent = msg.content && msg.content.trim().length > 0;

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex flex-col max-w-xs md:max-w-md rounded-2xl ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-surface text-white rounded-bl-none'} ${hasMedia && !hasContent ? 'p-1.5' : 'p-3'}`}>
                                {hasMedia && msg.media?.type === 'image' && (
                                    <img src={msg.media.url} alt="attachment" className="rounded-lg mb-1 max-h-60 w-full object-cover" />
                                )}
                                {hasMedia && msg.media?.type === 'video' && (
                                    <video src={msg.media.url} controls className="rounded-lg mb-1 max-h-60 w-full" />
                                )}
                                {hasContent && <p className="break-words">{highlightText(msg.content, searchQuery)}</p>}
                                <p className={`text-xs opacity-70 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    );
                })}
                {filteredMessages.length === 0 && searchQuery && (
                    <div className="text-center text-text-body mt-20">
                        <ICONS.search className="w-16 h-16 mx-auto text-gray-600 mb-4"/>
                        <h2 className="text-xl font-semibold">No Results Found</h2>
                        <p>Try searching for a different term.</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            
            {trade.status === EscrowStatus.COMPLETED ? (
                <div className="p-4 border-t border-border-color bg-surface overflow-y-auto">
                    <h3 className="font-bold text-xl mb-4 text-center text-success flex items-center justify-center space-x-2">
                        <ICONS.check className="w-6 h-6"/>
                        <span>Trade Completed</span>
                    </h3>
                    
                    {myReview && (
                        <div className="mb-4">
                            <h4 className="font-semibold text-text-body mb-2">Your review for {resolvedOtherParty.username}</h4>
                            <ReviewCard review={myReview} reviewer={currentUser} trade={trade} onViewTrade={() => {}} />
                        </div>
                    )}

                    {otherPartyReview && (
                        <div className="mb-4">
                            <h4 className="font-semibold text-text-body mb-2">Review from {resolvedOtherParty.username}</h4>
                            <ReviewCard review={otherPartyReview} reviewer={resolvedOtherParty} trade={trade} onViewTrade={() => {}} />
                        </div>
                    )}
                    
                    {canLeaveReview && !submittedReview && (
                        <LeaveReviewForm trade={trade} currentUser={currentUser} onSubmit={handleReviewSubmit} />
                    )}

                </div>
            ) : (
                <div className="bg-surface p-3 mt-auto">
                     {/* Buyer Actions */}
                     {isBuyer && trade.status === EscrowStatus.DELIVERED && (
                        <div className="flex space-x-2 mb-2">
                            <button onClick={() => setModal('approve')} className="flex-1 bg-gradient-to-r from-green-500 to-success text-white font-bold py-3 rounded-2xl flex items-center justify-center space-x-2 shadow-glow-success">
                                <ICONS.check className="w-5 h-5"/>
                                <span>Approve & Release Funds</span>
                            </button>
                            <button onClick={() => setModal('decline')} className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold py-3 rounded-2xl flex items-center justify-center space-x-2">
                                <ICONS.x className="w-5 h-5"/>
                                <span>Request Revision</span>
                            </button>
                        </div>
                    )}
                    
                    {/* Seller Actions */}
                    {!isBuyer && trade.status === EscrowStatus.HELD && (
                        <div className="flex space-x-2 mb-2">
                            <button onClick={() => setModal('deliver')} className="flex-1 bg-gradient-to-r from-blue-500 to-primary text-white font-bold py-3 rounded-2xl flex items-center justify-center space-x-2 shadow-glow-primary">
                                <ICONS.send className="w-5 h-5"/>
                                <span>Deliver Work</span>
                            </button>
                        </div>
                    )}
                    
                    {/* Cancel Trade Button for both parties */}
                    {(trade.status === EscrowStatus.HELD || trade.status === EscrowStatus.IN_PROGRESS) && (
                        <div className="flex justify-center mb-2">
                            <button 
                                onClick={() => {
                                    const reason = prompt("Reason for cancellation:");
                                    if (reason) {
                                                                                fetch(API_ENDPOINTS.tradeCancel(trade.id), {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ 
                                                cancelled_by: currentUser.id, 
                                                cancellation_reason: reason 
                                            })
                                        }).then(() => {
                                            updateTradeStatus(trade.id, EscrowStatus.CANCELLED);
                                            showToast("Trade cancelled successfully.");
                                        }).catch(() => {
                                            showToast("Failed to cancel trade. Please try again.");
                                        });
                                    }
                                }}
                                className="bg-gray-600 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center space-x-2"
                            >
                                <ICONS.x className="w-4 h-4"/>
                                <span>Cancel Trade</span>
                            </button>
                        </div>
                    )}
                     {!isBuyer && (trade.status === EscrowStatus.HELD || trade.status === EscrowStatus.IN_PROGRESS) && (
                         <div className="mb-2">
                            <button onClick={() => setModal('deliver')} className="w-full bg-gradient-primary text-white font-bold py-3 rounded-2xl shadow-glow-primary">Mark as Delivered</button>
                         </div>
                     )}
                    <div className="flex items-center space-x-2">
                        <input 
                            type="text" 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Type a message..." 
                            className="flex-grow bg-background p-3 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-primary border border-transparent focus:border-primary"
                        />
                        <button onClick={sendMessage} className="bg-primary text-white p-3 rounded-full hover:bg-primary-hover transition-colors">
                            <ICONS.send className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export const ChatsScreen: React.FC<Pick<ScreenProps, 'setCurrentView' | 'setSelectedTradeId' | 'setSelectedUserId' | 'currentUser'>> = ({setCurrentView, setSelectedTradeId, setSelectedUserId, currentUser}) => {
    const { trades } = useTrades();
    const [filter, setFilter] = useState<'all' | 'buying' | 'selling' | 'disputed'>('all');

    const userTrades = useMemo(() => {
      return trades.filter(t => t.buyer.id === currentUser.id || t.seller.id === currentUser.id);
    }, [trades, currentUser.id]);

    const filteredTrades = useMemo(() => {
        switch (filter) {
            case 'buying':
                return userTrades.filter(t => t.buyer.id === currentUser.id);
            case 'selling':
                return userTrades.filter(t => t.seller.id === currentUser.id);
            case 'disputed':
                return userTrades.filter(t => t.status === EscrowStatus.DISPUTE);
            default:
                return userTrades;
        }
    }, [userTrades, filter, currentUser.id]);

    const handleTradeClick = (tradeId: string) => {
        const trade = trades.find(t => t.id === tradeId);
        if (trade && trade.status === EscrowStatus.DISPUTE) {
            setCurrentView('disputeRoom', trade.id);
        } else {
            setCurrentView('tradeRoom', tradeId);
        }
    };

    const handleUserClick = (userId: string) => {
        setSelectedUserId(userId);
        setCurrentView('userProfile');
    };

    return (
        <div className="p-4 text-white">
            <div className="flex bg-surface rounded-full p-1 mb-4">
                {(['all', 'buying', 'selling', 'disputed'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`flex-1 capitalize text-sm font-bold py-2 rounded-full transition-colors ${
                            filter === f 
                            ? (f === 'disputed' ? 'bg-danger' : 'bg-primary') + ' text-white' 
                            : 'text-text-body'
                        }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {filteredTrades.length > 0 ? filteredTrades.map(trade => {
                    const otherParty = trade.buyer.id === currentUser.id ? trade.seller : trade.buyer;
                    return (
                        <div key={trade.id} onClick={() => handleTradeClick(trade.id)} className="bg-surface p-3 rounded-2xl flex items-center justify-between cursor-pointer border border-border-color hover:border-primary transition-colors">
                             <div className="flex items-center space-x-3">
                                <Avatar src={otherParty.avatarUrl} name={otherParty.username} className="w-12 h-12" onClick={() => handleUserClick(otherParty.id)} />
                                <div>
                                    <p className="font-semibold">{otherParty.username}</p>
                                    <p className="text-sm text-text-body truncate w-48">{trade.description}</p>
                                </div>
                            </div>
                            <StatusBadge status={trade.status} />
                        </div>
                    )
                }) : (
                     <div className="text-center text-text-body mt-20">
                        <ICONS.chat className="w-16 h-16 mx-auto text-gray-600 mb-4"/>
                        <h2 className="text-xl font-semibold">No Trades Found</h2>
                        <p>Your trades in this category will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ServiceCard: React.FC<{ service: Service; user: User; onClick: () => void }> = ({ service, user, onClick }) => {
    return (
        <div onClick={onClick} className="bg-surface/90 p-4 rounded-2xl flex flex-col justify-between cursor-pointer border border-border-color hover:border-primary transition-colors glass-card surface-hover">
            <div>
                <h3 className="font-bold text-lg text-white truncate">{service.title}</h3>
                <p className="text-sm text-text-body mt-1 h-10 overflow-hidden">{service.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="px-2 py-1 rounded-full border border-primary/35 text-primary bg-primary/10">
                        {getSellerTierLabel(user.rating)}
                    </span>
                    <div className="flex items-center gap-1 text-text-body">
                        <span className="text-yellow-400">★</span>
                        <span>{(Number(user.rating) || 0).toFixed(1)}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-color/50">
                <div className="flex items-center space-x-2">
                    <Avatar src={user.avatarUrl} name={user.username} className="w-8 h-8" />
                    <span className="text-xs font-medium text-text-body">{user.username}</span>
                </div>
                <div className="text-right">
                    <p className="font-bold text-primary">{service.price} {service.currency}</p>
                </div>
            </div>
        </div>
    );
};

export const ExploreScreen: React.FC<Pick<ScreenProps, 'setCurrentView' | 'setSelectedUserId' | 'setCreatingNew' | 'currentUser'>> = ({ setCurrentView, setSelectedUserId, setCreatingNew, currentUser }) => {
    const { allUsers } = useUsers();
    const { mode } = useMode();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'services'>('services');

    const usersToList = useMemo(() => {
        return allUsers.filter(user => user.id !== currentUser.id && user.id !== 'admin');
    }, [allUsers, currentUser.id]);

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) {
            return usersToList;
        }
        return usersToList.filter(user =>
            user.username.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [usersToList, searchQuery]);
    
    const allServices = useMemo(() => {
        return allUsers.flatMap(user =>
            user.services ? user.services.map(service => ({ ...service, user })) : []
        ).filter(service => 
            service.user.id !== currentUser.id && 
            service.approved === true && // Only show approved services to buyers
            service.rejected !== true // Hide rejected services
        );
    }, [allUsers, currentUser.id]);

    const filteredServices = useMemo(() => {
        if (!searchQuery.trim()) {
            return allServices;
        }
        return allServices.filter(service =>
            service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [allServices, searchQuery]);

    const handleUserClick = (userId: string) => {
        const isSellerPicker = sessionStorage.getItem('escrowx-seller-picker') === '1';
        setSelectedUserId(userId);
        if (isSellerPicker) {
            sessionStorage.removeItem('escrowx-seller-picker');
            setCreatingNew(true);
            setCurrentView('createEscrow', null, userId);
            return;
        }
        setCurrentView('userProfile', null, userId);
    };

    const isSellerMode = mode === 'seller';

    return (
        <div className="p-4 text-white">
            <div className="mb-4 bg-surface/80 border border-border-color rounded-2xl p-4 glass-card">
                <p className="text-xs uppercase tracking-wide text-primary/90 font-semibold">Marketplace</p>
                <h2 className="text-xl font-bold mt-1">Find trusted freelancers and services</h2>
                <p className="text-sm text-text-body mt-1">Fiverr-style browsing with transparent ratings and seller reputation.</p>
            </div>
            {mode === 'buyer' && (
                 <div className="flex bg-surface/80 rounded-full p-1 mb-4 border border-border-color">
                    <button onClick={() => setActiveTab('services')} className={`flex-1 capitalize text-sm font-bold py-2 rounded-full transition-colors ${activeTab === 'services' ? 'bg-primary text-white' : 'text-text-body'}`}>
                        Services
                    </button>
                    <button onClick={() => setActiveTab('users')} className={`flex-1 capitalize text-sm font-bold py-2 rounded-full transition-colors ${activeTab === 'users' ? 'bg-primary text-white' : 'text-text-body'}`}>
                        Users
                    </button>
                </div>
            )}

            <div className="relative mb-4">
                <ICONS.search className="absolute top-1/2 left-4 -translate-y-1/2 text-text-body w-5 h-5" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={
                        isSellerMode 
                          ? 'Search for a service...' 
                          : `Search for a ${activeTab === 'users' ? 'user' : 'service'}...`
                    }
                    className="w-full bg-surface pl-11 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-primary focus:outline-none border border-border-color"
                />
            </div>
            
            {mode === 'buyer' && activeTab === 'users' && (
                <div className="space-y-3">
                    {filteredUsers.length > 0 ? filteredUsers.map(user => (
                        <div key={user.id} onClick={() => handleUserClick(user.id)} className="bg-surface/90 p-3 rounded-2xl flex items-center justify-between cursor-pointer border border-border-color hover:border-primary transition-colors glass-card surface-hover">
                            <div className="flex items-center space-x-3">
                                <Avatar src={user.avatarUrl} name={user.username} className="w-12 h-12" />
                                <div>
                                    <p className="font-semibold">{user.username}</p>
                                    <div className="flex items-center space-x-1">
                                        <StarDisplay rating={user.rating} className="text-xs"/>
                                    </div>
                                    <p className="text-[11px] text-primary mt-0.5">{getSellerTierLabel(user.rating)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                            {user.isVerified && <ICONS.verified className="w-5 h-5 text-primary mb-1 ml-auto"/>}
                            <span className="text-xs text-text-body">View Profile &rarr;</span>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center text-text-body mt-20">
                            <ICONS.search className="w-16 h-16 mx-auto text-gray-600 mb-4"/>
                            <h2 className="text-xl font-semibold">No Users Found</h2>
                            <p>Your search for "{searchQuery}" did not return any results.</p>
                        </div>
                    )}
                </div>
            )}
            
            {(isSellerMode || (mode === 'buyer' && activeTab === 'services')) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredServices.length > 0 ? filteredServices.map(service => (
                        <ServiceCard key={service.id} service={service} user={service.user} onClick={() => handleUserClick(service.user.id)} />
                    )) : (
                         <div className="text-center text-text-body mt-20 col-span-full">
                            <ICONS.search className="w-16 h-16 mx-auto text-gray-600 mb-4"/>
                            <h2 className="text-xl font-semibold">No Services Found</h2>
                            <p>Your search for "{searchQuery}" did not return any results.</p>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};


const ServiceFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (service: Omit<Service, 'id'> & { id?: string }) => void;
    service?: Service | null;
}> = ({ isOpen, onClose, onSave, service }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [currency, setCurrency] = useState<Currency>(Currency.USDT);

    useEffect(() => {
        if (service) {
            setTitle(service.title);
            setDescription(service.description);
            setPrice(String(service.price));
            setCurrency(service.currency);
        } else {
            setTitle('');
            setDescription('');
            setPrice('');
            setCurrency(Currency.USDT);
        }
    }, [service, isOpen]);

    const handleSave = () => {
        if (!title || !price) {
            tg?.HapticFeedback.notificationOccurred('error');
            alert('Title and Price are required.');
            return;
        }
        onSave({
            id: service?.id,
            title,
            description,
            price: parseFloat(price),
            currency,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface rounded-3xl p-6 w-full max-w-sm border border-border-color/80 shadow-[0_18px_45px_rgba(0,0,0,0.45)]" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-6">{service ? 'Edit Service' : 'Add New Service'}</h2>
                <div className="space-y-4">
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Service Title" className="w-full bg-background p-3 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none border border-border-color" />
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Service Description" className="w-full bg-background p-3 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none border border-border-color" rows={3}></textarea>
                    <div className="flex space-x-2">
                        <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Price" className="w-full bg-background p-3 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none border border-border-color" />
                        <div className="bg-background rounded-lg p-1 flex space-x-1 border border-border-color">
                            {Object.values(Currency).map(c => (
                                <button key={c} onClick={() => setCurrency(c)} className={`p-2 rounded-md transition-colors ${currency === c ? 'bg-primary' : ''}`}>
                                    <CryptoIcon currency={c} className="w-5 h-5"/>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex space-x-3 mt-6">
                    <button onClick={onClose} className="flex-1 bg-surface-alt text-white font-bold py-3 rounded-xl hover:bg-gray-700/50 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex-1 text-white font-bold py-3 rounded-xl transition-all hover:brightness-110 bg-gradient-primary">Save Service</button>
                </div>
            </div>
        </div>
    );
};

const WithdrawFundsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (req: { amount: number; address: string; currency: Currency; network: string }) => void;
    balances: Record<Currency, number>;
}> = ({ isOpen, onClose, onSubmit, balances }) => {
    const [amount, setAmount] = useState('');
    const [address, setAddress] = useState('');
    const [currency, setCurrency] = useState<Currency>(Currency.USDT);
    const [network, setNetwork] = useState<string>('TRC20');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setAddress('');
            setError(null);
            const defaultCurrency = Object.keys(balances)[0] as Currency || Currency.USDT;
            setCurrency(defaultCurrency);
            setNetwork(NETWORKS_BY_CURRENCY[defaultCurrency][0]);
        }
    }, [isOpen, balances]);

    useEffect(() => {
        const allowedNetworks = NETWORKS_BY_CURRENCY[currency];
        if (!allowedNetworks.includes(network)) {
            setNetwork(allowedNetworks[0]);
        }
    }, [currency, network]);

    const handleSubmit = () => {
        const numericAmount = parseFloat(amount);
        const availableBalance = balances[currency] || 0;

        if (!numericAmount || numericAmount < MIN_WITHDRAWAL_USD) {
            setError(`Minimum withdrawal is $${MIN_WITHDRAWAL_USD}.`);
            return;
        }
        if (numericAmount <= WITHDRAWAL_FEE_USD) {
            setError('Please enter a valid amount.');
            return;
        }
        if (numericAmount > availableBalance) {
            setError('Insufficient funds for this currency.');
            return;
        }
        if (!address.trim()) {
            setError('Please enter a destination address.');
            return;
        }
        if (!network) {
            setError('Please select a withdrawal network.');
            return;
        }

        const availableAfterFee = numericAmount - WITHDRAWAL_FEE_USD;
        if (availableAfterFee <= 0) {
            setError('Amount must be greater than the withdrawal fee.');
            return;
        }

        setError(null);
        onSubmit({ amount: numericAmount, address, currency, network });
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface rounded-2xl p-6 w-full max-w-sm border border-border-color" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4">Withdraw Funds</h2>
                
                <div className="bg-background/80 p-4 rounded-xl border border-border-color/80 mb-4">
                    <h3 className="text-sm text-text-body font-medium mb-2">Your Balances</h3>
                    {Object.keys(balances).length > 0 ? (
                        <div className="space-y-1">
                            {(Object.entries(balances) as [Currency, number][]).map(([c, b]) => (
                                <div key={c} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center space-x-2">
                                        <CryptoIcon currency={c} className="w-4 h-4" />
                                        <span>{c}</span>
                                    </div>
                                    <span className="font-mono">{b.toFixed(4)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-text-body text-center">No funds available.</p>
                    )}
                </div>

                <div className="space-y-4">
                     <div>
                        <div className="flex space-x-2">
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" className="w-full bg-background p-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none border border-border-color/80" />
                            <div className="bg-background rounded-xl p-1 flex space-x-1 border border-border-color/80">
                                {Object.values(Currency).map(c => (
                                    <button key={c} onClick={() => setCurrency(c)} className={`p-2 rounded-lg transition-all ${currency === c ? 'bg-primary shadow-[0_8px_18px_rgba(63,109,244,0.45)]' : 'hover:bg-surface-alt'}`}>
                                        <CryptoIcon currency={c} className="w-5 h-5"/>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => setAmount(String(balances[currency] || 0))} className="text-xs text-primary/80 hover:text-primary mt-1.5 px-1">
                           Withdraw max {balances[currency] || 0} {currency}
                        </button>
                    </div>
                    <div>
                        <label className="text-sm text-text-body block mb-2">Network</label>
                        <select
                            value={network}
                            onChange={e => setNetwork(e.target.value)}
                            className="w-full bg-background p-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none border border-border-color/80"
                        >
                            {NETWORKS_BY_CURRENCY[currency].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <p className="text-xs text-amber-300 mt-2">{NETWORK_WARNING}</p>
                    </div>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Destination Address" className="w-full bg-background p-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none border border-border-color/80" />
                    <div className="bg-background/60 border border-border-color/80 rounded-xl p-3 text-sm text-text-body">
                        <div className="flex justify-between">
                            <span>Withdrawal Fee</span>
                            <span>${WITHDRAWAL_FEE_USD.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mt-1 font-semibold text-white">
                            <span>You Receive</span>
                            <span>{Math.max((parseFloat(amount) || 0) - WITHDRAWAL_FEE_USD, 0).toFixed(4)} {currency}</span>
                        </div>
                    </div>
                </div>

                {error && <p className="text-danger text-sm mt-3 text-center">{error}</p>}
                
                <div className="flex space-x-3 mt-6">
                    <button onClick={onClose} className="flex-1 bg-surface-alt text-white font-bold py-3 rounded-xl hover:bg-gray-700/50 border border-border-color/80 transition-all">Cancel</button>
                    <button onClick={handleSubmit} disabled={Object.keys(balances).length === 0} className="flex-1 text-white font-bold py-3 rounded-xl transition-all hover:brightness-110 bg-gradient-primary shadow-glow-primary disabled:bg-gray-600 disabled:opacity-50 disabled:shadow-none">Submit Withdrawal</button>
                </div>
            </div>
        </div>
    );
};


export const ProfileScreen: React.FC<ScreenProps> = ({setCurrentView, currentUser, showToast}) => {
    const { trades, isLoading } = useTrades();
    const { mode, setMode } = useMode();
    const { getUserById, updateCurrentUser } = useUsers();
    
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);

    const buyingTrades = trades.filter(t => t.buyer.id === currentUser.id);
    const sellingTrades = trades.filter(t => t.seller.id === currentUser.id);

    const [balances, setBalances] = useState<Record<Currency, number>>({
        [Currency.BTC]: 0,
        [Currency.USDT]: 0,
        [Currency.LTC]: 0
    });

    useEffect(() => {
        (async () => {
            try {
                                const resp = await fetch(API_ENDPOINTS.balances(currentUser.id));
                const json = await resp.json();
                if (json.ok) {
                    setBalances(json.balances || {});
                }
            } catch {}
        })();
    }, [currentUser.id]);

    useEffect(() => {
        (async () => {
            try {
                                const resp = await fetch(API_ENDPOINTS.withdrawals);
                const json = await resp.json();
                const mine = (Array.isArray(json.withdrawals) ? json.withdrawals : []).filter((w: any) => (w.userId || w.user_id) === currentUser.id);
                setPendingWithdrawals(mine);
            } catch {}
        })();
    }, [currentUser.id]);
    
    const handleTradeClick = (tradeId: string) => {
        setCurrentView('tradeRoom', tradeId);
    };
    
    const handleOpenServiceModal = (service: Service | null = null) => {
        setEditingService(service);
        setIsServiceModalOpen(true);
    };

    const handleSaveService = async (serviceData: Omit<Service, 'id'> & { id?: string }) => {
        if (serviceData.id) { // Editing existing service
            const updatedServices = (currentUser.services || []).map(s => s.id === serviceData.id ? { ...s, ...serviceData } : s);
        updateCurrentUser({ ...currentUser, services: updatedServices });
        } else { // Adding new service - submit to backend for admin approval
            const newService = { 
                ...serviceData, 
                id: `s${Date.now()}`,
                approved: false, // New services need admin approval
                rejected: false,
                createdAt: new Date()
            };
            
            // Add to local services immediately
            const updatedServices = [...(currentUser.services || []), newService];
            updateCurrentUser({ ...currentUser, services: updatedServices });
            
            // Submit to backend for admin approval
            try {
                                await fetch(API_ENDPOINTS.servicesSubmit, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        userId: currentUser.id,
                        service: newService
                    })
                });
                
                // Show success message
                tg?.HapticFeedback.notificationOccurred('success');
                alert('Service submitted for admin approval. It will be visible to buyers once approved.');
            } catch (error) {
                console.error('Failed to submit service:', error);
                tg?.HapticFeedback.notificationOccurred('error');
                alert('Service saved locally, but failed to submit for approval. Please try again.');
            }
        }
        
        setIsServiceModalOpen(false);
        setEditingService(null);
    };

    const handleDeleteService = (serviceId: string) => {
        const updatedServices = (currentUser.services || []).filter(s => s.id !== serviceId);
        updateCurrentUser({ ...currentUser, services: updatedServices });
    };

    const handleWithdrawSubmit = async (req: { amount: number; address: string; currency: Currency; network: string }) => {
        try {
            const resp = await fetch(API_ENDPOINTS.withdrawalRequest, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    amount: req.amount,
                    currency: req.currency,
                    network: req.network,
                    address: req.address
                })
            });
            if (!resp.ok) {
                const errorJson = await resp.json().catch(() => ({}));
                throw new Error(errorJson.error || 'Failed to request withdrawal');
            }
            setIsWithdrawModalOpen(false);
            showToast("Withdrawal request submitted successfully!");
        } catch (e) {
            showToast(e instanceof Error ? e.message : "Failed to submit withdrawal. Try again.");
        }
    };


    const receivedReviews = useMemo(() => {
        return trades
            .filter(trade => trade.status === EscrowStatus.COMPLETED)
            .map(trade => {
                let review: Review | undefined;
                if (trade.seller.id === currentUser.id) review = trade.buyerReview;
                if (trade.buyer.id === currentUser.id) review = trade.sellerReview;
                return review ? { review, trade } : null;
            })
            .filter((item): item is { review: Review; trade: Trade } => item !== null)
            .sort((a, b) => b.review.timestamp.getTime() - a.review.timestamp.getTime());
    }, [trades, currentUser.id]);

    const givenReviews = useMemo(() => {
        return trades
            .filter(trade => trade.status === EscrowStatus.COMPLETED)
            .map(trade => {
                let review: Review | undefined;
                if (trade.buyer.id === currentUser.id) review = trade.buyerReview;
                if (trade.seller.id === currentUser.id) review = trade.sellerReview;
                return review ? { review, trade } : null;
            })
            .filter((item): item is { review: Review; trade: Trade } => item !== null)
            .sort((a, b) => b.review.timestamp.getTime() - a.review.timestamp.getTime());
    }, [trades, currentUser.id]);

    const completedBuyingTrades = buyingTrades.filter(t => t.status === EscrowStatus.COMPLETED);
    const completedSellingTrades = sellingTrades.filter(t => t.status === EscrowStatus.COMPLETED);

    return (
    <div className="p-4 text-white">
        {/* Loading State */}
        {isLoading && (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-text-body">Loading your orders...</span>
            </div>
        )}
        
        {/* Profile Content */}
        {!isLoading && (
            <>
        <ServiceFormModal 
            isOpen={isServiceModalOpen}
            onClose={() => setIsServiceModalOpen(false)}
            onSave={handleSaveService}
            service={editingService}
        />
        <WithdrawFundsModal
            isOpen={isWithdrawModalOpen}
            onClose={() => setIsWithdrawModalOpen(false)}
            onSubmit={handleWithdrawSubmit}
            balances={balances}
        />
            {/* Profile Header */}
            <div className="flex flex-col items-center mb-8">
                <Avatar src={currentUser.avatarUrl} name={currentUser.username} className="w-32 h-32 mb-4 border-4 border-primary/30 shadow-lg" />
                <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-4xl font-bold">{currentUser.username}</h1>
                    {currentUser.isVerified && <ICONS.verified className="w-8 h-8 text-primary" />}
            </div>
                <div className="flex items-center space-x-3 bg-surface px-6 py-3 rounded-full border border-border-color shadow-lg">
                    <StarDisplay rating={currentUser.rating} className="text-2xl" />
                    <span className="text-xl font-bold text-white">{(Number(currentUser.rating) || 0).toFixed(1)}</span>
                <span className="text-text-body">({receivedReviews.length} reviews)</span>
            </div>
        </div>

            {/* Profile Type Selector */}
            <div className="w-full bg-surface p-1 rounded-full flex items-center mb-8 shadow-lg">
            <button
                onClick={() => setMode('buyer')}
                    className={`flex-1 font-bold py-3 rounded-full transition-all duration-200 ${
                        mode === 'buyer' 
                            ? 'bg-primary text-white shadow-lg' 
                            : 'text-text-body hover:text-white'
                    }`}
                >
                    <div className="flex items-center justify-center space-x-2">
                        <ICONS.shopping className="w-5 h-5" />
                        <span>Buyer Profile</span>
                    </div>
            </button>
            <button
                onClick={() => setMode('seller')}
                    className={`flex-1 font-bold py-3 rounded-full transition-all duration-200 ${
                        mode === 'seller' 
                            ? 'bg-primary text-white shadow-lg' 
                            : 'text-text-body hover:text-white'
                    }`}
                >
                    <div className="flex items-center justify-center space-x-2">
                        <ICONS.briefcase className="w-5 h-5" />
                        <span>Seller Profile</span>
        </div>
            </button>
        </div>

            {/* Profile Content Based on Mode */}
            {mode === 'buyer' ? (
                <BuyerProfile 
                    currentUser={currentUser}
                    buyingTrades={buyingTrades}
                    completedBuyingTrades={completedBuyingTrades}
                    givenReviews={givenReviews}
                    balances={balances}
                    onWithdraw={() => setIsWithdrawModalOpen(true)}
                />
            ) : (
                <SellerProfile 
                    currentUser={currentUser}
                    sellingTrades={sellingTrades}
                    completedSellingTrades={completedSellingTrades}
                    receivedReviews={receivedReviews}
                    onAddService={() => handleOpenServiceModal()}
                    onEditService={handleOpenServiceModal}
                    onDeleteService={handleDeleteService}
                    balances={balances}
                    onWithdraw={() => setIsWithdrawModalOpen(true)}
                />
            )}
            </>
            )}
         </div>
    );
};

export const DisputeRoomScreen: React.FC<ScreenProps> = ({ setCurrentView, selectedTradeId, currentUser }) => {
    const { trades, addDisputeMessage } = useTrades();
    const { getUserById } = useUsers();
    const trade = trades.find(t => t.id === selectedTradeId);
    const [message, setMessage] = useState('');
    const [aiSuggestion, setAiSuggestion] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const handleBack = () => setCurrentView('chats');
        if (tg?.BackButton) {
            tg.BackButton.show();
            tg.BackButton.onClick(handleBack);
        }
        return () => {
            if (tg?.BackButton) {
                tg.BackButton.offClick(handleBack);
                tg.BackButton.hide();
            }
        };
    }, [setCurrentView]);

    const filteredDisputeMessages = useMemo(() => {
        if (!trade?.disputeMessages) return [];
        if (!searchQuery.trim()) return trade.disputeMessages;
        return trade.disputeMessages.filter(msg =>
            msg.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [trade?.disputeMessages, searchQuery]);

    const formatPrompt = (trade: Trade): string => {
        const chatHistoryString = trade.messages
            .map(m => `${m.senderId === 'system' ? 'SYSTEM' : (m.senderId === trade.buyer.id ? 'Buyer' : 'Seller')}: ${m.content}`)
            .join('\n');
        const disputeMessagesString = (trade.disputeMessages || [])
            .map(m => `${m.senderId === trade.buyer.id ? 'Buyer' : 'Seller'}: ${m.content}`)
            .join('\n');

        return `You are an impartial AI mediator for an online escrow service. Your role is to resolve a dispute between a buyer and a seller. Analyze the following trade details and chat history, then provide a fair resolution suggestion.

Trade Description: ${trade.description}
Amount: ${trade.amount} ${trade.currency}

Original Chat History:
${chatHistoryString}

Dispute Messages & Evidence:
${disputeMessagesString}

Based on this information, provide a clear, concise, and impartial suggestion on how to resolve this dispute. Explain your reasoning in a neutral tone. Start your response with "AI Mediator Suggestion:".`;
    };

    const getAiSuggestion = async () => {
        if (!trade) return;
        setIsLoading(true);
        setAiSuggestion('');
        try {
            const prompt = formatPrompt(trade);
            // AI suggestion temporarily disabled
            const text = "AI mediation is currently unavailable. Please resolve disputes through direct communication.";
            setAiSuggestion(text);
            const aiMessage: Message = {
                id: `dm${Date.now()}`,
                senderId: 'admin',
                type: MessageType.SYSTEM,
                content: text,
                timestamp: new Date()
            };
            addDisputeMessage(trade.id, aiMessage);
        } catch (error) {
            console.error("Gemini API Error:", error);
            setAiSuggestion("Error fetching suggestion. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const sendMessage = () => {
        if (!message.trim() || !trade) return;
        const newMessage: Message = {
            id: `dm${Date.now()}`,
            senderId: currentUser.id,
            type: MessageType.EVIDENCE,
            content: message,
            timestamp: new Date(),
        };
        addDisputeMessage(trade.id, newMessage);
        setMessage('');
        tg?.HapticFeedback.impactOccurred('light');
    };

    if (!trade) return <div className="p-4 text-white">Trade not found. <button onClick={() => setCurrentView('home')}>Go Home</button></div>;

    const otherParty = trade.buyer.id === currentUser.id ? trade.seller : trade.buyer;

    return (
        <div className="flex flex-col h-screen bg-background text-white">
            <div className="bg-surface/80 backdrop-blur-lg p-3 flex items-center justify-between border-b border-border-color sticky top-0 z-10">
                {isSearching ? (
                     <div className="flex items-center space-x-2 flex-grow">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search dispute..."
                            className="flex-grow bg-background p-2 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary w-full"
                            autoFocus
                        />
                        <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="text-text-body p-2">
                            <ICONS.x className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center space-x-3">
                             <Avatar src={otherParty.avatarUrl} name={otherParty.username} className="w-10 h-10" />
                            <div>
                                <p className="font-bold">Dispute with {otherParty.username}</p>
                                <p className="text-xs text-text-body">{trade.description}</p>
                            </div>
                        </div>
                         <div className="flex items-center space-x-2">
                             <StatusBadge status={trade.status} />
                             <button onClick={() => setIsSearching(true)} className="text-text-body p-2">
                                <ICONS.search className="w-5 h-5" />
                             </button>
                        </div>
                    </>
                )}
            </div>

             <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                <div className="bg-surface border border-border-color p-4 rounded-xl">
                    <h3 className="font-bold mb-2 flex items-center"><Avatar src={adminUser.avatarUrl} name={adminUser.username} className="w-6 h-6 mr-2" />AI Mediator</h3>
                    {isLoading ? <p className="text-text-body animate-pulse">Analyzing dispute...</p> : 
                    !aiSuggestion && <button onClick={getAiSuggestion} className="w-full bg-primary/20 text-primary font-bold py-2 rounded-lg text-sm border border-primary/50 hover:bg-primary/30">Ask for AI Suggestion</button>}
                    {aiSuggestion && <p className="text-sm text-text-body whitespace-pre-wrap">{aiSuggestion}</p>}
                </div>

                {filteredDisputeMessages.map(msg => {
                    if (msg.type === MessageType.SYSTEM) {
                        return <div key={msg.id} className="text-center text-xs text-text-body my-2 p-2 bg-yellow-900/50 rounded-lg">-- {highlightText(msg.content, searchQuery)} --</div>;
                    }
                    const isMe = msg.senderId === currentUser.id;
                    const user = getUserById(msg.senderId) || (isMe ? currentUser : otherParty);
                    const hasMedia = !!msg.media;
                    const hasContent = msg.content && msg.content.trim().length > 0;

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex flex-col max-w-xs md:max-w-md rounded-2xl ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-surface text-white rounded-bl-none'} ${hasMedia && !hasContent ? 'p-1.5' : 'p-3'}`}>
                                <div className="flex items-center mb-1">
                                    <Avatar src={user.avatarUrl} name={user.username} className="w-5 h-5 mr-2" />
                                    <p className="font-bold text-xs">{user.username}</p>
                                </div>

                                {hasMedia && msg.media?.type === 'image' && (
                                    <img src={msg.media.url} alt="attachment" className="rounded-lg my-1 max-h-60 w-full object-cover" />
                                )}
                                {hasMedia && msg.media?.type === 'video' && (
                                    <video src={msg.media.url} controls className="rounded-lg my-1 max-h-60 w-full" />
                                )}
                                
                                {hasContent && <p className="break-words text-sm">{highlightText(msg.content, searchQuery)}</p>}

                                <p className={`text-xs opacity-70 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    );
                })}
                {filteredDisputeMessages.length === 0 && searchQuery && (
                    <div className="text-center text-text-body mt-20">
                        <ICONS.search className="w-16 h-16 mx-auto text-gray-600 mb-4"/>
                        <h2 className="text-xl font-semibold">No Results Found</h2>
                        <p>No dispute messages match your search.</p>
                    </div>
                )}
            </div>
            
             <div className="bg-surface p-3 mt-auto">
                <div className="flex items-center space-x-2">
                    <input 
                        type="text" 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Submit evidence..." 
                        className="flex-grow bg-background p-3 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button onClick={sendMessage} className="bg-primary text-white p-3 rounded-full">
                        <ICONS.send className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export const UserProfileScreen: React.FC<ScreenProps> = ({ setCurrentView, selectedUserId, setSelectedUserId, setCreatingNew, currentUser, handleStartTradeFromService }) => {
    const { trades } = useTrades();
    const { getUserById } = useUsers();
    const { mode } = useMode();
    const user = getUserById(selectedUserId);
    const [userServices, setUserServices] = useState<Service[] | undefined>(user?.services);

    useEffect(() => {
        const handleBack = () => setCurrentView('explore');
        if (tg?.BackButton) {
            tg.BackButton.show();
            tg.BackButton.onClick(handleBack);
        }
        return () => {
            if (tg?.BackButton) {
                tg.BackButton.offClick(handleBack);
                tg.BackButton.hide();
            }
        };
    }, [setCurrentView]);
    
    const receivedReviews = useMemo(() => {
        if (!user) return [];
        return trades
            .filter(trade => trade.status === EscrowStatus.COMPLETED)
            .map(trade => {
                let review: Review | undefined;
                if (trade.seller.id === user.id) review = trade.buyerReview;
                if (trade.buyer.id === user.id) review = trade.sellerReview;
                return review ? { review, trade } : null;
            })
            .filter((item): item is { review: Review; trade: Trade } => item !== null)
            .sort((a, b) => b.review.timestamp.getTime() - a.review.timestamp.getTime());
    }, [trades, user]);


    if (!user) {
        return <div className="p-4 text-white">User not found. <button onClick={() => setCurrentView('home')}>Go Home</button></div>;
    }

    const totalTrades = trades.filter(t => t.buyer.id === user.id || t.seller.id === user.id).length;
    const completedTrades = trades.filter(t => (t.buyer.id === user.id || t.seller.id === user.id) && t.status === EscrowStatus.COMPLETED).length;
    const completionRate = totalTrades > 0 ? Math.round((completedTrades / totalTrades) * 100) : 0;

    const handleStartTrade = () => {
        if (user) {
            setSelectedUserId(user.id);
            setCreatingNew(true);
        }
    }

    const handleStartTradeForService = (service: Service) => {
        if (user && handleStartTradeFromService) {
            handleStartTradeFromService(service, user.id);
        }
    }
    
    const handleTradeClick = (tradeId: string) => {
        setCurrentView('tradeRoom', tradeId);
    };

    // Fetch latest services for this user (ensures approved state is fresh)
    useEffect(() => {
        let cancelled = false;
        const fetchUserServices = async () => {
            try {
                                const resp = await fetch(API_ENDPOINTS.servicesByUser(user.id));
                const json = await resp.json();
                const list: any[] = Array.isArray(json.services) ? json.services : [];
                const mapped: Service[] = list
                    .filter(s => s.approved === true && s.rejected !== true) // Show only approved services
                    .map(s => ({
                        id: String(s.id),
                        title: s.title,
                        description: s.description,
                        price: Number(s.price),
                        currency: s.currency,
                        category: s.category,
                        approved: Boolean(s.approved),
                        rejected: Boolean(s.rejected),
                    }));
                if (!cancelled) setUserServices(mapped);
            } catch {
                // ignore
            }
        };
        if (user?.id) fetchUserServices();
        return () => { cancelled = true; };
    }, [user?.id]);

    return (
        <div className="flex flex-col h-screen bg-background text-white">
            <div className="bg-surface/80 backdrop-blur-lg p-3 flex items-center border-b border-border-color sticky top-0 z-10">
                <h2 className="font-bold text-xl flex-grow text-center">{user.username}'s Profile</h2>
            </div>
            <div className="flex-grow overflow-y-auto">
                <div className="p-4">
                    <div className="flex flex-col items-center">
                        <div className="w-full h-32 rounded-2xl bg-gradient-primary relative mb-[-48px]"></div>
                        <Avatar src={user.avatarUrl} name={user.username} className="w-24 h-24 mb-4 border-4 border-background" />

                        <div className="flex items-center space-x-2">
                            <h1 className="text-3xl font-bold">{user.username}</h1>
                            {user.isVerified && <ICONS.verified className="w-6 h-6 text-primary" />}
                        </div>
                        <div className="flex items-center space-x-2 mt-2 bg-surface px-4 py-2 rounded-full border border-border-color">
                            <StarDisplay rating={user.rating} className="text-xl" />
                            <span className="text-text-body">{receivedReviews.length} reviews</span>
                        </div>
                        <div className="mt-3 px-3 py-1 rounded-full text-xs border border-primary/40 bg-primary/10 text-primary">
                            {getSellerTierLabel(user.rating)}
                        </div>
                    </div>

                    <div className="w-full bg-surface border border-border-color rounded-2xl p-4 mt-8 grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <span className="text-text-body text-sm">Total Trades</span>
                            <span className="font-semibold block text-xl">{totalTrades}</span>
                        </div>
                        <div className="text-center">
                            <span className="text-text-body text-sm">Completed</span>
                            <span className="font-semibold block text-xl">{completedTrades}</span>
                        </div>
                        <div className="text-center">
                            <span className="text-text-body text-sm">Completion Rate</span>
                            <span className="font-semibold text-success block text-xl">{completionRate}%</span>
                        </div>
                    </div>
                    
                    <h2 className="text-xl font-bold self-start mt-8 mb-4">Services Offered</h2>
                    <div className="w-full space-y-3">
                        {(userServices && userServices.length > 0) ? userServices.map(service => (
                            <div key={service.id} className="bg-surface p-4 rounded-2xl border border-border-color">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-white">{service.title}</h3>
                                            {service.approved === true && (
                                                <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-500/40">
                                                    Approved
                                                </span>
                                            )}
                                            {service.approved === false && service.rejected === false && (
                                                <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                                                    Pending Review
                                                </span>
                                            )}
                                            {service.rejected === true && (
                                                <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                                                    Rejected
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-text-body mt-1">{service.description}</p>
                                    </div>
                                    <p className="font-bold text-primary whitespace-nowrap pl-4">{service.price} {service.currency}</p>
                                </div>
                                {service.approved === true ? (
                                    mode === 'buyer' ? (
                                <button onClick={() => handleStartTradeForService(service)} className="w-full mt-4 bg-primary/20 text-primary font-bold py-2 rounded-lg text-sm border border-primary/50 hover:bg-primary/30">
                                    Start Trade for this Service
                                </button>
                                    ) : (
                                        <div className="w-full mt-4 bg-green-600/20 text-green-400 font-bold py-2 rounded-lg text-sm border border-green-600/50 text-center">
                                            Service Available for Purchase
                                        </div>
                                    )
                                ) : (
                                    <div className="w-full mt-4 bg-gray-600/20 text-gray-400 font-bold py-2 rounded-lg text-sm border border-gray-600/50 text-center">
                                        {service.rejected ? 'Service Rejected' : 'Awaiting Admin Approval'}
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="text-center text-text-body p-4 bg-surface rounded-2xl">
                                <p>{user.username} is not offering any services yet.</p>
                            </div>
                        )}
                    </div>


                    <h2 className="text-xl font-bold self-start mt-8 mb-2">Buyer Feedback</h2>
                    <p className="text-sm text-text-body mb-4">Recent verified reviews from completed orders.</p>
                    <div className="w-full space-y-3">
                         {receivedReviews.length > 0 ? receivedReviews.map(({ review, trade }) => (
                            <ReviewCard
                                key={`${trade.id}-${review.reviewerId}`}
                                review={review}
                                reviewer={getUserById(review.reviewerId)}
                                trade={trade}
                                onViewTrade={handleTradeClick}
                            />
                         )) : (
                             <div className="text-center text-text-body mt-8 p-4 bg-surface rounded-2xl">
                                <p>No feedback for this user yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
             {mode === 'buyer' && (
             <div className="p-4 bg-surface/80 backdrop-blur-lg border-t border-border-color">
                <button onClick={handleStartTrade} className="w-full bg-gradient-primary text-white font-bold py-4 rounded-2xl shadow-glow-primary">Start Generic Trade with {user.username}</button>
            </div>
            )}
        </div>
    );
};

export const SearchScreen: React.FC<ScreenProps> = ({ setCurrentView, currentUser }) => {
    const { trades } = useTrades();
    const { allUsers } = useUsers();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const handleBack = () => setCurrentView('home');
        if (tg?.BackButton) {
            tg.BackButton.show();
            tg.BackButton.onClick(handleBack);
        }
        return () => {
            if (tg?.BackButton) {
                tg.BackButton.offClick(handleBack);
                tg.BackButton.hide();
            }
        };
    }, [setCurrentView]);

    const userTrades = useMemo(() => {
        return trades.filter(t => t.buyer.id === currentUser.id || t.seller.id === currentUser.id);
    }, [trades, currentUser.id]);

    const filteredTrades = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const lowercasedQuery = searchQuery.toLowerCase();
        return userTrades.filter(trade => {
            const otherParty = trade.buyer.id === currentUser.id ? trade.seller : trade.buyer;
            return (
                trade.description.toLowerCase().includes(lowercasedQuery) ||
                otherParty.username.toLowerCase().includes(lowercasedQuery)
            );
        });
    }, [searchQuery, userTrades, currentUser.id]);

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const lowercasedQuery = searchQuery.toLowerCase();
        return allUsers.filter(user =>
            user.id !== currentUser.id &&
            user.id !== 'admin' &&
            user.username.toLowerCase().includes(lowercasedQuery)
        );
    }, [searchQuery, allUsers, currentUser.id]);

    const handleTradeClick = (trade: Trade) => {
        if (trade.status === EscrowStatus.DISPUTE) {
            setCurrentView('disputeRoom', trade.id);
        } else {
            setCurrentView('tradeRoom', trade.id);
        }
    };
    
    const handleUserClick = (userId: string) => {
        setCurrentView('userProfile', null, userId);
    };

    return (
        <div className="flex flex-col h-screen bg-background text-white">
            <div className="p-4 sticky top-0 bg-background z-10">
                <div className="relative">
                    <ICONS.search className="absolute top-1/2 left-4 -translate-y-1/2 text-text-body w-5 h-5" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search for trades or users..."
                        className="w-full bg-surface pl-11 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-primary focus:outline-none border border-border-color"
                        autoFocus
                    />
                </div>
            </div>

            <div className="flex-grow overflow-y-auto px-4">
                {searchQuery.trim() === '' ? (
                    <div className="text-center text-text-body mt-20">
                        <ICONS.search className="w-16 h-16 mx-auto text-gray-600 mb-4"/>
                        <p>Search for your trades or find a specific user.</p>
                    </div>
                ) : (
                    <>
                        {filteredTrades.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-xl font-bold mb-4">Trades</h2>
                                <div className="space-y-3">
                                    {filteredTrades.map(trade => {
                                        const otherParty = trade.buyer.id === currentUser.id ? trade.seller : trade.buyer;
                                        return (
                                            <div key={trade.id} onClick={() => handleTradeClick(trade)} className="bg-surface p-3 rounded-2xl flex items-center justify-between cursor-pointer border border-border-color hover:border-primary transition-colors">
                                                <div className="flex items-center space-x-3 overflow-hidden">
                                                    <Avatar src={otherParty.avatarUrl} name={otherParty.username} className="w-12 h-12" />
                                                    <div className="overflow-hidden">
                                                        <p className="font-semibold truncate">{highlightText(trade.description, searchQuery)}</p>
                                                        <p className="text-sm text-text-body">vs. {highlightText(otherParty.username, searchQuery)}</p>
                                                    </div>
                                                </div>
                                                <StatusBadge status={trade.status} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {filteredUsers.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold mb-4">Users</h2>
                                <div className="space-y-3">
                                    {filteredUsers.map(user => (
                                        <div key={user.id} onClick={() => handleUserClick(user.id)} className="bg-surface p-3 rounded-2xl flex items-center justify-between cursor-pointer border border-border-color hover:border-primary transition-colors">
                                            <div className="flex items-center space-x-3">
                                                <Avatar src={user.avatarUrl} name={user.username} className="w-12 h-12" />
                                                <div>
                                                    <p className="font-semibold">{highlightText(user.username, searchQuery)}</p>
                                                    <div className="flex items-center space-x-1">
                                                        <StarDisplay rating={user.rating} className="text-xs"/>
                                                        <span className="text-xs text-text-body">({(Number(user.rating) || 0).toFixed(1)})</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {user.isVerified && <ICONS.verified className="w-5 h-5 text-primary mb-1 ml-auto"/>}
                                                <span className="text-xs text-text-body">View Profile &rarr;</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {filteredTrades.length === 0 && filteredUsers.length === 0 && (
                             <div className="text-center text-text-body mt-20">
                                <ICONS.search className="w-16 h-16 mx-auto text-gray-600 mb-4"/>
                                <h2 className="text-xl font-semibold">No Results Found</h2>
                                <p>Try searching for something else.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
