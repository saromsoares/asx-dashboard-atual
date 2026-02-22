// Hook para gerenciar custos USD dos produtos com persistência em localStorage
import { useState, useCallback, useEffect } from 'react';
import { TAXA_CAMBIO } from '@/data/produtos';

const STORAGE_KEY = 'asx_custos_usd';

export function useCustos() {
  const [custos, setCustos] = useState<Record<number, number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [taxaCambio, setTaxaCambio] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('asx_taxa_cambio');
      return stored ? parseFloat(stored) : TAXA_CAMBIO;
    } catch {
      return TAXA_CAMBIO;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custos));
  }, [custos]);

  useEffect(() => {
    localStorage.setItem('asx_taxa_cambio', String(taxaCambio));
  }, [taxaCambio]);

  const setCusto = useCallback((produtoId: number, valor: number) => {
    setCustos(prev => ({ ...prev, [produtoId]: valor }));
  }, []);

  const getCusto = useCallback((produtoId: number): number => {
    return custos[produtoId] ?? 0;
  }, [custos]);

  const getCustoReal = useCallback((produtoId: number): number => {
    const usd = custos[produtoId] ?? 0;
    return usd * taxaCambio;
  }, [custos, taxaCambio]);

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
