import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './AdminApp';
import { TradesProvider, NotificationProvider } from './AppContext';
import { UserProvider } from './UserContext';
import { ModeProvider } from './ModeContext';
import ErrorBoundary from './ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary name="AdminApp">
      <ModeProvider>
        <UserProvider>
          <NotificationProvider>
            <TradesProvider>
              <AdminApp />
            </TradesProvider>
          </NotificationProvider>
        </UserProvider>
      </ModeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);


