import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // Validar sessão a cada 5 minutos
    staleTime: 4 * 60 * 1000, // Dados são considerados obsoletos após 4 minutos
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      // Limpar cache do localStorage
      localStorage.removeItem('manus-runtime-user-info');
      localStorage.removeItem('asx_remembered_email');
      localStorage.removeItem('asx_remember_me');
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      // Limpar cache do localStorage
      localStorage.removeItem('manus-runtime-user-info');
      localStorage.removeItem('asx_remembered_email');
      localStorage.removeItem('asx_remember_me');
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    // Apenas salvar dados do usuário atual, não usar cache antigo
    if (meQuery.data) {
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify(meQuery.data)
      );
    } else if (!meQuery.isLoading) {
      // Se não há dados e não está carregando, limpar cache
      localStorage.removeItem("manus-runtime-user-info");
    }
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  // Validar sessão quando a aba retorna ao foco
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        meQuery.refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [meQuery]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
