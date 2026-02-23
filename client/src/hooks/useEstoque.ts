/*
  Hook useEstoque — Gestão de Estoque e Necessidade de Compra
  Persistência independente por comprador (Sarom / Alexandre)
  Cálculos automáticos: média mensal, cobertura, necessidade de compra, valor investimento

  VINCULAÇÃO AUTOMÁTICA: lê processos de contêiner em trânsito para alimentar "A Chegar"

  CORREÇÕES v2.1:
  - Usa taxa de câmbio do localStorage (consistente com Dashboard e Configurações)
  - Substituído setInterval polling por CustomEvent (performance)
  - Adicionado evento de storage para sync entre abas
*/

import { useState, useCallback, useEffect, useMemo } from 'react';
import { produtos, TAXA_CAMBIO } from '@/data/produtos';
import { CUSTOS_CHANGE_EVENT, TAXA_CHANGE_EVENT } from './useCustos';

// ---- Interfaces ----

export interface DadosEstoqueProduto {
  produtoId: number;
  estoqueInicial: number;
  mercadoriaAChegarManual: number;
  vendaTrimestre: number;
}

export interface ProdutoComEstoque {
  id: number;
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

// ---- Interfaces do Contêiner (espelhadas do Conteiner.tsx) ----

interface ItemConteiner {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  precoUnitarioDolar: number;
  precoTotalDolar: number;
  pedidoSarom: number;
  pedidoAlexandre: number;
}

interface ProcessoSR {
  id: string;
  numeroProcesso: string;
  nomeInvoice: string;
  dataProcesso: string;
  observacoes: string;
  ncm: string;
  itens: ItemConteiner[];
  dataCriacao: string;
  status: 'Em andamento' | 'Finalizado' | 'Cancelado';
  caixasPapelao: number;
  pesoBrutoKg: number;
  pesoLiquidoKg: number;
  cbm: number;
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

const STORAGE_KEY_PROCESSOS = 'asx_processos_sr';

// Evento customizado para quando processos mudam
export const PROCESSOS_CHANGE_EVENT = 'asx_processos_changed';

export function dispatchProcessosChange() {
  window.dispatchEvent(new CustomEvent(PROCESSOS_CHANGE_EVENT));
}

/** Lê processos de contêiner do localStorage */
function carregarProcessos(): ProcessoSR[] {
  try {
    const dados = localStorage.getItem(STORAGE_KEY_PROCESSOS);
    if (dados) return JSON.parse(dados);
  } catch (e) {
    console.error('Erro ao carregar processos para vinculação:', e);
  }
  return [];
}

/** Lê taxa de câmbio do localStorage (consistente com Dashboard) */
function carregarTaxaCambio(): number {
  try {
    const stored = localStorage.getItem('asx_taxa_cambio');
    if (stored) return parseFloat(stored);
  } catch { /* ignore */ }
  return TAXA_CAMBIO;
}

/** Mapeia código de produto para ID */
function buildCodigoToIdMap(): Map<string, number> {
  const map = new Map<string, number>();
  produtos.forEach(p => {
    map.set(p.codigo.toUpperCase(), p.id);
  });
  return map;
}

/**
 * Agrega as quantidades em trânsito por produto e comprador.
 * Retorna: { produtoId -> { quantidade, processos[] } }
 */
function calcularEmTransito(
  comprador: 'sarom' | 'alexandre',
  codigoMap: Map<string, number>
): Map<number, { quantidade: number; processos: string[] }> {
  const resultado = new Map<number, { quantidade: number; processos: string[] }>();
  const processos = carregarProcessos();

  const emAndamento = processos.filter(p => p.status === 'Em andamento');

  for (const processo of emAndamento) {
    for (const item of processo.itens) {
      const codigoUpper = item.codigo.toUpperCase();
      const produtoId = codigoMap.get(codigoUpper);
      if (!produtoId) continue;

      const qtd = comprador === 'sarom' ? item.pedidoSarom : item.pedidoAlexandre;
      if (qtd <= 0) continue;

      const atual = resultado.get(produtoId) || { quantidade: 0, processos: [] };
      atual.quantidade += qtd;
      if (!atual.processos.includes(processo.numeroProcesso)) {
        atual.processos.push(processo.numeroProcesso);
      }
      resultado.set(produtoId, atual);
    }
  }

  return resultado;
}

// ---- Migração de dados antigos ----

function migrarDadosAntigos(dados: Record<number, any>): Record<number, DadosEstoqueProduto> {
  const migrado: Record<number, DadosEstoqueProduto> = {};
  for (const [idStr, valor] of Object.entries(dados)) {
    const id = parseInt(idStr, 10);
    if (isNaN(id)) continue;

    const vendaTrimestre = valor.vendaTrimestre ?? ((valor.vendaMes1 || 0) + (valor.vendaMes2 || 0) + (valor.vendaMes3 || 0));
    migrado[id] = {
      produtoId: id,
      estoqueInicial: valor.estoqueInicial || 0,
      mercadoriaAChegarManual: valor.mercadoriaAChegarManual ?? valor.mercadoriaAChegar ?? 0,
      vendaTrimestre,
    };
  }
  return migrado;
}

// ---- Hook Principal ----

export function useEstoque(comprador: 'sarom' | 'alexandre') {
  const storageKey = getStorageKey(comprador);
  const metaKey = getMetaKey(comprador);
  const codigoMap = useMemo(() => buildCodigoToIdMap(), []);

  const [dadosEstoque, setDadosEstoque] = useState<Record<number, DadosEstoqueProduto>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? migrarDadosAntigos(JSON.parse(stored)) : {};
    } catch {
      return {};
    }
  });

  const [metaCobertura, setMetaCobertura] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(metaKey);
      return stored ? parseInt(stored, 10) : 9;
    } catch {
      return 9;
    }
  });

  // CORREÇÃO: Carregar custos USD do localStorage
  const [custosUsd, setCustosUsd] = useState<Record<number, number>>(() => {
    try {
      const stored = localStorage.getItem('asx_custos_usd');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // CORREÇÃO: Carregar taxa de câmbio do localStorage (era hardcoded TAXA_CAMBIO)
  const [taxaCambio, setTaxaCambio] = useState<number>(() => carregarTaxaCambio());

  const [emTransito, setEmTransito] = useState<Map<number, { quantidade: number; processos: string[] }>>(() =>
    calcularEmTransito(comprador, codigoMap)
  );

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

  // CORREÇÃO: Substituído setInterval por event listeners
  // Escutar mudanças nos custos USD (via CustomEvent do useCustos)
  useEffect(() => {
    const handleCustosChange = () => {
      try {
        const stored = localStorage.getItem('asx_custos_usd');
        if (stored) setCustosUsd(JSON.parse(stored));
      } catch { /* ignore */ }
    };

    // Escutar evento customizado (mesma aba)
    window.addEventListener(CUSTOS_CHANGE_EVENT, handleCustosChange);
    // Escutar evento de storage (outra aba)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'asx_custos_usd') handleCustosChange();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(CUSTOS_CHANGE_EVENT, handleCustosChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // CORREÇÃO: Escutar mudanças na taxa de câmbio
  useEffect(() => {
    const handleTaxaChange = () => {
      setTaxaCambio(carregarTaxaCambio());
    };

    window.addEventListener(TAXA_CHANGE_EVENT, handleTaxaChange);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'asx_taxa_cambio') handleTaxaChange();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(TAXA_CHANGE_EVENT, handleTaxaChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // CORREÇÃO: Substituído setInterval(3s) por event listeners para processos
  useEffect(() => {
    const atualizarTransito = () => {
      setEmTransito(calcularEmTransito(comprador, codigoMap));
    };

    // Escutar evento customizado (mesma aba)
    window.addEventListener(PROCESSOS_CHANGE_EVENT, atualizarTransito);
    // Escutar evento de storage (outra aba)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PROCESSOS) atualizarTransito();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(PROCESSOS_CHANGE_EVENT, atualizarTransito);
      window.removeEventListener('storage', handleStorage);
    };
  }, [comprador, codigoMap]);

  // ---- Funções de atualização ----

  const atualizarDados = useCallback((produtoId: number, campo: string, valor: number) => {
    const campoReal = campo === 'mercadoriaAChegar' ? 'mercadoriaAChegarManual' : campo;

    setDadosEstoque(prev => {
      const atual = prev[produtoId] || {
        produtoId,
        estoqueInicial: 0,
        mercadoriaAChegarManual: 0,
        vendaTrimestre: 0,
      };
      return {
        ...prev,
        [produtoId]: { ...atual, [campoReal]: valor },
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
          mercadoriaAChegarManual: 0,
          vendaTrimestre: 0,
        };
        const { mercadoriaAChegar, ...rest } = parcial as any;
        const merged = { ...atual, ...rest, produtoId: id };
        if (mercadoriaAChegar !== undefined && rest.mercadoriaAChegarManual === undefined) {
          merged.mercadoriaAChegarManual = mercadoriaAChegar;
        }
        novo[id] = merged;
      });
      return novo;
    });
  }, []);

  // ---- Produtos com cálculos ----
  // CORREÇÃO: Usa taxaCambio dinâmica em vez de TAXA_CAMBIO constante

  const produtosComEstoque: ProdutoComEstoque[] = useMemo(() => {
    return produtos.map(p => {
      const dados = dadosEstoque[p.id] || {
        produtoId: p.id,
        estoqueInicial: 0,
        mercadoriaAChegarManual: 0,
        vendaTrimestre: 0,
      };

      const custoUsd = custosUsd[p.id] || p.custo_usd || 0;
      const custoBrl = custoUsd * taxaCambio; // CORREÇÃO: era TAXA_CAMBIO hardcoded

      const transitoInfo = emTransito.get(p.id);
      const mercadoriaAChegarConteiner = transitoInfo?.quantidade || 0;
      const processosVinculados = transitoInfo?.processos || [];

      const mercadoriaAChegarManual = dados.mercadoriaAChegarManual || 0;
      const mercadoriaAChegar = mercadoriaAChegarManual + mercadoriaAChegarConteiner;
      const estoqueProjetado = dados.estoqueInicial + mercadoriaAChegar;

      const vendaTrimestre = dados.vendaTrimestre || 0;
      const mediaMensal = vendaTrimestre > 0 ? vendaTrimestre / 3 : 0;
      const coberturaMeses = mediaMensal > 0 ? estoqueProjetado / mediaMensal : 0;

      const estoqueIdeal = mediaMensal * metaCobertura;
      const necessidadeCompra = Math.max(0, estoqueIdeal - estoqueProjetado);
      const valorCompraUsd = necessidadeCompra * custoUsd;
      const valorCompraBrl = valorCompraUsd * taxaCambio; // CORREÇÃO: era TAXA_CAMBIO

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
        processosVinculados,
      };
    });
  }, [dadosEstoque, custosUsd, taxaCambio, metaCobertura, emTransito]);

  // ---- KPIs ----
  // CORREÇÃO: Usa taxaCambio dinâmica

  const kpis: KPIsEstoque = useMemo(() => {
    const ativos = produtosComEstoque.filter(p => p.estoqueInicial > 0 || p.mercadoriaAChegar > 0 || p.vendaTrimestre > 0);
    const criticos = produtosComEstoque.filter(p => p.status === 'critico');
    const atencao = produtosComEstoque.filter(p => p.status === 'atencao');
    const ok = produtosComEstoque.filter(p => p.status === 'ok');
    const excesso = produtosComEstoque.filter(p => p.status === 'excesso');
    const semDados = produtosComEstoque.filter(p => p.status === 'sem_dados');

    const investimentoTotalUsd = produtosComEstoque.reduce((s, p) => s + p.valorCompraUsd, 0);
    const investimentoTotalBrl = investimentoTotalUsd * taxaCambio; // CORREÇÃO

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
  }, [produtosComEstoque, taxaCambio]);

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
