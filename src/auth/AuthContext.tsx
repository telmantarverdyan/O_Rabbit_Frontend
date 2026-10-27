import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  Session,
  UNAUTHORIZED_EVENT,
  clearSession,
  getSession,
  normalizeMasterUrl,
  saveOpsToken,
  saveSession,
} from '@/api/client';
import { verifyOpsToken } from '@/api/remoteOps';
import { fetchStatus } from '@/api/status';

interface AuthContextValue {
  session: Session | null;
  /** True when the master rejected the stored token, so the login page can say why. */
  expired: boolean;
  login: (masterAddress: string, token: string, opsToken?: string) => Promise<void>;
  /** Adds or replaces the remote-operations token for this tab after checking it. */
  setOpsToken: (opsToken: string) => Promise<void>;
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
    async (masterAddress: string, token: string, opsToken = '') => {
      const candidate: Session = { masterUrl: normalizeMasterUrl(masterAddress), token: token.trim(), ...(opsToken.trim() ? { opsToken: opsToken.trim() } : {}) };
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
      if (candidate.opsToken) await verifyOpsToken(candidate);
      queryClient.clear();
      saveSession(candidate);
      setExpired(false);
      setSession(candidate);
    },
    [queryClient]
  );

  const setOpsToken = useCallback(
    async (opsToken: string) => {
      if (!session) throw new Error('Log in first.');
      const next: Session = { ...session, opsToken: opsToken.trim() || undefined };
      if (next.opsToken) await verifyOpsToken(next);
      saveOpsToken(next.opsToken ?? '');
      setSession(next);
      // Remote-ops data was fetched with the old token (or none); load it again.
      queryClient.invalidateQueries({ queryKey: ['ops'] });
    },
    [session, queryClient]
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

  const value = useMemo(() => ({ session, expired, login, setOpsToken, logout }), [session, expired, login, setOpsToken, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
