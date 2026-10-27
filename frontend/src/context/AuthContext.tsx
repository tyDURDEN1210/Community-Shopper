import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UserProfile } from '../types';
import { apiRequest, setAuthToken, getAuthToken } from '../lib/api';

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (payload: {
    fullName: string;
    email: string;
    phoneNumber: string;
    hostelId: string;
    roomNumber: string;
    password: string;
  }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const queryClient = useQueryClient();

  const refreshProfile = useCallback(async () => {
    try {
      const data = await apiRequest<{ user: UserProfile }>('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
      setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getAuthToken()) {
      void refreshProfile();
    } else {
      // Still check cookie session if available
      void refreshProfile();
    }
  }, [refreshProfile]);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const data = await apiRequest<{ user: UserProfile; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuthToken(data.token);
    setUser(data.user);
    queryClient.clear();
    return data.user;
  };

  const register = async (payload: {
    fullName: string;
    email: string;
    phoneNumber: string;
    hostelId: string;
    roomNumber: string;
    password: string;
  }): Promise<UserProfile> => {
    const data = await apiRequest<{ user: UserProfile; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setAuthToken(data.token);
    setUser(data.user);
    queryClient.clear();
    return data.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout network error
    } finally {
      setAuthToken(null);
      setUser(null);
      queryClient.clear();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

