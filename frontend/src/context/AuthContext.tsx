import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('insightiq_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const savedToken = localStorage.getItem('insightiq_token');
    if (savedToken) {
      try {
        const u = await authService.getMe();
        setUser(u);
      } catch (e) {
        localStorage.removeItem('insightiq_token');
        localStorage.removeItem('insightiq_refresh_token');
        setToken(null);
        setUser(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const data = await authService.login(email, pass);
    localStorage.setItem('insightiq_token', data.access_token);
    localStorage.setItem('insightiq_refresh_token', data.refresh_token);
    setToken(data.access_token);
    setUser(data.user);
  };

  const register = async (email: string, pass: string, name: string) => {
    const data = await authService.register(email, pass, name);
    localStorage.setItem('insightiq_token', data.access_token);
    localStorage.setItem('insightiq_refresh_token', data.refresh_token);
    setToken(data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('insightiq_token');
    localStorage.removeItem('insightiq_refresh_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const u = await authService.getMe();
      setUser(u);
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
