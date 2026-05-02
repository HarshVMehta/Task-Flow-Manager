import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizeEmail = (value) => value.trim().toLowerCase();

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const shouldRetry = (error) => {
    if (!error?.response) return true;
    const status = error.response.status;
    return status >= 500;
  };

  // Load user from token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('ttm_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
        } catch {
          localStorage.removeItem('ttm_token');
          localStorage.removeItem('ttm_user');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const payload = { email: normalizeEmail(email), password };

    const attemptLogin = async () => {
      const res = await api.post('/auth/login', payload);
      const { user: userData, token } = res.data.data;
      localStorage.setItem('ttm_token', token);
      localStorage.setItem('ttm_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    };

    try {
      return await attemptLogin();
    } catch (error) {
      if (shouldRetry(error)) {
        await sleep(500);
        return attemptLogin();
      }
      throw error;
    }
  };

  const signup = async (name, email, password) => {
    const res = await api.post('/auth/signup', { name, email: normalizeEmail(email), password });
    const { user: userData, token } = res.data.data;
    localStorage.setItem('ttm_token', token);
    localStorage.setItem('ttm_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('ttm_token');
    localStorage.removeItem('ttm_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
