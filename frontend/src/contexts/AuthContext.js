import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lhm_token');
    const saved = localStorage.getItem('lhm_user');
    if (token && saved) {
      try {
        setUser(JSON.parse(saved));
        api.get('/auth/me').then(r => {
          setUser(r.data.user);
          localStorage.setItem('lhm_user', JSON.stringify(r.data.user));
        }).catch(() => {
          localStorage.removeItem('lhm_token');
          localStorage.removeItem('lhm_user');
          setUser(null);
        }).finally(() => setLoading(false));
      } catch { setLoading(false); }
    } else { setLoading(false); }
  }, []);

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    const { token, user } = r.data;
    localStorage.setItem('lhm_token', token);
    localStorage.setItem('lhm_user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('lhm_token');
    localStorage.removeItem('lhm_user');
    setUser(null);
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('lhm_user', JSON.stringify(updated));
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'super_admin') return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
