import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  Session,
  UNAUTHORIZED_EVENT,
  clearSession,
  getSession,
  normalizeMasterUrl,
  saveSession,
} from '@/api/client';
import { fetchStatus } from '@/api/status';

interface AuthContextValue {
  session: Session | null;
  /** True when the master rejected the stored token, so the login page can say why. */
  expired: boolean;
  login: (masterAddress: string, token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(() => getSession());
  const [expired, setExpired] = useState(false);
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    // Drop cached data so the next login never shows another master's data.
    queryClient.clear();
  }, [queryClient]);

  const login = useCallback(
    async (masterAddress: string, token: string) => {
      const candidate: Session = { masterUrl: normalizeMasterUrl(masterAddress), token: token.trim() };
      if (!candidate.token) throw new Error('API token is required');
      try {
        // /status requires the API token, so a 200 proves both address and token.
        await fetchStatus(candidate);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          throw new Error('The master rejected this token. Use the value of ORABBIT_HTTP_AUTH_TOKEN.');
        }
        throw err;
      }
      queryClient.clear();
      saveSession(candidate);
      setExpired(false);
      setSession(candidate);
    },
    [queryClient]
  );

  useEffect(() => {
    const onUnauthorized = () => {
      if (!getSession()) return;
      setExpired(true);
      logout();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [logout]);

  const value = useMemo(() => ({ session, expired, login, logout }), [session, expired, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
