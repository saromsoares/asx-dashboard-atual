import { usePedidos } from './usePedidos';
import { useCustosDB as useCustos } from './useCustosDB';
import { useCallback } from 'react';
import { trpc } from '@/lib/trpc';

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

/**
 * Calcula total embarcado por produto a partir dos processos SR do banco de dados.
 */
function calcularEmbarcadoPorProcessos(
  processos: any[],
  todosItens: any[]
): Map<string, { sarom: number; alexandre: number }> {
  const resultado = new Map<string, { sarom: number; alexandre: number }>();

  // Agrupar itens por processoId
  const itensMap = new Map<number, any[]>();
  for (const item of todosItens) {
    const list = itensMap.get(item.processoId) || [];
    list.push(item);
    itensMap.set(item.processoId, list);
  }

  const validos = processos.filter(p =>
    p.status === 'Em andamento' || p.status === 'Finalizado' || p.confirmado === 1
  );

  for (const processo of validos) {
    const itens = itensMap.get(processo.id) || [];
    for (const item of itens) {
      const codigo = item.codigo.toUpperCase();
      const atual = resultado.get(codigo) || { sarom: 0, alexandre: 0 };
      atual.sarom += item.pedidoSarom || 0;
      atual.alexandre += item.pedidoAlexandre || 0;
      resultado.set(codigo, atual);
    }
  }

  return resultado;
}

export function useAnaliseEstoqueSimples() {
  const { pedidos } = usePedidos();
  const { taxaCambio } = useCustos();

  // Buscar processos SR e itens do banco de dados via tRPC
  const { data: processosSR } = trpc.processoSR.getAll.useQuery();
  const { data: todosItens } = trpc.itemProcesso.getAll.useQuery();

  // Calcular embarcado a partir dos dados do banco
  const embarcadoMap = (() => {
    if (!processosSR || !todosItens) return new Map<string, { sarom: number; alexandre: number }>();
    return calcularEmbarcadoPorProcessos(processosSR, todosItens);
  })();

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

    // TOTAL EMBARCADO: itens dos processos SR do banco
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
