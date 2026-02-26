/**
 * Hook useCustosDB — Gerenciamento de custos USD com persistência em banco de dados
 * Substitui useCustos.ts (localStorage) por tRPC + banco de dados
 * 
 * Prioridade: banco de dados (edição manual) > custo_usd do catálogo (planilha)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { produtos, TAXA_CAMBIO } from '@/data/produtos';
import { useAuth } from './useAuth';

// Criar mapa de custo_usd padrão do catálogo (planilha)
const catalogCustos: Record<string, number> = {};
for (const p of produtos) {
  if (p.custo_usd > 0) {
    catalogCustos[p.codigo] = p.custo_usd;
  }
}

// Evento customizado para comunicação entre hooks
export const CUSTOS_CHANGE_EVENT = 'asx_custos_changed';
export const TAXA_CHANGE_EVENT = 'asx_taxa_changed';

export function dispatchCustosChange() {
  window.dispatchEvent(new CustomEvent(CUSTOS_CHANGE_EVENT));
}

export function dispatchTaxaChange() {
  window.dispatchEvent(new CustomEvent(TAXA_CHANGE_EVENT));
}

export function useCustosDB() {
  const { user } = useAuth();
  const userId = user?.id ?? 1;

  // Queries tRPC
  const { data: custosList = [] } = trpc.migracao.listCustos.useQuery();
  const { data: preferencias } = trpc.migracao.getPreferencias.useQuery();

  // Mutations tRPC
  const upsertCustoMutation = trpc.migracao.updateCusto.useMutation();
  const upsertPreferenciasMutation = trpc.migracao.updatePreferencias.useMutation();

  // Estado local para custos (mapa produtoId -> valor USD)
  const [custos, setCustos] = useState<Record<string, number>>(() => {
    const mapa: Record<string, number> = {};
    custosList.forEach((c: any) => {
      mapa[c.produtoId] = Number(c.custoUsd);
    });
    return mapa;
  });

  // Estado local para taxa de câmbio
  const [taxaCambio, setTaxaCambioState] = useState<number>(() => {
    if (preferencias?.taxaCambioCustomizada) {
      return Number(preferencias.taxaCambioCustomizada);
    }
    return TAXA_CAMBIO;
  });

  // Sincronizar custos quando dados do servidor chegam
  useEffect(() => {
    const mapa: Record<string, number> = {};
    custosList.forEach((c: any) => {
      mapa[c.produtoId] = Number(c.custoUsd);
    });
    setCustos(mapa);
  }, [custosList]);

  // Sincronizar taxa de câmbio quando preferências chegam
  useEffect(() => {
    if (preferencias?.taxaCambioCustomizada) {
      setTaxaCambioState(Number(preferencias.taxaCambioCustomizada));
    }
  }, [preferencias]);

  // Wrapper que persiste no banco + dispara evento
  const setTaxaCambio = useCallback((valor: number) => {
    setTaxaCambioState(valor);
    dispatchTaxaChange();
    
    // Persistir no banco de dados
    upsertPreferenciasMutation.mutate({
      taxaCambioCustomizada: valor,
      usarTaxaCustomizada: true,
    });
  }, [userId, upsertPreferenciasMutation]);

  const setCusto = useCallback((produtoId: string, valor: number) => {
    setCustos(prev => ({ ...prev, [produtoId]: valor }));
    dispatchCustosChange();
    
    // Persistir no banco de dados (sem await, é mutation)
    upsertCustoMutation.mutate({
      produtoId,
      custoUsd: valor,
    });
  }, [upsertCustoMutation]);

  // Prioridade: banco de dados > catálogo > 0
  const getCusto = useCallback((produtoId: string): number => {
    if (custos[produtoId] !== undefined && custos[produtoId] > 0) {
      return custos[produtoId];
    }
    return catalogCustos[produtoId] ?? 0;
  }, [custos]);

  const getCustoReal = useCallback((produtoId: string): number => {
    const usd = getCusto(produtoId);
    return usd * taxaCambio;
  }, [getCusto, taxaCambio]);

  const getLucro = useCallback((produtoId: string, precoVenda: number): number => {
    const custoReal = getCustoReal(produtoId);
    if (custoReal === 0) return 0;
    return precoVenda - custoReal;
  }, [getCustoReal]);

  const getLucroPct = useCallback((produtoId: string, precoVenda: number): number => {
    const custoReal = getCustoReal(produtoId);
    if (custoReal === 0 || precoVenda === 0) return 0;
    return ((precoVenda - custoReal) / precoVenda) * 100;
  }, [getCustoReal]);

  const getMarkup = useCallback((produtoId: string, precoVenda: number): number => {
    const custoReal = getCustoReal(produtoId);
    if (custoReal === 0) return 0;
    return ((precoVenda - custoReal) / custoReal) * 100;
  }, [getCustoReal]);

  return {
    custos,
    taxaCambio,
    setTaxaCambio,
    setCusto,
    getCusto,
    getCustoReal,
    getLucro,
    getLucroPct,
    getMarkup,
    isLoading: custosList.length === 0 || !preferencias,
  };
}
