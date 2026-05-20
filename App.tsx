import React, { useState, useEffect } from 'react';
import { BottomNav, Toast, Header } from './components';
import { 
    WelcomeScreen, 
    HomeScreen, 
    ChatsScreen, 
    ExploreScreen,
    ProfileScreen, 
    CreateEscrowScreen, 
    DepositScreen,
    TradeRoomScreen,
    DisputeRoomScreen,
    UserProfileScreen,
    SearchScreen,
} from './screens';
import { useUsers } from './UserContext';
import { useMode } from './ModeContext';
import { Currency, Service } from './types';
// FIX: Imported the `ICONS` object from `./constants` to resolve the 'Cannot find name 'ICONS'' error.
import { ICONS } from './constants';

// Fix for Telegram WebApp types not being available on window object.
declare global {
  interface Window {
    Telegram: any;
  }
}

export type View = 'welcome' | 'home' | 'chats' | 'explore' | 'profile' | 'createEscrow' | 'deposit' | 'tradeRoom' | 'disputeRoom' | 'userProfile' | 'search';

const App: React.FC = () => {
  const SELLER_PICKER_FLAG = 'escrowx-seller-picker';
  const [currentView, setCurrentView] = useState<View>('welcome');
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isCreatingNew, setCreatingNew] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [prefillTrade, setPrefillTrade] = useState<{description: string, amount: string, currency: Currency} | null>(null);
  const { currentUser } = useUsers();
  const { mode } = useMode();

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
  }, []);

  const showToast = (message: string) => {
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 3000); 
  }
  
  const navigateTo = (view: View, tradeId: string | null = null, userId: string | null = null) => {
    const inSellerPicker = view === 'explore' && sessionStorage.getItem(SELLER_PICKER_FLAG) === '1';
    setCurrentView(view);
    setSelectedTradeId(tradeId);
    setSelectedUserId(userId);
    if(view !== 'createEscrow' && view !== 'deposit' && !inSellerPicker) {
        setCreatingNew(false);
    }
     if (view !== 'createEscrow') {
        setPrefillTrade(null);
    }
  };

  const handleStartTradeFromService = (service: Service, userId: string) => {
    setPrefillTrade({
        description: `${service.title} - ${service.description}`,
        amount: String(service.price),
        currency: service.currency,
    });
    setSelectedUserId(userId);
    setCreatingNew(true);
  };

  useEffect(() => {
    const inSellerPicker = currentView === 'explore' && sessionStorage.getItem(SELLER_PICKER_FLAG) === '1';
    // Only navigate to the create screen if we are in "creating" mode
    // AND we are not already on a screen that's part of that flow.
    // AND we are in buyer mode (sellers cannot create escrows)
    // This prevents a navigation loop when moving from CreateEscrowScreen to DepositScreen.
    if (isCreatingNew && currentView !== 'createEscrow' && currentView !== 'deposit' && !inSellerPicker && mode === 'buyer') {
      navigateTo('createEscrow', null, selectedUserId);
    } 
    // This handles the user clicking the "close" button on the create screen.
    else if (currentView === 'createEscrow' && !isCreatingNew) {
      navigateTo('home');
    }
    // If seller tries to create escrow, redirect to profile to add services instead
    else if (isCreatingNew && mode === 'seller') {
      setCreatingNew(false);
      navigateTo('profile');
    }
  }, [isCreatingNew, selectedUserId, currentView, mode]);


  const renderView = () => {
    if (!currentUser) {
        return <div className="min-h-screen bg-background flex items-center justify-center text-white">Loading App...</div>;
    }
    const screenProps = { 
        setCurrentView: navigateTo, 
        setSelectedTradeId,
        setSelectedUserId,
        setCreatingNew,
        selectedTradeId,
        selectedUserId,
        showToast,
        currentUser,
        handleStartTradeFromService,
        prefillTrade,
    };
      
    switch (currentView) {
      case 'welcome':
        return <WelcomeScreen setCurrentView={navigateTo} />;
      case 'home':
        return <HomeScreen {...screenProps} />;
      case 'chats':
        return <ChatsScreen {...screenProps} />;
      case 'explore':
        return <ExploreScreen {...screenProps} />;
      case 'profile':
        return <ProfileScreen {...screenProps} />;
      case 'createEscrow':
        return <CreateEscrowScreen {...screenProps} />;
      case 'deposit':
        return <DepositScreen {...screenProps} />;
      case 'tradeRoom':
         return <TradeRoomScreen {...screenProps} />;
      case 'disputeRoom':
         return <DisputeRoomScreen {...screenProps} />;
      case 'userProfile':
        return <UserProfileScreen {...screenProps} />;
      case 'search':
        return <SearchScreen {...screenProps} />;
      default:
        return <HomeScreen {...screenProps} />;
    }
  };
  
  const showNav = !['welcome', 'createEscrow', 'deposit'].includes(currentView);
  const showHeader = ['home', 'chats', 'explore', 'profile'].includes(currentView);
  
  const getActiveTab = (): View => {
      switch (currentView) {
        case 'search':
            return 'home';
        case 'tradeRoom':
        case 'disputeRoom':
            return 'chats';
        case 'userProfile':
            return 'explore';
        default:
            return currentView;
      }
  }

  const getHeaderTitle = (): string => {
      switch(currentView) {
          case 'home': return 'Home';
          case 'chats': return 'My Chats';
          case 'explore': return 'Explore';
          case 'profile': return 'My Profile';
          default: return 'EscrowX';
      }
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-dark font-sans flex flex-col overflow-x-hidden pt-[env(safe-area-inset-top)]">
      <Toast message={toastMessage} />
      {showHeader && (
        <Header title={getHeaderTitle()} onNavigate={navigateTo}>
            {currentView === 'home' && (
                 <button onClick={() => navigateTo('search')} className="bg-surface p-3 rounded-full hover:bg-surface-alt transition-colors">
                    <ICONS.search className="w-6 h-6 text-text-body"/>
                 </button>
            )}
        </Header>
      )}
      <div className={`flex-grow ${showNav ? 'pb-[calc(6rem+env(safe-area-inset-bottom))]' : ''} ${!showHeader ? 'h-[100dvh]' : ''} overflow-y-auto`}>
        {renderView()}
      </div>
      {showNav && <BottomNav activeView={getActiveTab()} setActiveView={navigateTo} setCreatingNew={setCreatingNew} />}
    </div>
  );
};

export default App;