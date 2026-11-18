import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, setAuthToken, getAuthToken } from '../api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  quickSwitch: (role: 'ADMIN' | 'INVESTIGATOR' | 'VIEWER') => Promise<void>;
  isAdmin: boolean;
  isInvestigator: boolean;
  isViewer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getCurrentUser();
        setUser(res.user);
      } catch (err) {
        console.error('Session validation error:', err);
        setAuthToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setAuthToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  const quickSwitch = async (role: 'ADMIN' | 'INVESTIGATOR' | 'VIEWER') => {
    let email = 'admin@tracelock.sec';
    let password = 'TraceLockAdmin2026!';

    if (role === 'INVESTIGATOR') {
      email = 'investigator@tracelock.sec';
      password = 'Investigator2026!';
    } else if (role === 'VIEWER') {
      email = 'viewer@tracelock.sec';
      password = 'Viewer2026!';
    }

    await login(email, password);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isInvestigator = user?.role === 'INVESTIGATOR' || isAdmin;
  const isViewer = user?.role === 'VIEWER';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        quickSwitch,
        isAdmin,
        isInvestigator,
        isViewer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
