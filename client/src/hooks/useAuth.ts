/**
 * useAuth — Hook de autenticação unificado
 * CORREÇÃO CRÍTICA: Login via servidor com JWT cookie
 */
import { useState, useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc';

export interface AuthUser {
  id?: number;
  email: string | null;
  name: string | null;
  role: string;
  openId?: string;
}

export function useAuth() {
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  const login = useCallback(async (email: string, password: string) => {
    setLoginError(null);
    setLoginLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoginError(data.error || 'Erro ao fazer login');
        setLoginLoading(false);
        return;
      }

      await utils.auth.me.invalidate();
      await meQuery.refetch();

      setLoginLoading(false);
    } catch (error) {
      console.error('[Auth] Erro no login:', error);
      setLoginError('Erro de conexão. Tente novamente.');
      setLoginLoading(false);
    }
  }, [utils, meQuery]);

  const logoutMutation = trpc.auth.logout.useMutation();

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // fallthrough
    } finally {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch {}

      localStorage.removeItem('authUser');
      localStorage.removeItem('manus-runtime-user-info');
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    const user = meQuery.data ?? null;
    const isLoading = meQuery.isLoading || loginLoading;

    const authUser: AuthUser | null = user ? {
      id: (user as any).id,
      email: (user as any).email ?? null,
      name: (user as any).name ?? null,
      role: (user as any).role ?? 'user',
      openId: (user as any).openId,
    } : null;

    return {
      user: authUser,
      loading: isLoading,
      error: loginError,
      isAuthenticated: Boolean(user),
    };
  }, [meQuery.data, meQuery.isLoading, meQuery.error, loginLoading, loginError]);

  return {
    ...state,
    login,
    logout,
    refresh: () => meQuery.refetch(),
  };
}
