import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const DEMO_USERS = [
  { label: 'Asha (Student - ML/Python, 3rd Yr)', email: 'asha@demo.com', role: 'student' },
  { label: 'Ravi (Student - React/Node, 2nd Yr)', email: 'ravi@demo.com', role: 'student' },
  { label: 'Meena (Student - Flutter, Busy)', email: 'meena@demo.com', role: 'student' },
  { label: 'Kiran (Student - Incomplete Profile)', email: 'kiran@demo.com', role: 'student' },
  { label: 'Organizer (TechCorp Talent)', email: 'organizer@demo.com', role: 'organizer' },
  { label: 'Campus Ambassador (College A)', email: 'ambassador@demo.com', role: 'ambassador' },
  { label: 'Coordinator (Section CSE-A)', email: 'coordinator@demo.com', role: 'coordinator' },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const me = await api.getMe();
          setUser(me);
        } catch (err) {
          console.error('Failed to restore user session:', err);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    localStorage.setItem('token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const register = async (data) => {
    const res = await api.register(data);
    localStorage.setItem('token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const switchDemoAccount = async (email) => {
    setLoading(true);
    try {
      return await login(email, 'Demo@123');
    } catch (err) {
      alert(`Demo login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        loading,
        login,
        register,
        logout,
        switchDemoAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
