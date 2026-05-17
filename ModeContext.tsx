import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

// Fix for Telegram WebApp types not being available on window object.
declare global {
  interface Window {
    Telegram: any;
  }
}

export type UserMode = 'buyer' | 'seller';

interface ModeContextType {
  mode: UserMode;
  toggleMode: () => void;
  setMode: (mode: UserMode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const ModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<UserMode>(() => {
    return (localStorage.getItem('escrowx-mode') as UserMode) || 'buyer';
  });

  useEffect(() => {
    localStorage.setItem('escrowx-mode', mode);
  }, [mode]);

  const toggleMode = () => {
    setModeState(prevMode => {
        const newMode = prevMode === 'buyer' ? 'seller' : 'buyer';
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
        return newMode;
    });
  };
  
  const setMode = (newMode: UserMode) => {
      if (mode !== newMode) {
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
        setModeState(newMode);
      }
  }

  return (
    <ModeContext.Provider value={{ mode, toggleMode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
};

export const useMode = () => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};