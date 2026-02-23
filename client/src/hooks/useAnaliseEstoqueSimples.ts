import { useEmbarques } from './useEmbarques';
import { usePedidos } from './usePedidos';
import { useCustos } from './useCustos';

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

export function useAnaliseEstoqueSimples() {
  const { pedidos } = usePedidos();
  const { embarques } = useEmbarques();
  const { taxaCambio } = useCustos();

  const analisarProduto = (
    produtoId: number,
    codigo: string,
    descricao: string,
    estoqueAtual: number,
    dataEstoque: string,
    precoCustoUSD: number,
    precoVenda: number,
    filtroComprador?: 'sarom' | 'alexandre'
  ): AnaliseEstoqueItem => {
    // Calcular total de ordens confirmadas
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

    // Calcular total embarcado
    let totalEmbarcado = 0;
    embarques.forEach((embarque: any) => {
      embarque.embarques.forEach((item: any) => {
        if (item.produtoId === produtoId) {
          if (filtroComprador === 'sarom') {
            totalEmbarcado += item.qtdSaromEmbarque;
          } else if (filtroComprador === 'alexandre') {
            totalEmbarcado += item.qtdAlexandreEmbarque;
          } else {
            totalEmbarcado += item.qtdSaromEmbarque + item.qtdAlexandreEmbarque;
          }
        }
      });
    });

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
  };

  return { analisarProduto };
}
