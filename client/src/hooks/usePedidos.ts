import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { produtos as produtosCatalogo } from '@/data/produtos';

/**
 * usePedidos — Hook de leitura de pedidos via tRPC (banco de dados)
 * 
 * MIGRADO: Anteriormente usava localStorage, agora busca do banco via tRPC.
 * 
 * Interface mantida compatível com os consumers existentes:
 * - useAnaliseEstoque
 * - useAnaliseEstoqueSimples
 * - VinculadorEmbarques
 * 
 * Para CRIAR/DELETAR/ATUALIZAR pedidos, use as mutations tRPC diretamente
 * em cada página (Compras.tsx já faz isso).
 */

export interface ItemPedido {
  produtoId: number;      // ID numérico do produto (do catálogo estático)
  produtoCodigo: string;  // Código do produto (ex: "ASX1001") — usado internamente para match com tRPC
  codigo: string;
  nome: string;
  precoUSD: number;
  qtdSarom: number;
  qtdAlexandre: number;
}

export interface Pedido {
  id: string;             // String para compatibilidade com useEmbarques
  idNumerico: number;     // ID numérico original do banco
  nome: string;
  items: ItemPedido[];
  confirmado: boolean;
  status: 'Pendente' | 'Confirmado' | 'Recebido';
  dataCriacao: string;
  dataAtualizacao: string;
}

export function usePedidos() {
  // Buscar pedidos e itens do banco via tRPC
  const { data: pedidosDb = [], isLoading: carregandoPedidos } = trpc.pedido.getAll.useQuery();
  const { data: todosItensDb = [], isLoading: carregandoItens } = trpc.itemPedido.getAll.useQuery();

  // Montar pedidos com itens embarcados no formato esperado pelos consumers
  const pedidos: Pedido[] = useMemo(() => {
    if (!pedidosDb.length) return [];

    // Criar mapa de código do produto → dados do catálogo
    const catalogoMap = new Map(produtosCatalogo.map(p => [p.codigo, p]));

    return pedidosDb.map((p: any) => {
      // Filtrar itens deste pedido
      const itensDestePedido = todosItensDb.filter((i: any) => i.pedidoId === p.id);

      // Mapear itens para o formato esperado
      const items: ItemPedido[] = itensDestePedido.map((item: any) => {
        const prodCatalogo = catalogoMap.get(item.produtoId);
        return {
          produtoId: prodCatalogo?.id ?? 0,
          produtoCodigo: item.produtoId, // Código string do banco (ex: "ASX1001")
          codigo: item.produtoId,
          nome: prodCatalogo?.descricao ?? item.produtoId,
          precoUSD: parseFloat(item.precoUnitario) || prodCatalogo?.custo_usd || 0,
          qtdSarom: item.quantidadeSarom ?? 0,
          qtdAlexandre: item.quantidadeAlexandre ?? 0,
        };
      });

      return {
        id: String(p.id),           // String para compatibilidade com useEmbarques
        idNumerico: p.id,
        nome: p.nome,
        items,
        confirmado: p.status === 'Confirmado',
        status: p.status as 'Pendente' | 'Confirmado' | 'Recebido',
        dataCriacao: p.dataCreacao ? new Date(p.dataCreacao).toISOString() : new Date().toISOString(),
        dataAtualizacao: p.dataAtualizacao ? new Date(p.dataAtualizacao).toISOString() : new Date().toISOString(),
      };
    });
  }, [pedidosDb, todosItensDb]);

  const carregado = !carregandoPedidos && !carregandoItens;

  // Calcular totais (mantido para compatibilidade)
  const calcularTotais = (pedido: Pedido) => {
    let totalSarom = 0;
    let totalAlexandre = 0;
    let totalGeral = 0;

    pedido.items.forEach(item => {
      const subtotalSarom = item.precoUSD * item.qtdSarom;
      const subtotalAlexandre = item.precoUSD * item.qtdAlexandre;
      totalSarom += subtotalSarom;
      totalAlexandre += subtotalAlexandre;
      totalGeral += subtotalSarom + subtotalAlexandre;
    });

    return { totalSarom, totalAlexandre, totalGeral };
  };

  return {
    pedidos,
    carregado,
    calcularTotais,
  };
}
