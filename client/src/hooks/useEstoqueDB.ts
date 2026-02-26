/**
 * Hook useEstoqueDB — Gestão de estoque com persistência em banco de dados
 * Substitui useEstoque.ts (localStorage) por tRPC + banco de dados
 * 
 * Mantém compatibilidade com interface anterior mas usa banco de dados como fonte de verdade
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { produtos, TAXA_CAMBIO } from '@/data/produtos';
import { useAuth } from './useAuth';
import { useCustosDB } from './useCustosDB';

// Interfaces (mesmas do useEstoque original)
export interface DadosEstoqueProduto {
  produtoId: string;
  estoqueInicial: number;
  mercadoriaAChegarManual: number;
  vendaTrimestre: number;
}

export interface ProdutoComEstoque {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  categoria: string;
  precoVenda: number;
  custoUsd: number;
  custoBrl: number;

  estoqueInicial: number;
  mercadoriaAChegarManual: number;
  mercadoriaAChegarConteiner: number;
  mercadoriaAChegar: number;
  estoqueProjetado: number;

  vendaTrimestre: number;
  mediaMensal: number;
  coberturaMeses: number;

  estoqueIdeal: number;
  necessidadeCompra: number;
  valorCompraUsd: number;
  valorCompraBrl: number;
  status: StatusEstoque;

  processosVinculados: string[];
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

// Evento customizado
export const PROCESSOS_CHANGE_EVENT = 'asx_processos_changed';

export function dispatchProcessosChange() {
  window.dispatchEvent(new CustomEvent(PROCESSOS_CHANGE_EVENT));
}

// Funções auxiliares
function calcularStatus(coberturaMeses: number, mediaMensal: number): StatusEstoque {
  if (mediaMensal === 0) return 'sem_dados';
  if (coberturaMeses < 3) return 'critico';
  if (coberturaMeses < 6) return 'atencao';
  if (coberturaMeses <= 9) return 'ok';
  return 'excesso';
}

function buildCodigoToIdMap(): Map<string, string> {
  const map = new Map<string, string>();
  produtos.forEach(p => {
    map.set(p.codigo.toUpperCase(), p.codigo);
  });
  return map;
}

// Hook principal
export function useEstoqueDB(comprador: 'sarom' | 'alexandre') {
  const { user } = useAuth();
  const { getCusto, getCustoReal, taxaCambio } = useCustosDB();
  const codigoMap = useMemo(() => buildCodigoToIdMap(), []);

  // Queries tRPC
  const { data: estoques = [] } = trpc.migracao.getEstoques.useQuery();

  // Mutations tRPC
  const updateEstoqueMutation = trpc.migracao.updateEstoque.useMutation();

  // Estado local para dados de estoque
  const [dadosEstoque, setDadosEstoque] = useState<Record<string, DadosEstoqueProduto>>(() => {
    const mapa: Record<string, DadosEstoqueProduto> = {};
    estoques.forEach((e: any) => {
      mapa[e.produtoId] = {
        produtoId: e.produtoId,
        estoqueInicial: e.quantidade || 0,
        mercadoriaAChegarManual: 0,
        vendaTrimestre: 0,
      };
    });
    return mapa;
  });

  // Meta de cobertura (em meses)
  const [metaCobertura, setMetaCobertura] = useState<number>(9);

  // Sincronizar estoques quando dados chegam do servidor
  useEffect(() => {
    const mapa: Record<string, DadosEstoqueProduto> = {};
    estoques.forEach((e: any) => {
      mapa[e.produtoId] = {
        produtoId: e.produtoId,
        estoqueInicial: e.quantidade || 0,
        mercadoriaAChegarManual: 0,
        vendaTrimestre: 0,
      };
    });
    setDadosEstoque(mapa);
  }, [estoques]);

  // Funções de atualização
  const atualizarDados = useCallback((produtoId: string, campo: string, valor: number) => {
    setDadosEstoque(prev => {
      const atual = prev[produtoId] || {
        produtoId,
        estoqueInicial: 0,
        mercadoriaAChegarManual: 0,
        vendaTrimestre: 0,
      };

      const atualizado = { ...atual, [campo]: valor };
      setDadosEstoque(p => ({ ...p, [produtoId]: atualizado }));

      // Persistir no banco
      updateEstoqueMutation.mutate({
        produtoId,
        quantidade: valor,
      });

      return { ...prev, [produtoId]: atualizado };
    });
  }, [updateEstoqueMutation]);

  // Calcular produtos com estoque
  const produtosComEstoque = useMemo((): ProdutoComEstoque[] => {
    return produtos
      .filter(p => dadosEstoque[p.codigo])
      .map(p => {
        const dados = dadosEstoque[p.codigo];
        const custoUsd = getCusto(p.codigo);
        const custoBrl = getCustoReal(p.codigo);

        const estoqueInicial = dados?.estoqueInicial ?? 0;
        const mercadoriaAChegarManual = dados?.mercadoriaAChegarManual ?? 0;
        const mercadoriaAChegarConteiner = 0; // TODO: Implementar quando contêiner estiver pronto
        const mercadoriaAChegar = mercadoriaAChegarManual + mercadoriaAChegarConteiner;
        const estoqueProjetado = estoqueInicial + mercadoriaAChegar;

        const vendaTrimestre = dados?.vendaTrimestre ?? 0;
        const mediaMensal = vendaTrimestre / 3;
        const coberturaMeses = mediaMensal > 0 ? estoqueProjetado / mediaMensal : 0;

        const estoqueIdeal = metaCobertura * mediaMensal;
        const necessidadeCompra = Math.max(0, estoqueIdeal - estoqueProjetado);
        const valorCompraUsd = necessidadeCompra * custoUsd;
        const valorCompraBrl = necessidadeCompra * custoBrl;

        const status = calcularStatus(coberturaMeses, mediaMensal);

        return {
          id: p.codigo,
          codigo: p.codigo,
          descricao: p.descricao,
          unidade: p.unid,
          categoria: p.categoria,
          precoVenda: p.preco_venda,
          custoUsd,
          custoBrl,

          estoqueInicial,
          mercadoriaAChegarManual,
          mercadoriaAChegarConteiner,
          mercadoriaAChegar,
          estoqueProjetado,

          vendaTrimestre,
          mediaMensal,
          coberturaMeses,

          estoqueIdeal,
          necessidadeCompra,
          valorCompraUsd,
          valorCompraBrl,
          status,

          processosVinculados: [],
        };
      });
  }, [dadosEstoque, getCusto, getCustoReal, metaCobertura]);

  // Calcular KPIs
  const kpis = useMemo((): KPIsEstoque => {
    const skusAtivos = produtosComEstoque.filter(p => p.estoqueProjetado > 0).length;
    const skusCriticos = produtosComEstoque.filter(p => p.status === 'critico').length;
    const skusAtencao = produtosComEstoque.filter(p => p.status === 'atencao').length;
    const skusOk = produtosComEstoque.filter(p => p.status === 'ok').length;
    const skusExcesso = produtosComEstoque.filter(p => p.status === 'excesso').length;
    const skusSemDados = produtosComEstoque.filter(p => p.status === 'sem_dados').length;

    const investimentoTotalUsd = produtosComEstoque.reduce((sum, p) => sum + (p.estoqueProjetado * p.custoUsd), 0);
    const investimentoTotalBrl = produtosComEstoque.reduce((sum, p) => sum + (p.estoqueProjetado * p.custoBrl), 0);

    const coberturaMediaGeral = produtosComEstoque.length > 0
      ? produtosComEstoque.reduce((sum, p) => sum + p.coberturaMeses, 0) / produtosComEstoque.length
      : 0;

    return {
      totalSkus: produtosComEstoque.length,
      skusAtivos,
      skusCriticos,
      skusAtencao,
      skusOk,
      skusExcesso,
      skusSemDados,
      investimentoTotalUsd,
      investimentoTotalBrl,
      coberturaMediaGeral,
    };
  }, [produtosComEstoque]);

  return {
    dadosEstoque,
    metaCobertura,
    setMetaCobertura,
    atualizarDados,
    produtosComEstoque,
    kpis,
    isLoading: estoques.length === 0,
  };
}
