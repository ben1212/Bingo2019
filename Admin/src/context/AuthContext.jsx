import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('bingo_admin_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('bingo_admin_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial verification
    const storedToken = localStorage.getItem('bingo_admin_token');
    const storedUser = localStorage.getItem('bingo_admin_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (err) {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const data = await adminApi.login(username, password);
    if (data.token && data.user) {
      localStorage.setItem('bingo_admin_token', data.token);
      localStorage.setItem('bingo_admin_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } else {
      throw new Error('Invalid response from server');
    }
  };

  const logout = () => {
    localStorage.removeItem('bingo_admin_token');
    localStorage.removeItem('bingo_admin_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
