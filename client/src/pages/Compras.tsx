import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { produtos } from '@/data/produtos';
import { usePedidosSync, type ItemPedido } from '@/hooks/usePedidosSync';
import { useIdioma } from '@/hooks/useIdioma';
import { NotificacoesPedidos } from '@/components/NotificacoesPedidos';
import { OrderCard } from '@/components/OrderCard';
import XLSX from 'xlsx-js-style';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Edit2,
  X,
  Download,
  FileText,
  ArrowLeft,
  Zap,
  Clock,
  Send,
  CheckCheck,
} from 'lucide-react';

const formatUSD = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function Compras() {
  const [, setLocation] = useLocation();
  const { t } = useIdioma();
  const {
    pedidos,
    criarPedido,
    deletarPedido,
    atualizarNomePedido,
    adicionarItem,
    removerItem,
    atualizarStatusPedido,
    calcularTotais,
    notificacoes,
    carregando,
  } = usePedidosSync();

  const [pedidoAtivo, setPedidoAtivo] = useState<number | null>(null);
  const [novoNomePedido, setNovoNomePedido] = useState('');
  const [editandoNome, setEditandoNome] = useState<number | null>(null);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState<number | null>(null);
  const [qtdSarom, setQtdSarom] = useState(0);
  const [qtdAlexandre, setQtdAlexandre] = useState(0);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('Todas');
  const [statusFiltro, setStatusFiltro] = useState<'Todos' | 'Pendente' | 'Confirmado' | 'Recebido'>('Todos');

  const categorias = Array.from(new Set(produtos.map(p => p.categoria)));

  const pedidosFiltrados = pedidos.filter(p => {
    const matchStatus = statusFiltro === 'Todos' || p.status === statusFiltro;
    return matchStatus;
  });

  const handleCriarPedido = () => {
    if (novoNomePedido.trim()) {
      criarPedido(novoNomePedido);
      setNovoNomePedido('');
    }
  };

  const handleAdicionarItem = () => {
    if (pedidoAtivo && produtoSelecionado && (qtdSarom > 0 || qtdAlexandre > 0)) {
      // adicionarItem(pedidoAtivo, produtoSelecionado, qtdSarom, qtdAlexandre);
      setQtdSarom(0);
      setQtdAlexandre(0);
      setProdutoSelecionado(null);
    }
  };

  const handleExportarXLSX = () => {
    const ws_data = [
      ['Pedido', 'Status', 'Data', 'Produto', 'Qtd Sarom', 'Qtd Alexandre', 'Valor Unitário', 'Total'],
      ...pedidosFiltrados.flatMap(p =>
        p.items.map((i: any) => [
          p.nome,
          p.status,
          new Date(p.dataCriacao).toLocaleDateString('pt-BR'),
          produtos.find(pr => pr.id === i.produto_id)?.descricao || 'Desconhecido',
          i.qtd_sarom,
          i.qtd_alexandre,
          formatUSD(produtos.find(pr => pr.id === i.produto_id)?.preco_venda || 0),
          formatUSD((produtos.find(pr => pr.id === i.produto_id)?.preco_venda || 0) * (i.qtd_sarom + i.qtd_alexandre)),
        ])
      ),
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
    XLSX.writeFile(wb, `pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'oklch(0.12 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
      {/* Botão Voltar */}
      <div className="px-6 py-3 border-b flex items-center" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
          style={{ background: 'oklch(0.16 0.005 285)', color: 'oklch(0.80 0.005 65)' }}
          title="Voltar ao menu principal"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Menu</span>
        </button>
      </div>

      {/* Header */}
      <header className="z-40 border-b px-6 h-14 flex items-center gap-4 flex-shrink-0" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
        <span className="font-rajdhani font-bold text-lg tracking-wide" style={{ color: 'oklch(0.80 0.005 65)' }}>
          GERENCIADOR DE PEDIDOS DE COMPRA
        </span>
        <div className="flex-1" />
        <button
          onClick={handleExportarXLSX}
          className="p-2 rounded-md border transition-colors hover:border-green-500"
          style={{ background: 'oklch(0.18 0.005 285)', borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.70 0.010 285)' }}
          title="Exportar para Excel"
        >
          <Download className="w-4 h-4" />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Main Content */}
        <main className="flex-1 overflow-auto flex flex-col">
          {/* Criar novo pedido */}
          <div className="border-b px-6 py-4" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'oklch(0.45 0.010 285)' }}>GERAR NOVO PEDIDO</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome do pedido..."
                value={novoNomePedido}
                onChange={e => setNovoNomePedido(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleCriarPedido()}
                className="flex-1 px-4 py-2 rounded-md border text-sm"
                style={{
                  background: 'oklch(0.18 0.005 285)',
                  borderColor: 'oklch(0.28 0.005 285)',
                  color: 'oklch(0.90 0.005 65)',
                }}
              />
              <button
                onClick={handleCriarPedido}
                className="px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
                style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
              >
                <Plus className="w-4 h-4" />
                Novo
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="border-b px-6 py-3 flex gap-2 flex-wrap" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
            {['Todos', 'Pendente', 'Confirmado', 'Recebido'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFiltro(s as any)}
                className="px-5 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0 whitespace-nowrap"
                style={{
                  background: statusFiltro === s ? 'oklch(0.48 0.22 25)' : 'oklch(0.18 0.005 285)',
                  color: statusFiltro === s ? 'white' : 'oklch(0.80 0.005 65)',
                  border: `1px solid ${statusFiltro === s ? 'oklch(0.48 0.22 25)' : 'oklch(0.26 0.005 285)'}`,
                }}
              >
                {s} ({pedidos.filter(p => s === 'Todos' || p.status === s).length})
              </button>
            ))}
          </div>

          {/* Pedidos - Mobile Cards */}
          <div className="md:hidden flex-1 flex flex-col p-4 overflow-auto gap-3" style={{ minHeight: 0 }}>
            {pedidosFiltrados.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p style={{ color: 'oklch(0.45 0.010 285)' }}>Nenhum pedido criado</p>
              </div>
            ) : (
              pedidosFiltrados.map(p => (
                <OrderCard
                  key={p.id}
                  id={p.id}
                  nome={p.nome}
                  status={p.status}
                  dataCreacao={p.dataCriacao.toString()}
                  itemCount={p.items.length}
                  onView={() => setPedidoAtivo(p.id)}
                  onEdit={() => {
                    setEditandoNome(p.id);
                    setNovoNomePedido(p.nome);
                  }}
                  onDelete={() => deletarPedido(p.id)}
                />
              ))
            )}
          </div>

          {/* Pedidos - Desktop */}
          <div className="hidden md:flex flex-1 flex-col p-4 overflow-auto" style={{ minHeight: 0 }}>
            {pedidosFiltrados.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p style={{ color: 'oklch(0.45 0.010 285)' }}>Nenhum pedido criado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pedidosFiltrados.map(p => (
                  <div
                    key={p.id}
                    className="p-3 rounded-lg border cursor-pointer transition-colors"
                    style={{
                      background: pedidoAtivo === p.id ? 'oklch(0.18 0.005 285)' : 'oklch(0.14 0.005 285)',
                      borderColor: pedidoAtivo === p.id ? 'oklch(0.48 0.22 25)' : 'oklch(0.22 0.005 285)',
                    }}
                    onClick={() => setPedidoAtivo(p.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{p.nome}</p>
                        <p className="text-xs" style={{ color: 'oklch(0.45 0.010 285)' }}>
                          {p.items.length} itens • {new Date(p.dataCriacao).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div
                        className="px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 whitespace-nowrap"
                        style={{
                          background: p.status === 'Pendente' ? 'oklch(0.65 0.22 25)' : p.status === 'Confirmado' ? 'oklch(0.48 0.22 250)' : 'oklch(0.72 0.17 145)',
                          color: 'white',
                        }}
                      >
                        {p.status}
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          deletarPedido(p.id);
                        }}
                        className="p-2 rounded-md transition-colors"
                        style={{ background: 'oklch(0.18 0.005 285)', color: 'oklch(0.65 0.22 25)' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
