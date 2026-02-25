import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { produtos } from '@/data/produtos';
import { trpc } from '@/lib/trpc';
import { NotificacoesPedidos, type Notificacao } from '@/components/NotificacoesPedidos';
import { OrderCard } from '@/components/OrderCard';
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Download,
  ArrowLeft,
  Search,
  Package,
  ChevronLeft,
  Send,
  CheckCheck,
  Clock,
} from 'lucide-react';

const formatUSD = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function Compras() {
  const [, setLocation] = useLocation();

  // Estado local
  const [pedidoAtivo, setPedidoAtivo] = useState<number | null>(null);
  const [novoNomePedido, setNovoNomePedido] = useState('');
  const [editandoNome, setEditandoNome] = useState<number | null>(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [qtdPorProduto, setQtdPorProduto] = useState<Record<number, { sarom: number; alexandre: number }>>({});
  const [statusFiltro, setStatusFiltro] = useState<'Todos' | 'Pendente' | 'Confirmado' | 'Recebido'>('Todos');
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);

  // Queries tRPC
  const { data: pedidosDb = [], isLoading: carregandoPedidos, refetch: recarregarPedidos } = trpc.pedido.getAll.useQuery();
  const { data: itensDoPedido = [], refetch: recarregarItens } = trpc.itemPedido.getByPedido.useQuery(
    { pedidoId: pedidoAtivo || 0 },
    { enabled: pedidoAtivo !== null && pedidoAtivo > 0 }
  );

  // Mutations tRPC
  const criarPedidoMutation = trpc.pedido.criar.useMutation();
  const deletarPedidoMutation = trpc.pedido.deletar.useMutation();
  const atualizarStatusMutation = trpc.pedido.atualizarStatus.useMutation();
  const adicionarItemMutation = trpc.itemPedido.adicionar.useMutation();
  const removerItemMutation = trpc.itemPedido.remover.useMutation();

  // Notificações
  const adicionarNotificacao = (tipo: 'sucesso' | 'erro' | 'info', mensagem: string) => {
    const id = `notif_${Date.now()}`;
    setNotificacoes(prev => [...prev, { id, tipo, mensagem }]);
    setTimeout(() => {
      setNotificacoes(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Pedidos filtrados
  const pedidosFiltrados = useMemo(() => {
    return pedidosDb.filter((p: any) => {
      return statusFiltro === 'Todos' || p.status === statusFiltro;
    });
  }, [pedidosDb, statusFiltro]);

  // Pedido ativo
  const pedidoAtivoObj = useMemo(() => {
    return pedidosDb.find((p: any) => p.id === pedidoAtivo) || null;
  }, [pedidosDb, pedidoAtivo]);

  // Produtos filtrados para busca
  const produtosFiltrados = useMemo(() => {
    if (!buscaProduto.trim()) return [];
    const q = buscaProduto.toLowerCase();
    return produtos.filter(p =>
      p.codigo.toLowerCase().includes(q) ||
      p.descricao.toLowerCase().includes(q) ||
      p.cod_barras.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [buscaProduto]);

  // Handlers
  const handleCriarPedido = async () => {
    if (!novoNomePedido.trim()) {
      adicionarNotificacao('erro', 'Digite um nome para o pedido');
      return;
    }
    try {
      const result = await criarPedidoMutation.mutateAsync({ nome: novoNomePedido });
      if (result) {
        adicionarNotificacao('sucesso', `Pedido "${novoNomePedido}" criado com sucesso!`);
        setPedidoAtivo(result.id);
        setNovoNomePedido('');
        recarregarPedidos();
      }
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao criar pedido');
    }
  };

  const handleDeletarPedido = async (pedidoId: number) => {
    if (!confirm('Tem certeza que deseja deletar este pedido?')) return;
    try {
      await deletarPedidoMutation.mutateAsync({ pedidoId });
      adicionarNotificacao('sucesso', 'Pedido deletado com sucesso!');
      if (pedidoAtivo === pedidoId) setPedidoAtivo(null);
      recarregarPedidos();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao deletar pedido');
    }
  };

  const handleAtualizarStatus = async (pedidoId: number, novoStatus: 'Pendente' | 'Confirmado' | 'Recebido') => {
    try {
      await atualizarStatusMutation.mutateAsync({ pedidoId, novoStatus });
      if (novoStatus === 'Confirmado') {
        adicionarNotificacao('sucesso', '✅ Pedido confirmado! Agora disponível para vincular ao Container.');
      } else if (novoStatus === 'Recebido') {
        adicionarNotificacao('sucesso', '✅ Pedido marcado como recebido!');
      } else {
        adicionarNotificacao('info', `Status atualizado para ${novoStatus}`);
      }
      recarregarPedidos();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao atualizar status');
    }
  };

  // Helpers para quantidades individuais por produto
  const getQtd = (produtoId: number) => qtdPorProduto[produtoId] || { sarom: 0, alexandre: 0 };
  const setQtdSarom = (produtoId: number, val: number) => {
    setQtdPorProduto(prev => ({ ...prev, [produtoId]: { ...getQtd(produtoId), sarom: val } }));
  };
  const setQtdAlexandre = (produtoId: number, val: number) => {
    setQtdPorProduto(prev => ({ ...prev, [produtoId]: { ...getQtd(produtoId), alexandre: val } }));
  };

  const handleAdicionarItem = async (produtoId: number) => {
    if (!pedidoAtivo) return;
    const qtd = getQtd(produtoId);
    if (qtd.sarom <= 0 && qtd.alexandre <= 0) {
      adicionarNotificacao('erro', 'Informe pelo menos uma quantidade');
      return;
    }
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    try {
      await adicionarItemMutation.mutateAsync({
        pedidoId: pedidoAtivo,
        produtoId: produto.codigo,
        quantidadeSarom: qtd.sarom,
        quantidadeAlexandre: qtd.alexandre,
        precoUnitario: produto.custo_usd,
      });
      adicionarNotificacao('sucesso', `${produto.codigo} adicionado ao pedido!`);
      // Limpar apenas este produto
      setQtdPorProduto(prev => {
        const copy = { ...prev };
        delete copy[produtoId];
        return copy;
      });
      recarregarItens();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao adicionar item');
    }
  };

  const handleRemoverItem = async (itemId: number) => {
    try {
      await removerItemMutation.mutateAsync({ itemId });
      adicionarNotificacao('sucesso', 'Item removido do pedido');
      recarregarItens();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao remover item');
    }
  };

  // Calcular totais do pedido ativo
  const totais = useMemo(() => {
    let totalSarom = 0;
    let totalAlexandre = 0;
    let totalItens = 0;
    itensDoPedido.forEach((item: any) => {
      const preco = parseFloat(item.precoUnitario) || 0;
      totalSarom += preco * (item.quantidadeSarom || 0);
      totalAlexandre += preco * (item.quantidadeAlexandre || 0);
      totalItens += (item.quantidadeSarom || 0) + (item.quantidadeAlexandre || 0);
    });
    return { totalSarom, totalAlexandre, totalGeral: totalSarom + totalAlexandre, totalItens };
  }, [itensDoPedido]);

  // Obter contagem de itens por pedido
  const { data: todosItens = [] } = trpc.itemPedido.getAll.useQuery();
  const getItemCount = (pedidoId: number) => {
    return todosItens.filter((i: any) => i.pedidoId === pedidoId).length;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pendente': return <Clock className="w-4 h-4" />;
      case 'Confirmado': return <Send className="w-4 h-4" />;
      case 'Recebido': return <CheckCheck className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'oklch(0.12 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
      {/* Botão Voltar */}
      <div className="px-4 md:px-6 py-3 border-b flex items-center gap-3" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        {pedidoAtivo ? (
          <button
            onClick={() => setPedidoAtivo(null)}
            className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
            style={{ background: 'oklch(0.16 0.005 285)', color: 'oklch(0.80 0.005 65)' }}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Voltar aos Pedidos</span>
          </button>
        ) : (
          <button
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
            style={{ background: 'oklch(0.16 0.005 285)', color: 'oklch(0.80 0.005 65)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Menu</span>
          </button>
        )}
        <span className="font-rajdhani font-bold text-lg tracking-wide" style={{ color: 'oklch(0.80 0.005 65)' }}>
          {pedidoAtivo ? `PEDIDO #${pedidoAtivo}` : 'GERENCIADOR DE PEDIDOS'}
        </span>
      </div>

      {/* ===== LISTA DE PEDIDOS (quando nenhum pedido está ativo) ===== */}
      {!pedidoAtivo && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Criar novo pedido */}
          <div className="border-b px-4 md:px-6 py-4" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'oklch(0.45 0.010 285)' }}>GERAR NOVO PEDIDO</p>
            <div className="flex gap-2 md:flex-row flex-col">
              <input
                type="text"
                placeholder="Nome do pedido..."
                value={novoNomePedido}
                onChange={e => setNovoNomePedido(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCriarPedido()}
                className="flex-1 px-4 py-3 rounded-md border text-sm h-11"
                style={{
                  background: 'oklch(0.18 0.005 285)',
                  borderColor: 'oklch(0.28 0.005 285)',
                  color: 'oklch(0.90 0.005 65)',
                }}
              />
              <button
                onClick={handleCriarPedido}
                disabled={criarPedidoMutation.isPending}
                className="px-4 py-3 rounded-md font-medium transition-colors flex items-center gap-2 h-11 md:w-auto w-full justify-center"
                style={{
                  background: 'oklch(0.48 0.22 25)',
                  color: 'white',
                  opacity: criarPedidoMutation.isPending ? 0.6 : 1,
                }}
              >
                <Plus className="w-4 h-4" />
                Novo Pedido
              </button>
            </div>
          </div>

          {/* Filtros de Status */}
          <div className="border-b px-4 md:px-6 py-3 flex gap-2 flex-wrap" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
            {(['Todos', 'Pendente', 'Confirmado', 'Recebido'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFiltro(s)}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0"
                style={{
                  background: statusFiltro === s ? 'oklch(0.48 0.22 25)' : 'oklch(0.18 0.005 285)',
                  color: statusFiltro === s ? 'white' : 'oklch(0.80 0.005 65)',
                  border: `1px solid ${statusFiltro === s ? 'oklch(0.48 0.22 25)' : 'oklch(0.26 0.005 285)'}`,
                }}
              >
                {s} ({pedidosDb.filter((p: any) => s === 'Todos' || p.status === s).length})
              </button>
            ))}
          </div>

          {/* Lista de Pedidos */}
          <div className="flex-1 overflow-auto p-4 md:p-6">
            {carregandoPedidos ? (
              <div className="flex items-center justify-center h-40">
                <p style={{ color: 'oklch(0.50 0.010 285)' }}>Carregando pedidos...</p>
              </div>
            ) : pedidosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Package className="w-12 h-12" style={{ color: 'oklch(0.30 0.010 285)' }} />
                <p style={{ color: 'oklch(0.50 0.010 285)' }}>Nenhum pedido encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pedidosFiltrados.map((p: any) => {
                  const itemCount = getItemCount(p.id);
                  const statusColor = p.status === 'Pendente' ? 'oklch(0.65 0.22 25)' : p.status === 'Confirmado' ? 'oklch(0.48 0.22 250)' : 'oklch(0.72 0.17 145)';

                  return (
                    <div
                      key={p.id}
                      className="p-4 rounded-lg border cursor-pointer transition-all hover:brightness-110"
                      style={{
                        background: 'oklch(0.14 0.005 285)',
                        borderColor: 'oklch(0.26 0.005 285)',
                      }}
                      onClick={() => setPedidoAtivo(p.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-rajdhani font-bold text-sm" style={{ color: 'oklch(0.50 0.010 285)' }}>
                              #{p.id}
                            </span>
                            <p className="font-medium truncate" style={{ color: 'oklch(0.90 0.005 65)' }}>
                              {p.nome}
                            </p>
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>
                            {itemCount} {itemCount === 1 ? 'item' : 'itens'} • {new Date(p.dataCreacao).toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Status Badge */}
                          <div
                            className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 flex-shrink-0"
                            style={{ background: statusColor, color: 'white' }}
                          >
                            {getStatusIcon(p.status)}
                            {p.status}
                          </div>

                          {/* Botão Deletar */}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleDeletarPedido(p.id);
                            }}
                            className="p-2 rounded-md transition-colors hover:opacity-75"
                            style={{ color: 'oklch(0.65 0.22 25)' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== DETALHES DO PEDIDO (quando um pedido está ativo) ===== */}
      {pedidoAtivo && pedidoAtivoObj && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Info do Pedido */}
          <div className="border-b px-4 md:px-6 py-4" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="font-rajdhani font-bold text-xl" style={{ color: 'oklch(0.90 0.005 65)' }}>
                  {pedidoAtivoObj.nome}
                </h2>
                <p className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Criado em {new Date(pedidoAtivoObj.dataCreacao).toLocaleDateString('pt-BR')} • {itensDoPedido.length} {itensDoPedido.length === 1 ? 'item' : 'itens'}
                </p>
              </div>

              {/* Status + Ações */}
              <div className="flex items-center gap-2 flex-wrap">
                {(['Pendente', 'Confirmado', 'Recebido'] as const).map(s => {
                  const isActive = pedidoAtivoObj.status === s;
                  const color = s === 'Pendente' ? 'oklch(0.65 0.22 25)' : s === 'Confirmado' ? 'oklch(0.48 0.22 250)' : 'oklch(0.72 0.17 145)';
                  return (
                    <button
                      key={s}
                      onClick={() => !isActive && handleAtualizarStatus(pedidoAtivo, s)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1"
                      style={{
                        background: isActive ? color : 'oklch(0.18 0.005 285)',
                        color: isActive ? 'white' : 'oklch(0.60 0.010 285)',
                        border: `1px solid ${isActive ? color : 'oklch(0.26 0.005 285)'}`,
                      }}
                    >
                      {getStatusIcon(s)}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Totais */}
            {itensDoPedido.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="p-3 rounded-lg" style={{ background: 'oklch(0.18 0.005 285)' }}>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Qtd Total</p>
                  <p className="font-rajdhani font-bold text-lg" style={{ color: 'oklch(0.85 0.005 65)' }}>{totais.totalItens}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'oklch(0.18 0.005 285)' }}>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Total Sarom</p>
                  <p className="font-rajdhani font-bold text-lg" style={{ color: 'oklch(0.70 0.12 250)' }}>{formatUSD(totais.totalSarom)}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'oklch(0.18 0.005 285)' }}>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Total Alexandre</p>
                  <p className="font-rajdhani font-bold text-lg" style={{ color: 'oklch(0.70 0.12 145)' }}>{formatUSD(totais.totalAlexandre)}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'oklch(0.18 0.005 285)' }}>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Total Geral</p>
                  <p className="font-rajdhani font-bold text-lg" style={{ color: 'oklch(0.48 0.22 25)' }}>{formatUSD(totais.totalGeral)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Conteúdo do Pedido */}
          <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
            {/* Adicionar Produto */}
            <div className="p-4 rounded-lg border" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'oklch(0.80 0.005 65)' }}>
                <Plus className="w-4 h-4" style={{ color: 'oklch(0.48 0.22 25)' }} />
                Adicionar Produto ao Pedido
              </h3>

              {/* Busca de produto */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'oklch(0.50 0.010 285)' }} />
                <input
                  type="text"
                  placeholder="Buscar por código, nome ou cód. barras..."
                  value={buscaProduto}
                  onChange={e => setBuscaProduto(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-md border text-sm h-11"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.28 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
                {buscaProduto && (
                  <button onClick={() => setBuscaProduto('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5" style={{ color: 'oklch(0.60 0.010 285)' }} />
                  </button>
                )}
              </div>

              {/* Resultados da busca */}
              {produtosFiltrados.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-auto mb-3">
                  {produtosFiltrados.map(produto => (
                    <div
                      key={produto.id}
                      className="p-3 rounded-md border"
                      style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.24 0.005 285)' }}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-rajdhani font-bold text-sm" style={{ color: 'oklch(0.48 0.22 25)' }}>
                            {produto.codigo}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'oklch(0.70 0.010 285)' }}>
                            {produto.descricao}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>
                            Custo: {formatUSD(produto.custo_usd)} • Venda: R$ {produto.preco_venda.toFixed(2)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex flex-col items-center">
                            <label className="text-[10px] uppercase" style={{ color: 'oklch(0.45 0.010 285)' }}>Sarom</label>
                            <input
                              type="number"
                              min="0"
                              value={getQtd(produto.id).sarom}
                              onChange={e => setQtdSarom(produto.id, parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1.5 rounded border text-center text-sm"
                              style={{
                                background: 'oklch(0.18 0.005 285)',
                                borderColor: 'oklch(0.28 0.005 285)',
                                color: 'oklch(0.90 0.005 65)',
                              }}
                            />
                          </div>
                          <div className="flex flex-col items-center">
                            <label className="text-[10px] uppercase" style={{ color: 'oklch(0.45 0.010 285)' }}>Alexandre</label>
                            <input
                              type="number"
                              min="0"
                              value={getQtd(produto.id).alexandre}
                              onChange={e => setQtdAlexandre(produto.id, parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1.5 rounded border text-center text-sm"
                              style={{
                                background: 'oklch(0.18 0.005 285)',
                                borderColor: 'oklch(0.28 0.005 285)',
                                color: 'oklch(0.90 0.005 65)',
                              }}
                            />
                          </div>
                          <button
                            onClick={() => handleAdicionarItem(produto.id)}
                            disabled={adicionarItemMutation.isPending}
                            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors mt-3"
                            style={{
                              background: 'oklch(0.48 0.22 25)',
                              color: 'white',
                              opacity: adicionarItemMutation.isPending ? 0.6 : 1,
                            }}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {buscaProduto.trim() && produtosFiltrados.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Nenhum produto encontrado para "{buscaProduto}"
                </p>
              )}
            </div>

            {/* Lista de Itens do Pedido */}
            <div className="p-4 rounded-lg border" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'oklch(0.80 0.005 65)' }}>
                Itens do Pedido ({itensDoPedido.length})
              </h3>

              {itensDoPedido.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-10 h-10 mx-auto mb-2" style={{ color: 'oklch(0.30 0.010 285)' }} />
                  <p className="text-sm" style={{ color: 'oklch(0.50 0.010 285)' }}>
                    Nenhum item adicionado ainda. Use a busca acima para adicionar produtos.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Header Desktop */}
                  <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider font-semibold"
                    style={{ color: 'oklch(0.45 0.010 285)' }}>
                    <div className="col-span-2">Código</div>
                    <div className="col-span-3">Produto</div>
                    <div className="col-span-1 text-center">Custo USD</div>
                    <div className="col-span-1 text-center">Qtd Sarom</div>
                    <div className="col-span-1 text-center">Qtd Alexandre</div>
                    <div className="col-span-1 text-center">Subtotal Sarom</div>
                    <div className="col-span-1 text-center">Subtotal Alex</div>
                    <div className="col-span-1 text-center">Total</div>
                    <div className="col-span-1 text-center">Ação</div>
                  </div>

                  {itensDoPedido.map((item: any) => {
                    const produto = produtos.find(p => p.codigo === item.produtoId);
                    const preco = parseFloat(item.precoUnitario) || 0;
                    const subtotalSarom = preco * (item.quantidadeSarom || 0);
                    const subtotalAlexandre = preco * (item.quantidadeAlexandre || 0);
                    const total = subtotalSarom + subtotalAlexandre;

                    return (
                      <div key={item.id}>
                        {/* Desktop */}
                        <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-3 rounded-md items-center"
                          style={{ background: 'oklch(0.16 0.005 285)' }}>
                          <div className="col-span-2 font-rajdhani font-bold text-sm" style={{ color: 'oklch(0.48 0.22 25)' }}>
                            {item.produtoId}
                          </div>
                          <div className="col-span-3 text-xs truncate" style={{ color: 'oklch(0.70 0.010 285)' }}>
                            {produto?.descricao || 'Produto não encontrado'}
                          </div>
                          <div className="col-span-1 text-center text-xs" style={{ color: 'oklch(0.80 0.005 65)' }}>
                            {formatUSD(preco)}
                          </div>
                          <div className="col-span-1 text-center text-sm font-medium" style={{ color: 'oklch(0.70 0.12 250)' }}>
                            {item.quantidadeSarom}
                          </div>
                          <div className="col-span-1 text-center text-sm font-medium" style={{ color: 'oklch(0.70 0.12 145)' }}>
                            {item.quantidadeAlexandre}
                          </div>
                          <div className="col-span-1 text-center text-xs" style={{ color: 'oklch(0.70 0.12 250)' }}>
                            {formatUSD(subtotalSarom)}
                          </div>
                          <div className="col-span-1 text-center text-xs" style={{ color: 'oklch(0.70 0.12 145)' }}>
                            {formatUSD(subtotalAlexandre)}
                          </div>
                          <div className="col-span-1 text-center text-xs font-bold" style={{ color: 'oklch(0.48 0.22 25)' }}>
                            {formatUSD(total)}
                          </div>
                          <div className="col-span-1 text-center">
                            <button
                              onClick={() => handleRemoverItem(item.id)}
                              className="p-1.5 rounded transition-colors hover:opacity-75"
                              style={{ color: 'oklch(0.65 0.22 25)' }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Mobile */}
                        <div className="md:hidden p-3 rounded-md space-y-2"
                          style={{ background: 'oklch(0.16 0.005 285)' }}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-rajdhani font-bold text-sm" style={{ color: 'oklch(0.48 0.22 25)' }}>
                                {item.produtoId}
                              </p>
                              <p className="text-xs truncate" style={{ color: 'oklch(0.70 0.010 285)' }}>
                                {produto?.descricao || 'Produto não encontrado'}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoverItem(item.id)}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: 'oklch(0.65 0.22 25)' }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p style={{ color: 'oklch(0.45 0.010 285)' }}>Custo</p>
                              <p style={{ color: 'oklch(0.80 0.005 65)' }}>{formatUSD(preco)}</p>
                            </div>
                            <div>
                              <p style={{ color: 'oklch(0.45 0.010 285)' }}>Sarom</p>
                              <p style={{ color: 'oklch(0.70 0.12 250)' }}>{item.quantidadeSarom}</p>
                            </div>
                            <div>
                              <p style={{ color: 'oklch(0.45 0.010 285)' }}>Alexandre</p>
                              <p style={{ color: 'oklch(0.70 0.12 145)' }}>{item.quantidadeAlexandre}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold" style={{ color: 'oklch(0.48 0.22 25)' }}>
                              Total: {formatUSD(total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notificações */}
      <NotificacoesPedidos notificacoes={notificacoes} />
    </div>
  );
}
