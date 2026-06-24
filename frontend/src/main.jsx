import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import App from './App.jsx';
import './index.css';
import './App.css'; // custom styles

// Helper component to pass Auth credentials to SocketProvider dynamically
function SocketAuthWrapper({ children }) {
  const { token, user } = useAuth();
  return (
    <SocketProvider token={token} user={user}>
      {children}
    </SocketProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketAuthWrapper>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </SocketAuthWrapper>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
