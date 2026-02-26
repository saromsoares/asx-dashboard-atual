import { usePedidos } from './usePedidos';
import { useCustosDB as useCustos } from './useCustosDB';
import { useState, useEffect, useCallback } from 'react';
import { produtos as produtosCatalogo } from '@/data/produtos';

export interface AnaliseEstoqueItem {
  produtoId: number;
  codigo: string;
  descricao: string;
  estoqueAtual: number;
  dataEstoque: string;
  totalOrdens: number;
  estoquePlusPedidos: number;
  duracao6meses: number;
  duracao3meses: number;
  totalEmbarcado: number;
  duracao6mesesEmbarc: number;
  duracao3mesesEmbarc: number;
  vendas6meses: number;
  vendas3meses: number;
  sugestaoCompra: number;
  duracao6mesesCompras: number;
  duracao3mesesCompras: number;
}

// Dados simulados de vendas históricas (em produção, viriam de um backend)
const VENDAS_HISTORICAS: Record<string, { vendas6m: number; vendas3m: number }> = {
  'ASX1001': { vendas6m: 120, vendas3m: 65 },
  'ASX1003': { vendas6m: 95, vendas3m: 48 },
  'ASX1004': { vendas6m: 180, vendas3m: 95 },
  'ASX1007': { vendas6m: 110, vendas3m: 58 },
  'ASX1011': { vendas6m: 140, vendas3m: 75 },
  'ASX1013': { vendas6m: 45, vendas3m: 22 },
  'ASX1015': { vendas6m: 60, vendas3m: 28 },
  'ASX1016': { vendas6m: 130, vendas3m: 70 },
  'ASX1027': { vendas6m: 200, vendas3m: 110 },
  'ASX1066': { vendas6m: 150, vendas3m: 80 },
  'ASX1012': { vendas6m: 85, vendas3m: 45 },
  'ASX1021': { vendas6m: 75, vendas3m: 40 },
};

// ===== Leitura dos Processos SR do Contêiner (fonte real do TOTAL EMBARCADO) =====
const STORAGE_KEY_PROCESSOS = 'asx_processos_sr';
const STORAGE_KEY_CONFIRMADOS = 'asx_processos_confirmados';

interface ItemConteinerSR {
  codigo: string;
  quantidade: number;
  pedidoSarom: number;
  pedidoAlexandre: number;
}

interface ProcessoSR {
  id: string;
  itens: ItemConteinerSR[];
  status: string;
}

/**
 * Calcula total embarcado por produto a partir dos processos SR do Contêiner.
 * Lê de asx_processos_sr (mesma fonte que useEstoque.calcularEmTransito).
 * 
 * Retorna Map<codigoUpperCase, { sarom: number, alexandre: number }>
 */
function calcularEmbarcadoPorProcessosSR(): Map<string, { sarom: number; alexandre: number }> {
  const resultado = new Map<string, { sarom: number; alexandre: number }>();

  try {
    const dados = localStorage.getItem(STORAGE_KEY_PROCESSOS);
    if (!dados) return resultado;
    const processos: ProcessoSR[] = JSON.parse(dados);

    // Carregar processos confirmados
    let confirmados = new Set<string>();
    try {
      const confDados = localStorage.getItem(STORAGE_KEY_CONFIRMADOS);
      if (confDados) confirmados = new Set(JSON.parse(confDados));
    } catch { /* ignore */ }

    // Incluir processos "Em andamento" ou confirmados (itens que estão em trânsito/embarcados)
    const processosValidos = processos.filter(p =>
      p.status === 'Em andamento' || p.status === 'Finalizado' || confirmados.has(p.id)
    );

    for (const processo of processosValidos) {
      for (const item of processo.itens) {
        const codigo = item.codigo.toUpperCase();
        const atual = resultado.get(codigo) || { sarom: 0, alexandre: 0 };
        atual.sarom += item.pedidoSarom || 0;
        atual.alexandre += item.pedidoAlexandre || 0;
        resultado.set(codigo, atual);
      }
    }
  } catch (e) {
    console.error('Erro ao calcular embarcado dos processos SR:', e);
  }

  return resultado;
}

