import { usePedidos } from './usePedidos';
import { useCustosDB as useCustos } from './useCustosDB';
import { useState, useEffect, useCallback } from 'react';

export interface AnaliseEstoqueItem {
  produtoId: number;
  codigo: string;
  descricao: string;
  estoqueAtual: number;
  dataEstoque: string;
  totalOrdens: number;
  totalEmbarcado: number;
  estoquePlusPedidos: number;
  precoCustoUSD: number;
  precoCustoBRL: number;
  precoVenda: number;
  margemUnitaria: number;
  markupPct: number;
  investimentoEstoque: number;
}

// ===== Leitura dos Processos SR do Contêiner =====
const STORAGE_KEY_PROCESSOS = 'asx_processos_sr';
const STORAGE_KEY_CONFIRMADOS = 'asx_processos_confirmados';

function calcularEmbarcadoSR(): Map<string, { sarom: number; alexandre: number }> {
  const resultado = new Map<string, { sarom: number; alexandre: number }>();
  try {
    const dados = localStorage.getItem(STORAGE_KEY_PROCESSOS);
    if (!dados) return resultado;
    const processos: any[] = JSON.parse(dados);

    let confirmados = new Set<string>();
    try {
      const confDados = localStorage.getItem(STORAGE_KEY_CONFIRMADOS);
      if (confDados) confirmados = new Set(JSON.parse(confDados));
    } catch { /* ignore */ }

    const validos = processos.filter(p =>
      p.status === 'Em andamento' || p.status === 'Finalizado' || confirmados.has(p.id)
    );

    for (const processo of validos) {
      for (const item of processo.itens) {
        const codigo = item.codigo.toUpperCase();
        const atual = resultado.get(codigo) || { sarom: 0, alexandre: 0 };
        atual.sarom += item.pedidoSarom || 0;
        atual.alexandre += item.pedidoAlexandre || 0;
        resultado.set(codigo, atual);
      }
    }
  } catch { /* ignore */ }
  return resultado;
}

export function useAnaliseEstoqueSimples() {
  const { pedidos } = usePedidos();
  const { taxaCambio } = useCustos();

  const [embarcadoMap, setEmbarcadoMap] = useState(() => calcularEmbarcadoSR());

  useEffect(() => {
    const atualizar = () => setEmbarcadoMap(calcularEmbarcadoSR());
    window.addEventListener('asx_processos_changed', atualizar);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PROCESSOS || e.key === STORAGE_KEY_CONFIRMADOS) atualizar();
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
    precoCustoUSD: number,
    precoVenda: number,
    filtroComprador?: 'sarom' | 'alexandre'
  ): AnaliseEstoqueItem => {
    // TOTAL ORDENS: pedidos confirmados do banco (tRPC)
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

    // TOTAL EMBARCADO: itens dos processos SR do Contêiner
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

    // Cálculos de preço e margem
    const taxa = taxaCambio || 8.5;
    const precoCustoBRL = precoCustoUSD * taxa;
    const margemUnitaria = precoVenda - precoCustoBRL;
    const markupPct = precoCustoBRL > 0 ? (margemUnitaria / precoCustoBRL) * 100 : 0;
    
    // Investimento em estoque
    const estoquePlusPedidos = estoqueAtual + totalOrdens;
    const investimentoEstoque = estoqueAtual * precoCustoBRL;

    return {
      produtoId,
      codigo,
      descricao,
      estoqueAtual,
      dataEstoque,
      totalOrdens,
      totalEmbarcado,
      estoquePlusPedidos,
      precoCustoUSD,
      precoCustoBRL: Math.round(precoCustoBRL * 100) / 100,
      precoVenda,
      margemUnitaria: Math.round(margemUnitaria * 100) / 100,
      markupPct: Math.round(markupPct * 100) / 100,
      investimentoEstoque: Math.round(investimentoEstoque * 100) / 100,
    };
  }, [pedidos, embarcadoMap, taxaCambio]);

  return { analisarProduto };
}
