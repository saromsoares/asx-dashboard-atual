// Hook para gerenciar custos USD dos produtos com persistência em localStorage
// Prioridade: localStorage (edição manual) > custo_usd do catálogo (planilha)
import { useState, useCallback, useEffect } from 'react';
import { TAXA_CAMBIO, produtos } from '@/data/produtos';

const STORAGE_KEY = 'asx_custos_usd';
const STORAGE_KEY_TAXA = 'asx_taxa_cambio';

// Criar mapa de custo_usd padrão do catálogo (planilha)
const catalogCustos: Record<number, number> = {};
for (const p of produtos) {
  if (p.custo_usd > 0) {
    catalogCustos[p.id] = p.custo_usd;
  }
}

// ---- Evento customizado para comunicação entre hooks ----
// Substitui o polling por setInterval — muito mais eficiente
export const CUSTOS_CHANGE_EVENT = 'asx_custos_changed';
export const TAXA_CHANGE_EVENT = 'asx_taxa_changed';

export function dispatchCustosChange() {
  window.dispatchEvent(new CustomEvent(CUSTOS_CHANGE_EVENT));
}

export function dispatchTaxaChange() {
  window.dispatchEvent(new CustomEvent(TAXA_CHANGE_EVENT));
}

export function useCustos() {
  const [custos, setCustos] = useState<Record<number, number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [taxaCambio, setTaxaCambioState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TAXA);
      return stored ? parseFloat(stored) : TAXA_CAMBIO;
    } catch {
      return TAXA_CAMBIO;
    }
  });

  // Persistir custos e disparar evento
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custos));
    dispatchCustosChange();
  }, [custos]);

  // Persistir taxa e disparar evento
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TAXA, String(taxaCambio));
    dispatchTaxaChange();
  }, [taxaCambio]);

  // Wrapper que garante persistência + evento
  const setTaxaCambio = useCallback((valor: number) => {
    setTaxaCambioState(valor);
  }, []);

  const setCusto = useCallback((produtoId: number, valor: number) => {
    setCustos(prev => ({ ...prev, [produtoId]: valor }));
  }, []);

  // Prioridade: localStorage > catálogo > 0
  const getCusto = useCallback((produtoId: number): number => {
    if (custos[produtoId] !== undefined && custos[produtoId] > 0) {
      return custos[produtoId];
    }
    return catalogCustos[produtoId] ?? 0;
  }, [custos]);

  const getCustoReal = useCallback((produtoId: number): number => {
    const usd = getCusto(produtoId);
    return usd * taxaCambio;
  }, [getCusto, taxaCambio]);

  const getLucro = useCallback((produtoId: number, precoVenda: number): number => {
    const custoReal = getCustoReal(produtoId);
    if (custoReal === 0) return 0;
    return precoVenda - custoReal;
  }, [getCustoReal]);

  const getLucroPct = useCallback((produtoId: number, precoVenda: number): number => {
    const custoReal = getCustoReal(produtoId);
    if (custoReal === 0 || precoVenda === 0) return 0;
    return ((precoVenda - custoReal) / precoVenda) * 100;
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
  };
}