export function useAnaliseEstoque() {
  const { pedidos } = usePedidos();
  const { custos } = useCustos();

  // Estado reativo para embarcados (lê do localStorage dos processos SR)
  const [embarcadoMap, setEmbarcadoMap] = useState<Map<string, { sarom: number; alexandre: number }>>(
    () => calcularEmbarcadoPorProcessosSR()
  );

  // Atualizar embarcado quando processos SR mudam
  useEffect(() => {
    const atualizar = () => setEmbarcadoMap(calcularEmbarcadoPorProcessosSR());

    // Escutar evento customizado (mesma aba — disparado pelo Conteiner.tsx)
    window.addEventListener('asx_processos_changed', atualizar);
    // Escutar evento de storage (outra aba)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PROCESSOS || e.key === STORAGE_KEY_CONFIRMADOS) {
        atualizar();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('asx_processos_changed', atualizar);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const analisarProduto = useCallback((
    produtoId: number,
    codigo: string,
    descricao: string,
    estoqueAtual: number,
    dataEstoque: string,
    filtroComprador?: 'sarom' | 'alexandre'
  ): AnaliseEstoqueItem => {
    // ===== TOTAL ORDENS: pedidos confirmados do banco (tRPC) =====
    let totalOrdens = 0;
    pedidos.forEach(pedido => {
      if (pedido.confirmado) {
        pedido.items.forEach(item => {
          if (item.produtoId === produtoId) {
            if (filtroComprador === 'sarom') {
              totalOrdens += item.qtdSarom;
            } else if (filtroComprador === 'alexandre') {
              totalOrdens += item.qtdAlexandre;
            } else {
              totalOrdens += item.qtdSarom + item.qtdAlexandre;
            }
          }
        });
      }
    });

    // ===== TOTAL EMBARCADO: itens dos processos SR do Contêiner =====
    let totalEmbarcado = 0;
    const embarcadoItem = embarcadoMap.get(codigo.toUpperCase());
    if (embarcadoItem) {
      if (filtroComprador === 'sarom') {
        totalEmbarcado = embarcadoItem.sarom;
      } else if (filtroComprador === 'alexandre') {
        totalEmbarcado = embarcadoItem.alexandre;
      } else {
        totalEmbarcado = embarcadoItem.sarom + embarcadoItem.alexandre;
      }
    }

    // Obter vendas históricas
    const vendas = VENDAS_HISTORICAS[codigo] || { vendas6m: 50, vendas3m: 25 };
    const vendas6meses = vendas.vendas6m;
    const vendas3meses = vendas.vendas3m;

    // Cálculos de duração
    const estoquePlusPedidos = estoqueAtual + totalOrdens;
    const duracao6meses = vendas6meses > 0 ? estoquePlusPedidos / (vendas6meses / 6) : 0;
    const duracao3meses = vendas3meses > 0 ? estoquePlusPedidos / (vendas3meses / 3) : 0;

    // Duração com embarque
    const estoqueComEmbarque = estoqueAtual + totalEmbarcado;
    const duracao6mesesEmbarc = vendas6meses > 0 ? estoqueComEmbarque / (vendas6meses / 6) : 0;
    const duracao3mesesEmbarc = vendas3meses > 0 ? estoqueComEmbarque / (vendas3meses / 3) : 0;

    // Sugestão de compra: manter 6 meses de estoque
    const metaEstoque6meses = (vendas6meses / 6) * 6; // 6 meses de venda
    const sugestaoCompra = Math.max(0, Math.ceil(metaEstoque6meses - estoquePlusPedidos));

    // Duração com compra sugerida
    const estoqueComCompra = estoquePlusPedidos + sugestaoCompra;
    const duracao6mesesCompras = vendas6meses > 0 ? estoqueComCompra / (vendas6meses / 6) : 0;
    const duracao3mesesCompras = vendas3meses > 0 ? estoqueComCompra / (vendas3meses / 3) : 0;

    return {
      produtoId,
      codigo,
      descricao,
      estoqueAtual,
      dataEstoque,
      totalOrdens,
      estoquePlusPedidos,
      duracao6meses: Math.round(duracao6meses * 10) / 10,
      duracao3meses: Math.round(duracao3meses * 10) / 10,
      totalEmbarcado,
      duracao6mesesEmbarc: Math.round(duracao6mesesEmbarc * 10) / 10,
      duracao3mesesEmbarc: Math.round(duracao3mesesEmbarc * 10) / 10,
      vendas6meses,
      vendas3meses,
      sugestaoCompra,
      duracao6mesesCompras: Math.round(duracao6mesesCompras * 10) / 10,
      duracao3mesesCompras: Math.round(duracao3mesesCompras * 10) / 10,
    };
  }, [pedidos, embarcadoMap]);

  return { analisarProduto, VENDAS_HISTORICAS };
}
