/*
  Hook useEstoque — Gestão de Estoque e Necessidade de Compra
  Persistência independente por comprador (Sarom / Alexandre)
  Cálculos automáticos: média mensal, cobertura, necessidade de compra, valor investimento
  VINCULAÇÃO AUTOMÁTICA: lê processos de contêiner em trânsito para alimentar "A Chegar"
*/

import { useState, useCallback, useEffect, useMemo } from 'react';
import { produtos, TAXA_CAMBIO } from '@/data/produtos';

// ---- Interfaces ----

export interface DadosEstoqueProduto {
  produtoId: number;
  estoqueInicial: number;
  mercadoriaAChegarManual: number; // preenchido manualmente pelo usuário
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
  mercadoriaAChegarManual: number;   // manual
  mercadoriaAChegarConteiner: number; // automático dos contêineres
  mercadoriaAChegar: number;          // total = manual + contêiner
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
  status: StatusEstoque;

  // Info de vinculação
  processosVinculados: string[]; // números dos processos que contribuem para "A Chegar"
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

  // Apenas processos "Em andamento" = mercadoria em trânsito
  const emAndamento = processos.filter(p => p.status === 'Em andamento');

  for (const processo of emAndamento) {
    for (const item of processo.itens) {
      const codigoUpper = item.codigo.toUpperCase();
      const produtoId = codigoMap.get(codigoUpper);
      if (!produtoId) continue;

      // Pegar a quantidade do comprador correto
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

    migrado[id] = {
      produtoId: id,
      estoqueInicial: valor.estoqueInicial || 0,
      // Se tinha mercadoriaAChegar antigo, migrar para mercadoriaAChegarManual
      mercadoriaAChegarManual: valor.mercadoriaAChegarManual ?? valor.mercadoriaAChegar ?? 0,
      vendaMes1: valor.vendaMes1 || 0,
      vendaMes2: valor.vendaMes2 || 0,
      vendaMes3: valor.vendaMes3 || 0,
    };
  }
  return migrado;
}

// ---- Hook Principal ----

export function useEstoque(comprador: 'sarom' | 'alexandre') {
  const storageKey = getStorageKey(comprador);
  const metaKey = getMetaKey(comprador);
  const codigoMap = useMemo(() => buildCodigoToIdMap(), []);

  // Estado: dados de estoque por produto (Map: produtoId -> DadosEstoqueProduto)
  const [dadosEstoque, setDadosEstoque] = useState<Record<number, DadosEstoqueProduto>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? migrarDadosAntigos(JSON.parse(stored)) : {};
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

  // Dados de contêineres em trânsito (atualizado periodicamente)
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

  // Recarregar dados de contêineres periodicamente (caso o Contêiner atualize)
  useEffect(() => {
    const atualizarTransito = () => {
      setEmTransito(calcularEmTransito(comprador, codigoMap));
    };

    // Atualizar a cada 3 segundos para captar mudanças no Contêiner
    const interval = setInterval(atualizarTransito, 3000);

    // Também escutar eventos de storage (caso outra aba mude os dados)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PROCESSOS) {
        atualizarTransito();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [comprador, codigoMap]);

  // ---- Funções de atualização ----

  const atualizarDados = useCallback((produtoId: number, campo: string, valor: number) => {
    // Mapear campo legado "mercadoriaAChegar" para "mercadoriaAChegarManual"
    const campoReal = campo === 'mercadoriaAChegar' ? 'mercadoriaAChegarManual' : campo;

    setDadosEstoque(prev => {
      const atual = prev[produtoId] || {
        produtoId,
        estoqueInicial: 0,
        mercadoriaAChegarManual: 0,
        vendaMes1: 0,
        vendaMes2: 0,
        vendaMes3: 0,
      };
      return {
        ...prev,
        [produtoId]: { ...atual, [campoReal]: valor },
      };
    });
  }, []);

  const atualizarDadosEmMassa = useCallback((dados: Record<number, Partial<DadosEstoqueProduto & { mercadoriaAChegar?: number }>>) => {
    setDadosEstoque(prev => {
      const novo = { ...prev };
      Object.entries(dados).forEach(([idStr, parcial]) => {
        const id = parseInt(idStr, 10);
        const atual = novo[id] || {
          produtoId: id,
          estoqueInicial: 0,
          mercadoriaAChegarManual: 0,
          vendaMes1: 0,
          vendaMes2: 0,
          vendaMes3: 0,
        };
        // Mapear campo legado
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

  const produtosComEstoque: ProdutoComEstoque[] = useMemo(() => {
    return produtos.map(p => {
      const dados = dadosEstoque[p.id] || {
        produtoId: p.id,
        estoqueInicial: 0,
        mercadoriaAChegarManual: 0,
        vendaMes1: 0,
        vendaMes2: 0,
        vendaMes3: 0,
      };

      const custoUsd = custosUsd[p.id] || p.custo_usd || 0;
      const custoBrl = custoUsd * TAXA_CAMBIO;

      // Dados de contêiner em trânsito
      const transitoInfo = emTransito.get(p.id);
      const mercadoriaAChegarConteiner = transitoInfo?.quantidade || 0;
      const processosVinculados = transitoInfo?.processos || [];

      // Bloco 2 — Posição de Estoque
      const mercadoriaAChegarManual = dados.mercadoriaAChegarManual || 0;
      const mercadoriaAChegar = mercadoriaAChegarManual + mercadoriaAChegarConteiner;
      const estoqueProjetado = dados.estoqueInicial + mercadoriaAChegar;

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
        mercadoriaAChegarManual,
        mercadoriaAChegarConteiner,
        mercadoriaAChegar,
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
        processosVinculados,
      };
    });
  }, [dadosEstoque, custosUsd, metaCobertura, emTransito]);

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
