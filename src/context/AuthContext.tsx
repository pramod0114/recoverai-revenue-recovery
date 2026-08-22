import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  quickLoginAs: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('recoverai_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const savedToken = localStorage.getItem('recoverai_token');
      if (savedToken) {
        try {
          const res = await api.getMe();
          if (res.data?.user) {
            setUser(res.data.user);
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem('recoverai_token');
          setToken(null);
          setUser(null);
        }
      } else {
        // Auto-login default admin for seamless preview experience if desired, or allow login
        // Let's perform quick auto-login with demo admin so preview is instantly live
        await quickLoginAs('ADMIN');
      }
      setIsLoading(false);
    }
    checkAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password: pass });
      if (res.data) {
        localStorage.setItem('recoverai_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const quickLoginAs = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const email = role === 'ADMIN' ? 'admin@recoverai.io' : 'analyst@recoverai.io';
      const password = role === 'ADMIN' ? 'Admin@RecoverAI2026' : 'Analyst@RecoverAI2026';
      const res = await api.login({ email, password });
      if (res.data) {
        localStorage.setItem('recoverai_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } catch (err) {
      console.warn('Quick login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('recoverai_token');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, quickLoginAs }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
