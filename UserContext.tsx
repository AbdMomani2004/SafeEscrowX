import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User, Service, Currency } from './types';
import { mockUsers, adminUser } from './data';
import { API_ENDPOINTS, BACKEND_URL } from './config/api';

// Fix for Telegram WebApp types not being available on window object.
declare global {
  interface Window {
    Telegram: any;
  }
}

const tg = window.Telegram?.WebApp;

interface UserContextType {
  currentUser: User | null;
  getUserById: (id: string | null) => User | undefined;
  allUsers: User[];
  updateCurrentUser: (updatedUser: User) => void;
  refreshUsers: () => Promise<void>;
  updateUserModeration: (userId: string, updates: { banned?: boolean; verified?: boolean }) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const devUser: User = {
    id: '7685364015', // Match with backend user ID
    username: 'Satoshi',
    avatarUrl: 'https://picsum.photos/seed/user1/100/100',
    rating: 0.0,
    isVerified: true,
    services: [
        { id: 's3', title: 'Blockchain Consultation', description: '1-hour consultation call about blockchain technology.', price: 250, currency: Currency.USDT }
    ]
};

const localDemoUsers: User[] = [
    {
        id: 'demo-seller-1',
        username: 'PixelForge',
        avatarUrl: 'https://api.dicebear.com/8.x/initials/svg?seed=PixelForge',
        rating: 4.9,
        isVerified: true,
        services: [
            { id: 'demo-svc-1', title: 'UI/UX Mobile Design', description: 'High-converting mobile UI kit and full flow design.', price: 120, currency: Currency.USDT, approved: true },
        ],
    },
    {
        id: 'demo-seller-2',
        username: 'ChainCraft',
        avatarUrl: 'https://api.dicebear.com/8.x/initials/svg?seed=ChainCraft',
        rating: 4.7,
        isVerified: true,
        services: [
            { id: 'demo-svc-2', title: 'Smart Contract Review', description: 'Fast review of escrow and payment contract logic.', price: 180, currency: Currency.USDT, approved: true },
        ],
    },
];

const shouldUseLocalDemoUsers = (): boolean => {
    return BACKEND_URL.includes('localhost') || BACKEND_URL.includes('127.0.0.1');
};


export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isInitializing, setIsInitializing] = useState(true);
    const isTruthyFlag = (value: any): boolean => value === true || value === 1 || value === '1';

    const mapBackendUserToUser = (u: any): User => {
        return {
            id: String(u.id),
            username: u.username || u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || `User${u.id}`,
            avatarUrl: u.avatar_url || u.avatarUrl || u.photo_url || `https://api.dicebear.com/8.x/initials/svg?seed=${u.username || u.id}`,
            rating: Number(u.rating || 0),
            isVerified: Boolean((u as any).isVerified ?? (u as any).verified ?? (u as any).is_verified ?? false),
            // The frontend User type supports isVerified; carry banned flag if present in backend
            ...( (u as any).isBanned !== undefined || (u as any).banned !== undefined || (u as any).is_banned !== undefined
                ? { isBanned: Boolean((u as any).isBanned ?? (u as any).banned ?? (u as any).is_banned ?? false) }
                : {}),
            services: Array.isArray(u.services) ? u.services : [],
        } as User & { isBanned?: boolean };
    };

    const refreshUsers = async () => {
        try {
            const resp = await fetch(API_ENDPOINTS.users);
            const json = await resp.json();
            const directoryUsersRaw: any[] = Array.isArray(json.users) ? json.users : [];
            const directoryUsers: User[] = directoryUsersRaw.map(mapBackendUserToUser);
            const hasRealDirectorySellers = directoryUsers.some(u => u.id !== currentUser?.id && u.id !== 'admin');
            const effectiveMockUsers = shouldUseLocalDemoUsers() && !hasRealDirectorySellers ? localDemoUsers : mockUsers;
            const uniqueUsers = [currentUser, adminUser, ...effectiveMockUsers, ...directoryUsers].reduce((acc, current) => {
                if (!current) return acc;
                if (!acc.find(item => item.id === current.id)) {
                    acc.push(current);
                }
                return acc;
            }, [] as User[]);
            setAllUsers(uniqueUsers);
        } catch (e) {
            // keep existing users on failure
        }
    };

    const updateUserModeration = (userId: string, updates: { banned?: boolean; verified?: boolean }) => {
        setAllUsers(prev => prev.map(u => {
            if (u.id !== userId) return u;
            const next: any = { ...u };
            if (typeof updates.verified === 'boolean') next.isVerified = updates.verified;
            if (typeof updates.banned === 'boolean') next.isBanned = updates.banned;
            return next as User;
        }));
    };

    useEffect(() => {
        const bootstrap = async () => {
            let user: User;
            const initData = tg?.initData;
            const tgUserUnsafe = tg?.initDataUnsafe?.user;

            console.log('🔍 Telegram WebApp Data:', { 
                initData: !!initData, 
                tgUserUnsafe,
                tgVersion: tg?.version,
                tgPlatform: tg?.platform,
                tgColorScheme: tg?.colorScheme
            });

            if (initData && tgUserUnsafe) {
                try {
                    console.log('📡 Attempting backend verification...');
                    const resp = await fetch(API_ENDPOINTS.verify, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ initData }),
                    });
                    const json = await resp.json();
                    console.log('📡 Backend response:', json);
                    
                    if (json.ok && json.user) {
                        const u = json.user;
                        user = {
                            id: String(u.id),
                            username: u.username || `${u.first_name || ''} ${u.last_name || ''}`.trim() || `User${u.id}`,
                            avatarUrl: u.photo_url || `https://api.dicebear.com/8.x/initials/svg?seed=${u.first_name || u.id}`,
                            rating: 0.0,
                            isVerified: Boolean(u.is_premium),
                            services: [],
                        };
                        console.log('✅ User created from backend:', user);
                    } else {
                        console.log('⚠️ Backend verification failed, using unsafe data');
                        // fallback to unsafe but present user (shouldn't happen in prod if verify fails)
                        const u = tgUserUnsafe;
                        user = {
                            id: String(u.id),
                            username: u.username || `${u.first_name || ''} ${u.last_name || ''}`.trim() || `User${u.id}`,
                            avatarUrl: u.photo_url || `https://api.dicebear.com/8.x/initials/svg?seed=${u.first_name || u.id}`,
                            rating: 0.0,
                            isVerified: Boolean(u.is_premium),
                            services: [],
                        };
                        console.log('✅ User created from unsafe data:', user);
                    }
                } catch (e) {
                    console.log('❌ Backend API error:', e);
                    // fallback to dev
                    const savedUser = localStorage.getItem('escrowx-currentUser');
                    user = savedUser ? JSON.parse(savedUser) : devUser;
                    console.log('✅ User created from fallback:', user);
                }
            } else {
                console.log('⚠️ No Telegram data available, using development fallback');
                // Fallback for development outside of Telegram
                const savedUser = localStorage.getItem('escrowx-currentUser');
                user = savedUser ? JSON.parse(savedUser) : devUser;
                console.log('✅ User created from dev fallback:', user);
            }

            setCurrentUser(user);

            // Upsert this user to backend directory (so others can discover)
            try {
                console.log('📤 Upserting user to backend...');
                await fetch(API_ENDPOINTS.usersUpsert, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user }),
                });
                console.log('✅ User upserted successfully');
            } catch (e) {
                console.log('⚠️ Failed to upsert user to backend:', e);
                // ignore network errors; app still works locally
            }

            // Fetch global users directory and merge with admin + current, then hydrate services
            try {
                console.log('📥 Fetching users directory...');
                const resp = await fetch(API_ENDPOINTS.users);
                const json = await resp.json();
                const directoryUsersRaw: any[] = Array.isArray(json.users) ? json.users : [];
                const directoryUsers: User[] = directoryUsersRaw.map(mapBackendUserToUser);

                // Fetch approved services and attach to users
                let servicesByUserId: Record<string, User['services']> = {};
                try {
                    console.log('📥 Fetching services directory...');
                    const servicesResp = await fetch(API_ENDPOINTS.services);
                    const servicesJson = await servicesResp.json();
                    const allServices = Array.isArray(servicesJson.services) ? servicesJson.services : [];
                allServices
                    .filter((s: any) => s && s.user_id && isTruthyFlag(s.approved) && !isTruthyFlag(s.rejected))
                    .forEach((s: any) => {
                            const mapped = {
                                id: String(s.id),
                                title: s.title,
                                description: s.description,
                                price: Number(s.price),
                                currency: s.currency,
                                category: s.category,
                                approved: Boolean(s.approved),
                                rejected: Boolean(s.rejected),
                            };
                            const uid = String(s.user_id);
                            if (!servicesByUserId[uid]) servicesByUserId[uid] = [];
                            servicesByUserId[uid]!.push(mapped as any);
                        });
                } catch (svcErr) {
                    console.log('⚠️ Failed to fetch services directory:', svcErr);
                }

                const hasRealDirectorySellers = directoryUsers.some(u => u.id !== user.id && u.id !== 'admin');
                const effectiveMockUsers = shouldUseLocalDemoUsers() && !hasRealDirectorySellers ? localDemoUsers : mockUsers;
                const uniqueUsers = [user, adminUser, ...effectiveMockUsers, ...directoryUsers].reduce((acc, current) => {
                    const existing = acc.find(item => item.id === current.id);
                    if (!existing) {
                        const attachedServices = servicesByUserId[current.id] || current.services || [];
                        acc.push({ ...current, services: attachedServices });
                    }
                    return acc;
                }, [] as User[]);

                setAllUsers(uniqueUsers);
                console.log('✅ Users + services loaded:', uniqueUsers.length, 'users');

                // Lightweight one-time notification for newly approved services for the current user
                try {
                    const approvedKey = `escrowx-approved-services-${user.id}`;
                    const storedRaw = localStorage.getItem(approvedKey);
                    const storedIds: string[] = storedRaw ? JSON.parse(storedRaw) : [];
                    const myApproved = (servicesByUserId[user.id] || []).map(s => String(s.id));
                    const newlyApproved = myApproved.filter(id => !storedIds.includes(id));
                    
                    if (newlyApproved.length > 0) {
                        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
                        const msg = newlyApproved.length === 1 ? 'Your service was approved and is now visible to buyers.' : `${newlyApproved.length} of your services were approved and are now visible.`;
                        // Prefer Telegram alert if available, fallback to browser alert
                        // @ts-ignore
                        if (window.Telegram?.WebApp?.showAlert) {
                            // @ts-ignore
                            window.Telegram.WebApp.showAlert(msg);
                        } else {
                            alert(msg);
                        }
                        // Update stored IDs to include the newly approved ones
                        localStorage.setItem(approvedKey, JSON.stringify([...storedIds, ...newlyApproved]));
                    } else if (storedIds.length === 0 && myApproved.length > 0) {
                        // First time loading - store all current approved services without showing notification
                        localStorage.setItem(approvedKey, JSON.stringify(myApproved));
                    }
                } catch (notifyErr) {
                    // ignore notification errors
                }
            } catch (e) {
                console.log('⚠️ Failed to fetch users directory:', e);
                const effectiveMockUsers = shouldUseLocalDemoUsers() ? localDemoUsers : mockUsers;
                const uniqueUsersFallback = [user, adminUser, ...effectiveMockUsers].reduce((acc, current) => {
                    if (!acc.find(item => item.id === current.id)) {
                        acc.push(current);
                    }
                    return acc;
                }, [] as User[]);
                setAllUsers(uniqueUsersFallback);
                console.log('✅ Using fallback users directory:', uniqueUsersFallback.length, 'users');
            }
            
            console.log('🎉 User initialization complete!');
            setIsInitializing(false);
        };

        bootstrap();
    }, []);

    // Realtime polling to hydrate services and surface approvals without refresh
    useEffect(() => {
        if (!currentUser) return;
        let timer: any;
        const approvedKey = 'escrowx-approved-services';

        const tick = async () => {
            try {
                const servicesResp = await fetch(API_ENDPOINTS.services);
                const servicesJson = await servicesResp.json();
                const allServices = Array.isArray(servicesJson.services) ? servicesJson.services : [];
                const map: Record<string, User['services']> = {};
                allServices
                    .filter((s: any) => s && s.user_id && isTruthyFlag(s.approved) && !isTruthyFlag(s.rejected))
                    .forEach((s: any) => {
                        const uid = String(s.user_id);
                        const svc = {
                            id: String(s.id),
                            title: s.title,
                            description: s.description,
                            price: Number(s.price),
                            currency: s.currency,
                            category: s.category,
                            approved: Boolean(s.approved),
                            rejected: Boolean(s.rejected),
                        } as any;
                        if (!map[uid]) map[uid] = [];
                        map[uid]!.push(svc);
                    });

                setAllUsers(prev => prev.map(u => ({ ...u, services: map[u.id] || u.services || [] })));

                // Notify current user if any of their services just got approved
                try {
                    const approvedKey = `escrowx-approved-services-${currentUser.id}`;
                    const storedRaw = localStorage.getItem(approvedKey);
                    const storedIds: string[] = storedRaw ? JSON.parse(storedRaw) : [];
                    const myApproved = (map[currentUser.id] || []).map(s => String((s as any).id));
                    const newlyApproved = myApproved.filter(id => !storedIds.includes(id));
                    
                    if (newlyApproved.length > 0) {
                        try {
                            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
                        } catch (e) {
                            console.log('⚠️ HapticFeedback not supported:', e.message);
                        }
                        const msg = newlyApproved.length === 1 ? 'Your service was approved and is now visible to buyers.' : `${newlyApproved.length} of your services were approved and are now visible.`;
                        try {
                            // @ts-ignore
                            if (window.Telegram?.WebApp?.showAlert) {
                                // @ts-ignore
                                window.Telegram.WebApp.showAlert(msg);
                            } else {
                                alert(msg);
                            }
                        } catch (e) {
                            console.log('⚠️ showAlert not supported:', e.message);
                            alert(msg);
                        }
                        // Update stored IDs to include the newly approved ones
                        localStorage.setItem(approvedKey, JSON.stringify([...storedIds, ...newlyApproved]));
                    } else if (storedIds.length === 0 && myApproved.length > 0) {
                        // First time loading - store all current approved services without showing notification
                        localStorage.setItem(approvedKey, JSON.stringify(myApproved));
                    }
                } catch { /* ignore */ }
            } catch { /* ignore network errors */ }
        };

        // initial and interval
        tick();
        timer = setInterval(tick, 20000);
        return () => clearInterval(timer);
    }, [currentUser]);

    const getUserById = (id: string | null): User | undefined => {
        if (!id) return undefined;
        return allUsers.find(u => u.id === id);
    };

    const updateCurrentUser = (updatedUser: User) => {
        setCurrentUser(updatedUser);
        setAllUsers(prevUsers => {
            const updated = prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
            if (!updated.find(u => u.id === updatedUser.id)) updated.push(updatedUser);
            return updated;
        });
        localStorage.setItem('escrowx-currentUser', JSON.stringify(updatedUser));
        // push to backend directory
        fetch(API_ENDPOINTS.usersUpsert, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: updatedUser }),
        }).catch(() => {});
    };

    if (isInitializing || !currentUser) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Initializing User...</p>
                    <p className="text-sm text-text-body mt-2">Please wait while we load your profile</p>
                </div>
            </div>
        );
    }

    return (
        <UserContext.Provider value={{ currentUser, getUserById, allUsers, updateCurrentUser, refreshUsers, updateUserModeration }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUsers = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUsers must be used within a UserProvider');
    }
    return context;
};