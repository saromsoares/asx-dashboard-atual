/*
  Hook useEstoque — Gestão de Estoque e Necessidade de Compra
  Persistência independente por comprador (Sarom / Alexandre)
  Cálculos automáticos: média mensal, cobertura, necessidade de compra, valor investimento
*/

import { useState, useCallback, useEffect, useMemo } from 'react';
import { produtos, TAXA_CAMBIO } from '@/data/produtos';

// ---- Interfaces ----

export interface DadosEstoqueProduto {
  produtoId: number;
  estoqueInicial: number;
  mercadoriaAChegar: number;
  vendaMes1: number;
  vendaMes2: number;
  vendaMes3: number;
}

export interface ProdutoComEstoque {
  // Bloco 1 — Identificação (do catálogo)
  id: number;
  codigo: string;
  descricao: string;
  unidade: string;
  categoria: string;
  precoVenda: number;
  custoUsd: number;
  custoBrl: number;

  // Bloco 2 — Posição de Estoque
  estoqueInicial: number;
  mercadoriaAChegar: number;
  estoqueProjetado: number;

  // Bloco 3 — Métricas de Venda
  vendaMes1: number;
  vendaMes2: number;
  vendaMes3: number;
  mediaMensal: number;
  coberturaMeses: number;

  // Bloco 4 — Necessidade de Compra
  estoqueIdeal: number;
  necessidadeCompra: number;
  valorCompraUsd: number;
  valorCompraBrl: number;
  status: 'critico' | 'atencao' | 'ok' | 'excesso' | 'sem_dados';
}

export type StatusEstoque = 'critico' | 'atencao' | 'ok' | 'excesso' | 'sem_dados';

export interface KPIsEstoque {
  totalSkus: number;
  skusAtivos: number;
  skusCriticos: number;
  skusAtencao: number;
  skusOk: number;
  skusExcesso: number;
  skusSemDados: number;
  investimentoTotalUsd: number;
  investimentoTotalBrl: number;
  coberturaMediaGeral: number;
}

// ---- Funções auxiliares ----

function calcularStatus(coberturaMeses: number, mediaMensal: number): StatusEstoque {
  if (mediaMensal === 0) return 'sem_dados';
  if (coberturaMeses < 3) return 'critico';
  if (coberturaMeses < 6) return 'atencao';
  if (coberturaMeses <= 9) return 'ok';
  return 'excesso';
}

function getStorageKey(comprador: string): string {
  return `asx_central_${comprador.toLowerCase()}`;
}

function getMetaKey(comprador: string): string {
  return `asx_central_meta_${comprador.toLowerCase()}`;
}

// ---- Hook Principal ----

