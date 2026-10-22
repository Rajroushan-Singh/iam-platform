import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { auditApi } from '../api/auditApi';
import { configureTokenProvider } from '../api/httpClient';

const AuthContext = createContext(null);

const STORAGE_KEY_AUTH = 'iam_auth_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Synchronize state with token provider for Axios interceptors
  useEffect(() => {
    configureTokenProvider({
      getToken: () => accessToken,
      getRefreshToken: () => refreshToken,
      onTokenRefreshed: (loginData) => {
        handleAuthSuccess(loginData, false);
      },
      onLogout: () => {
        logout(false);
      },
    });
  }, [accessToken, refreshToken]);

  // Check admin privileges authoritatively with the backend
  const verifyAdminRole = useCallback(async (token) => {
    try {
      // Direct check against backend's hasRole('ADMIN') protected endpoint
      await auditApi.getAdminDashboard();
      setIsAdmin(true);
      return true;
    } catch {
      setIsAdmin(false);
      return false;
    }
  }, []);

  const handleAuthSuccess = useCallback((data, shouldCheckAdmin = true) => {
    const { userId, name, email, accessToken: newAccessToken, refreshToken: newRefreshToken } = data;
    const userData = { id: userId, name, email };
    
    setUser(userData);
    setAccessToken(newAccessToken);
    if (newRefreshToken) {
      setRefreshToken(newRefreshToken);
    }

    try {
      localStorage.setItem(
        STORAGE_KEY_AUTH,
        JSON.stringify({
          user: userData,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || refreshToken,
        })
      );
    } catch (e) {
      console.warn('Unable to persist session to localStorage', e);
    }

    if (shouldCheckAdmin && newAccessToken) {
      verifyAdminRole(newAccessToken);
    }
  }, [refreshToken, verifyAdminRole]);

  // Initialize session on page load
  useEffect(() => {
    const initAuth = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_AUTH);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.refreshToken) {
            setUser(parsed.user);
            setAccessToken(parsed.accessToken);
            setRefreshToken(parsed.refreshToken);

            // Attempt to refresh or verify token validity
            try {
              const refreshed = await authApi.refresh(parsed.refreshToken);
              handleAuthSuccess(refreshed, true);
            } catch (err) {
              console.warn('Initial session refresh failed; clearing stale tokens');
              logout(false);
            }
          }
        }
      } catch (err) {
        console.error('Failed to restore session', err);
        logout(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    handleAuthSuccess(data, true);
    return data;
  };

  const logout = async (callBackend = true) => {
    const currentRefreshToken = refreshToken;
    
    // Immediately clear frontend state
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setIsAdmin(false);
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } catch (e) {
      // ignore
    }

    if (callBackend && currentRefreshToken) {
      await authApi.logout(currentRefreshToken);
    }
  };

  const value = {
    user,
    accessToken,
    refreshToken,
    isAdmin,
    isLoading,
    isAuthenticated: !!accessToken,
    login,
    logout,
    checkAdminRole: verifyAdminRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
