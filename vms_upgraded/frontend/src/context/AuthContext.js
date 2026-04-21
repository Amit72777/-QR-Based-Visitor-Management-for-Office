/**
 * AuthContext — session management.
 *
 * v2: exposes updateUser() so ProfilePage can refresh the stored user
 * object after a successful profile update.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on first mount
  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token  = localStorage.getItem('token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res  = await authAPI.login(email, password);
    const data = res.data;
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user',  JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Call this after a successful profile update to keep localStorage in sync
  const updateUser = (changes) => {
    setUser(prev => {
      const updated = { ...prev, ...changes };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  // Convenience: isRole('admin') or isRole('admin', 'super_admin')
  const isRole = (...roles) => user && roles.includes(user.user_role);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