export function useEstoque(comprador: 'sarom' | 'alexandre') {
  const storageKey = getStorageKey(comprador);
  const metaKey = getMetaKey(comprador);

  // Estado: dados de estoque por produto (Map: produtoId -> DadosEstoqueProduto)
  const [dadosEstoque, setDadosEstoque] = useState<Record<number, DadosEstoqueProduto>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Meta de cobertura em meses (padrão: 9)
  const [metaCobertura, setMetaCobertura] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(metaKey);
      return stored ? parseInt(stored, 10) : 9;
    } catch {
      return 9;
    }
  });

  // Carregar custos USD do localStorage (mesma fonte do Dashboard)
  const [custosUsd, setCustosUsd] = useState<Record<number, number>>(() => {
    try {
      const stored = localStorage.getItem('asx_custos_usd');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Persistir dados de estoque
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(dadosEstoque));
    } catch (e) {
      console.error('Erro ao salvar estoque:', e);
    }
  }, [dadosEstoque, storageKey]);

  // Persistir meta de cobertura
  useEffect(() => {
    localStorage.setItem(metaKey, String(metaCobertura));
  }, [metaCobertura, metaKey]);

  // Recarregar custos USD periodicamente (caso o Dashboard atualize)
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem('asx_custos_usd');
        if (stored) setCustosUsd(JSON.parse(stored));
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ---- Funções de atualização ----

  const atualizarDados = useCallback((produtoId: number, campo: keyof DadosEstoqueProduto, valor: number) => {
    setDadosEstoque(prev => {
      const atual = prev[produtoId] || {
        produtoId,
        estoqueInicial: 0,
        mercadoriaAChegar: 0,
        vendaMes1: 0,
        vendaMes2: 0,
        vendaMes3: 0,
      };
      return {
        ...prev,
        [produtoId]: { ...atual, [campo]: valor },
      };
    });
  }, []);

  const atualizarDadosEmMassa = useCallback((dados: Record<number, Partial<DadosEstoqueProduto>>) => {
    setDadosEstoque(prev => {
      const novo = { ...prev };
      Object.entries(dados).forEach(([idStr, parcial]) => {
        const id = parseInt(idStr, 10);
        const atual = novo[id] || {
          produtoId: id,
          estoqueInicial: 0,
          mercadoriaAChegar: 0,
          vendaMes1: 0,
          vendaMes2: 0,
          vendaMes3: 0,
        };
        novo[id] = { ...atual, ...parcial, produtoId: id };
      });
      return novo;
    });
  }, []);

  // ---- Produtos com cálculos ----

  const produtosComEstoque: ProdutoComEstoque[] = useMemo(() => {
    return produtos.map(p => {
      const dados = dadosEstoque[p.id] || {
        produtoId: p.id,
        estoqueInicial: 0,
        mercadoriaAChegar: 0,
        vendaMes1: 0,
        vendaMes2: 0,
        vendaMes3: 0,
      };

      const custoUsd = custosUsd[p.id] || p.custo_usd || 0;
      const custoBrl = custoUsd * TAXA_CAMBIO;

      // Bloco 2 — Posição de Estoque
      const estoqueProjetado = dados.estoqueInicial + dados.mercadoriaAChegar;

      // Bloco 3 — Métricas de Venda
      const mesesComVenda = [dados.vendaMes1, dados.vendaMes2, dados.vendaMes3].filter(v => v > 0);
      const mediaMensal = mesesComVenda.length > 0
        ? mesesComVenda.reduce((s, v) => s + v, 0) / mesesComVenda.length
        : 0;
      const coberturaMeses = mediaMensal > 0 ? estoqueProjetado / mediaMensal : 0;

      // Bloco 4 — Necessidade de Compra
      const estoqueIdeal = mediaMensal * metaCobertura;
      const necessidadeCompra = Math.max(0, estoqueIdeal - estoqueProjetado);
      const valorCompraUsd = necessidadeCompra * custoUsd;
      const valorCompraBrl = valorCompraUsd * TAXA_CAMBIO;

      const status = calcularStatus(coberturaMeses, mediaMensal);

      return {
        id: p.id,
        codigo: p.codigo,
        descricao: p.descricao,
        unidade: p.unid,
        categoria: p.categoria,
        precoVenda: p.preco_venda,
        custoUsd,
        custoBrl,
        estoqueInicial: dados.estoqueInicial,
        mercadoriaAChegar: dados.mercadoriaAChegar,
        estoqueProjetado,
        vendaMes1: dados.vendaMes1,
        vendaMes2: dados.vendaMes2,
        vendaMes3: dados.vendaMes3,
        mediaMensal,
        coberturaMeses,
        estoqueIdeal,
        necessidadeCompra,
        valorCompraUsd,
        valorCompraBrl,
        status,
      };
    });
  }, [dadosEstoque, custosUsd, metaCobertura]);

  // ---- KPIs ----

  const kpis: KPIsEstoque = useMemo(() => {
    const ativos = produtosComEstoque.filter(p => p.estoqueInicial > 0 || p.mercadoriaAChegar > 0 || p.mediaMensal > 0);
    const criticos = produtosComEstoque.filter(p => p.status === 'critico');
    const atencao = produtosComEstoque.filter(p => p.status === 'atencao');
    const ok = produtosComEstoque.filter(p => p.status === 'ok');
    const excesso = produtosComEstoque.filter(p => p.status === 'excesso');
    const semDados = produtosComEstoque.filter(p => p.status === 'sem_dados');

    const investimentoTotalUsd = produtosComEstoque.reduce((s, p) => s + p.valorCompraUsd, 0);
    const investimentoTotalBrl = investimentoTotalUsd * TAXA_CAMBIO;

    const comCobertura = produtosComEstoque.filter(p => p.mediaMensal > 0);
    const coberturaMediaGeral = comCobertura.length > 0
      ? comCobertura.reduce((s, p) => s + p.coberturaMeses, 0) / comCobertura.length
      : 0;

    return {
      totalSkus: produtos.length,
      skusAtivos: ativos.length,
      skusCriticos: criticos.length,
      skusAtencao: atencao.length,
      skusOk: ok.length,
      skusExcesso: excesso.length,
      skusSemDados: semDados.length,
      investimentoTotalUsd,
      investimentoTotalBrl,
      coberturaMediaGeral,
    };
  }, [produtosComEstoque]);

  return {
    produtosComEstoque,
    kpis,
    metaCobertura,
    setMetaCobertura,
    atualizarDados,
    atualizarDadosEmMassa,
    dadosEstoque,
  };
}
