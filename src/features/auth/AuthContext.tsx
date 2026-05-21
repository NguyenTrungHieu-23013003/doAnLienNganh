'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Role } from '@/shared/types';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedUser = localStorage.getItem('fitness_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call
      // For mock, we'll fetch from our users.json via a simple API route we'll create
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('fitness_user', JSON.stringify(userData));
        
        // Redirect based on role
        if (userData.role === 'admin') router.push('/admin');
        else if (userData.role === 'coach') router.push('/coach');
        else router.push('/user');
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fitness_user');
    router.push('/auth/login');
  };

  // Basic route protection
  useEffect(() => {
    if (!isLoading) {
      if (!user && !pathname.startsWith('/auth')) {
        router.push('/auth/login');
      } else if (user && pathname === '/auth/login') {
        if (user.role === 'admin') router.push('/admin');
        else if (user.role === 'coach') router.push('/coach');
        else router.push('/user');
      }
    }
  }, [user, isLoading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
