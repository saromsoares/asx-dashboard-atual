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

export function useAnaliseEstoque() {
  const { pedidos } = usePedidos();
  const { embarques } = useEmbarques();
  const { custos } = useCustos();

  const analisarProduto = (
    produtoId: number,
    codigo: string,
    descricao: string,
    estoqueAtual: number,
    dataEstoque: string,
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

    // Sugestão de compra: manter 3 meses de estoque
    const metaEstoque3meses = (vendas3meses / 3) * 3; // 3 meses de venda
    const sugestaoCompra = Math.max(0, Math.ceil(metaEstoque3meses - estoquePlusPedidos));

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
  };

  return { analisarProduto, VENDAS_HISTORICAS };
}
