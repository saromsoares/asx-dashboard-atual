import { useState, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { produtos } from '@/data/produtos';
import { usePedidosSync, type ItemPedido } from '@/hooks/usePedidosSync';
import { useIdioma } from '@/hooks/useIdioma';
import { NotificacoesPedidos } from '@/components/NotificacoesPedidos';
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
  const [showAutoDistrib, setShowAutoDistrib] = useState(false);
  const [proporcaoSarom, setProporcaoSarom] = useState(50);
  const [filtroTabela, setFiltroTabela] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | 'Pendente' | 'Confirmado' | 'Recebido'>('Todos');
  const [notificacoesLocais, setNotificacoesLocais] = useState(notificacoes);

  // Extrair categorias únicas dos produtos
  const categorias = useMemo(() => {
    const cats = new Set(produtos.map(p => p.categoria));
    return ['Todas', ...Array.from(cats).sort()];
  }, []);

  const pedidoAtualAtual = pedidos.find(p => p.id === pedidoAtivo);

  // Filtrar pedidos por status
  const pedidosFiltrados = useMemo(() => {
    if (filtroStatus === 'Todos') {
      return pedidos;
    }
    return pedidos.filter(p => p.status === filtroStatus);
  }, [pedidos, filtroStatus]);

  // Contar pedidos por status
  const contagemStatus = useMemo(() => {
    return {
      todos: pedidos.length,
      pendente: pedidos.filter(p => p.status === 'Pendente').length,
      enviado: pedidos.filter(p => p.status === 'Confirmado').length,
      recebido: pedidos.filter(p => p.status === 'Recebido').length,
    };
  }, [pedidos]);

  const produtosFiltrados = useMemo(() => {
    let resultado = produtos;
    
    // Filtrar por categoria
    if (categoriaFiltro !== 'Todas') {
      resultado = resultado.filter(p => p.categoria === categoriaFiltro);
    }
    
    // Filtrar por busca na tabela
    if (filtroTabela.trim()) {
      const q = filtroTabela.toLowerCase();
      resultado = resultado.filter(p =>
        p.codigo.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q)
      );
    }
    
    return resultado.slice(0, 50);
  }, [filtroTabela, categoriaFiltro]);

  const handleCriarPedido = useCallback(async () => {
    if (novoNomePedido.trim()) {
      const novo = await criarPedido(novoNomePedido);
      if (novo) {
        setPedidoAtivo(novo.id);
        setNovoNomePedido('');
      }
    }
  }, [novoNomePedido, criarPedido]);

  const handleAdicionarItem = () => {
    if (!pedidoAtivo || !produtoSelecionado || (qtdSarom === 0 && qtdAlexandre === 0)) {
      return;
    }

    const prod = produtos.find(p => p.id === produtoSelecionado);
    if (!prod) return;

    const item: ItemPedido = {
      produtoId: prod.id,
      codigo: prod.codigo,
      nome: prod.descricao,
      precoUSD: prod.custo_usd || 0, // Usando preço de custo USD
      qtdSarom,
      qtdAlexandre,
    };

    adicionarItem(pedidoAtivo, item);
    setProdutoSelecionado(null);
    setQtdSarom(0);
    setQtdAlexandre(0);
    setBuscaProduto('');
  };

  const handleAutoDistribuir = () => {
    if (!pedidoAtivo || !produtoSelecionado) return;

    const qtdTotal = qtdSarom + qtdAlexandre;
    if (qtdTotal === 0) return;

    const qtdSaromAuto = Math.round((qtdTotal * proporcaoSarom) / 100);
    const qtdAlexandreAuto = qtdTotal - qtdSaromAuto;

    setQtdSarom(qtdSaromAuto);
    setQtdAlexandre(qtdAlexandreAuto);
    setShowAutoDistrib(false);
  };

  const exportarPDF = (pedido: any) => {
    // Implementar exportação PDF
    alert('Exportação PDF em desenvolvimento');
  };

  const exportarExcel = (pedido: any) => {
    try {
      const XLSX = require('xlsx-js-style');
      const totais = calcularTotais(pedido);
      
      const dados = pedido.items.map((item: ItemPedido) => ({
        'CÓDIGO': item.codigo,
        'PRODUTO': item.nome,
        'PREÇO USD': item.precoUSD,
        'QTD SAROM': item.qtdSarom,
        'VALOR SAROM': item.precoUSD * item.qtdSarom,
        'QTD ALEXANDRE': item.qtdAlexandre,
        'VALOR ALEXANDRE': item.precoUSD * item.qtdAlexandre,
        'QTD TOTAL': item.qtdSarom + item.qtdAlexandre,
        'VALOR TOTAL': item.precoUSD * (item.qtdSarom + item.qtdAlexandre),
      }));

      const ws = XLSX.utils.json_to_sheet(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, pedido.nome.substring(0, 31));

      ws['!cols'] = [
        { wch: 14 }, { wch: 45 }, { wch: 12 }, { wch: 12 },
        { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
      ];

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pedido_${pedido.nome}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro na exportação:', err);
      alert('Erro ao exportar planilha.');
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'oklch(0.12 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b px-6 py-4" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
        <div className="flex items-center justify-between">
          <h1 className="font-rajdhani font-bold text-2xl" style={{ color: 'oklch(0.80 0.005 65)' }}>
            GERENCIADOR DE PEDIDOS DE COMPRA
          </h1>
          <Link href="/">
            <button
              className="px-3 py-2 rounded-md border transition-colors text-sm"
              style={{ background: 'oklch(0.18 0.005 285)', borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.70 0.010 285)' }}
            >
              ← Voltar
            </button>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Lista de pedidos */}
        <aside className="w-72 border-r flex flex-col" style={{ borderColor: 'oklch(0.22 0.005 285)', background: 'oklch(0.13 0.005 285)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'oklch(0.50 0.010 285)' }}>Gerar Novo Pedido</p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Nome do pedido..."
                value={novoNomePedido}
                onChange={e => setNovoNomePedido(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCriarPedido()}
                className="flex-1 px-3 py-2 text-sm rounded-md border"
                style={{
                  background: 'oklch(0.18 0.005 285)',
                  borderColor: 'oklch(0.28 0.005 285)',
                  color: 'oklch(0.90 0.005 65)',
                }}
              />
              <button
                onClick={handleCriarPedido}
                className="px-3 py-2 rounded-md transition-colors flex items-center gap-1 hover:opacity-80"
                style={{
                  background: 'oklch(0.48 0.22 25)',
                  color: 'white',
                }}
                title="Criar novo pedido"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Abas de filtro de status */}
          <div className="border-b px-4 py-3 flex gap-2 overflow-x-auto" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
            {[
              { label: 'Todos', value: 'Todos' as const, count: contagemStatus.todos, color: 'oklch(0.48 0.22 25)' },
              { label: 'Pendente', value: 'Pendente' as const, count: contagemStatus.pendente, color: 'oklch(0.65 0.22 25)' },
              { label: 'Confirmado', value: 'Confirmado' as const, count: contagemStatus.enviado, color: 'oklch(0.55 0.15 270)' },
              { label: 'Recebido', value: 'Recebido' as const, count: contagemStatus.recebido, color: 'oklch(0.72 0.17 145)' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setFiltroStatus(tab.value)}
                className="px-4 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap"
                style={{
                  background: filtroStatus === tab.value ? tab.color : 'oklch(0.18 0.005 285)',
                  color: filtroStatus === tab.value ? 'white' : 'oklch(0.65 0.010 285)',
                  borderColor: tab.color,
                  border: '1px solid',
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {pedidosFiltrados.length === 0 ? (
              <div className="p-4 text-center text-sm" style={{ color: 'oklch(0.50 0.010 285)' }}>
                Nenhum pedido criado
              </div>
            ) : (
              pedidosFiltrados.map(pedido => (
                <button
                  key={pedido.id}
                  onClick={() => setPedidoAtivo(pedido.id)}
                  className="w-full text-left px-4 py-3 border-b transition-colors flex items-center gap-2"
                  style={{
                    background: pedidoAtivo === pedido.id ? 'oklch(0.18 0.005 285)' : 'transparent',
                    borderColor: 'oklch(0.22 0.005 285)',
                    borderLeft: pedido.status === 'Pendente' ? '3px solid oklch(0.65 0.22 25)' : pedido.status === 'Confirmado' ? '3px solid oklch(0.55 0.15 270)' : '3px solid oklch(0.72 0.17 145)',
                  }}
                >
                  {pedido.status === 'Pendente' ? (
                    <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'oklch(0.65 0.22 25)' }} />
                  ) : pedido.status === 'Confirmado' ? (
                    <Send className="w-4 h-4 flex-shrink-0" style={{ color: 'oklch(0.55 0.15 270)' }} />
                  ) : (
                    <CheckCheck className="w-4 h-4 flex-shrink-0" style={{ color: 'oklch(0.72 0.17 145)' }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pedido.nome}</p>
                    <p className="text-xs" style={{ color: 'oklch(0.50 0.010 285)' }}>
                      {pedido.items.length} itens • {pedido.status}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Conteúdo do pedido */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!pedidoAtivo ? (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'oklch(0.50 0.010 285)' }}>
              <p>Selecione ou crie um pedido</p>
            </div>
          ) : pedidoAtualAtual ? (
            <>
              {/* Header do pedido */}
              <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'oklch(0.22 0.005 285)', background: 'oklch(0.13 0.005 285)' }}>
                <div className="flex items-center gap-3 flex-1">
                  {editandoNome === pedidoAtivo ? (
                    <input
                      type="text"
                      value={pedidoAtualAtual.nome}
                      onChange={e => atualizarNomePedido(pedidoAtivo, e.target.value)}
                      onBlur={() => setEditandoNome(null)}
                      onKeyDown={e => e.key === 'Enter' && setEditandoNome(null)}
                      autoFocus
                      className="px-3 py-2 rounded-md border flex-1"
                      style={{
                        background: 'oklch(0.18 0.005 285)',
                        borderColor: 'oklch(0.28 0.005 285)',
                        color: 'oklch(0.90 0.005 65)',
                      }}
                    />
                  ) : (
                    <>
                      <h2 className="font-rajdhani font-bold text-lg">{pedidoAtualAtual.nome}</h2>
                      <button
                        onClick={() => setEditandoNome(pedidoAtivo)}
                        className="p-1 rounded hover:opacity-75"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={pedidoAtualAtual.status || 'Pendente'}
                    onChange={(e) => {
                      atualizarStatusPedido(pedidoAtivo, e.target.value as 'Pendente' | 'Confirmado' | 'Recebido');
                    }}
                    className="px-3 py-2 rounded-md border text-sm"
                    style={{
                      background: 'oklch(0.18 0.005 285)',
                      borderColor: 'oklch(0.28 0.005 285)',
                      color: 'oklch(0.90 0.005 65)',
                    }}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Confirmado">Confirmado</option>
                    <option value="Recebido">Recebido</option>
                  </select>

                  <button
                    onClick={() => exportarPDF(pedidoAtualAtual)}
                    className="p-2 rounded-md transition-colors"
                    style={{ background: 'oklch(0.18 0.005 285)', color: 'oklch(0.70 0.010 285)' }}
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => exportarExcel(pedidoAtualAtual)}
                    className="p-2 rounded-md transition-colors"
                    style={{ background: 'oklch(0.18 0.005 285)', color: 'oklch(0.70 0.010 285)' }}
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      // Salvar pedido
                      localStorage.setItem(`pedido_${pedidoAtivo}`, JSON.stringify(pedidoAtualAtual));
                      alert('Pedido salvo com sucesso!');
                    }}
                    className="px-4 py-2 rounded-md transition-colors font-medium text-sm"
                    style={{ background: 'oklch(0.72 0.17 145)', color: 'white' }}
                    title="Salvar pedido"
                  >
                    💾 Salvar
                  </button>

                  <button
                    onClick={() => {
                      deletarPedido(pedidoAtivo);
                      setPedidoAtivo(null);
                    }}
                    className="p-2 rounded-md transition-colors"
                    style={{ background: 'oklch(0.65 0.22 25 / 0.2)', color: 'oklch(0.65 0.22 25)' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Seletor de Categoria */}
              <div className="border-b px-6 py-4" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
                <label className="text-xs font-semibold uppercase" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Selecione uma Categoria para Listar Produtos
                </label>
                <select
                  value={categoriaFiltro}
                  onChange={e => setCategoriaFiltro(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border text-sm mt-2"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.28 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                >
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Tabela de Produtos da Categoria */}
              {categoriaFiltro !== 'Todas' && produtosFiltrados.length > 0 && (
                <div className="flex-1 overflow-auto flex flex-col">
                  {/* Campo de Busca na Tabela */}
                  <div className="px-6 py-3 border-b" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
                    <input
                      type="text"
                      placeholder="Buscar por código ou descrição..."
                      value={filtroTabela}
                      onChange={e => setFiltroTabela(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border text-sm"
                      style={{
                        background: 'oklch(0.18 0.005 285)',
                        borderColor: 'oklch(0.28 0.005 285)',
                        color: 'oklch(0.90 0.005 65)',
                      }}
                    />
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                    <thead style={{ background: 'oklch(0.14 0.005 285)', borderBottom: '1px solid oklch(0.22 0.005 285)', position: 'sticky', top: 0 }}>
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Código</th>
                        <th className="px-4 py-2 text-left font-semibold">Descrição</th>
                        <th className="px-4 py-2 text-center font-semibold">Preço USD</th>
                        <th className="px-4 py-2 text-center font-semibold">Qtd Sarom</th>
                        <th className="px-4 py-2 text-center font-semibold">Qtd Alexandre</th>
                        <th className="px-4 py-2 text-center font-semibold">% Sarom (Item)</th>
                        <th className="px-4 py-2 text-center font-semibold">% Alexandre (Item)</th>
                        <th className="px-4 py-2 text-center font-semibold">% Sarom (Total)</th>
                        <th className="px-4 py-2 text-center font-semibold">% Alexandre (Total)</th>
                        <th className="px-4 py-2 text-center font-semibold">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtosFiltrados.map(p => {
                        const totalSarom = pedidoAtualAtual?.items.reduce((sum, item) => sum + item.qtdSarom, 0) || 0;
                        const totalAlexandre = pedidoAtualAtual?.items.reduce((sum, item) => sum + item.qtdAlexandre, 0) || 0;
                        const qtdTotal = totalSarom + totalAlexandre;
                        const itemExistente = pedidoAtualAtual?.items.find(item => item.produtoId === p.id);
                        const qtdSaromItem = itemExistente?.qtdSarom || 0;
                        const qtdAlexandreItem = itemExistente?.qtdAlexandre || 0;
                        const qtdItemTotal = qtdSaromItem + qtdAlexandreItem;
                        
                        // Percentuais por item
                        const pctSaromItem = qtdItemTotal > 0 ? ((qtdSaromItem / qtdItemTotal) * 100) : 0;
                        const pctAlexandreItem = qtdItemTotal > 0 ? ((qtdAlexandreItem / qtdItemTotal) * 100) : 0;
                        
                        // Percentuais do total do pedido
                        const pctSaromTotal = qtdTotal > 0 ? ((totalSarom / qtdTotal) * 100) : 0;
                        const pctAlexandreTotal = qtdTotal > 0 ? ((totalAlexandre / qtdTotal) * 100) : 0;

                        return (
                          <tr
                            key={p.id}
                            style={{ borderBottom: '1px solid oklch(0.22 0.005 285)' }}
                          >
                            <td className="px-4 py-3 font-mono text-xs">{p.codigo}</td>
                            <td className="px-4 py-3 text-xs">{p.descricao.substring(0, 40)}</td>
                            <td className="px-4 py-3 text-center">{formatUSD(p.custo_usd)}</td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                min="0"
                                value={qtdSaromItem}
                                onChange={e => {
                                  const novaQtd = parseInt(e.target.value) || 0;
                                  if (itemExistente) {
                                    removerItem(pedidoAtivo, p.id);
                                  }
                                  if (novaQtd > 0 || qtdAlexandreItem > 0) {
                                    adicionarItem(pedidoAtivo, {
                                      produtoId: p.id,
                                      codigo: p.codigo,
                                      nome: p.descricao,
                                      precoUSD: p.custo_usd,
                                      qtdSarom: novaQtd,
                                      qtdAlexandre: qtdAlexandreItem,
                                    });
                                  }
                                }}
                                className="w-16 px-2 py-1 rounded text-sm text-center"
                                style={{
                                  background: 'oklch(0.18 0.005 285)',
                                  borderColor: 'oklch(0.28 0.005 285)',
                                  color: 'oklch(0.90 0.005 65)',
                                }}
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                min="0"
                                value={qtdAlexandreItem}
                                onChange={e => {
                                  const novaQtd = parseInt(e.target.value) || 0;
                                  if (itemExistente) {
                                    removerItem(pedidoAtivo, p.id);
                                  }
                                  if (novaQtd > 0 || qtdSaromItem > 0) {
                                    adicionarItem(pedidoAtivo, {
                                      produtoId: p.id,
                                      codigo: p.codigo,
                                      nome: p.descricao,
                                      precoUSD: p.custo_usd,
                                      qtdSarom: qtdSaromItem,
                                      qtdAlexandre: novaQtd,
                                    });
                                  }
                                }}
                                className="w-16 px-2 py-1 rounded text-sm text-center"
                                style={{
                                  background: 'oklch(0.18 0.005 285)',
                                  borderColor: 'oklch(0.28 0.005 285)',
                                  color: 'oklch(0.90 0.005 65)',
                                }}
                              />
                            </td>
                            <td className="px-4 py-3 text-center text-xs" style={{ color: 'oklch(0.72 0.17 145)' }}>
                              {pctSaromItem.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-center text-xs" style={{ color: 'oklch(0.65 0.18 60)' }}>
                              {pctAlexandreItem.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-center text-xs" style={{ color: 'oklch(0.72 0.17 145)' }}>
                              {pctSaromTotal.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-center text-xs" style={{ color: 'oklch(0.65 0.18 60)' }}>
                              {pctAlexandreTotal.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-center">
                              {itemExistente && (
                                <button
                                  onClick={() => removerItem(pedidoAtivo, p.id)}
                                  className="p-1 rounded hover:opacity-75"
                                  style={{ color: 'oklch(0.65 0.22 25)' }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}

              {/* Tabela de itens */}
              <div className="flex-1 overflow-auto">
                {pedidoAtualAtual.items.length === 0 ? (
                  <div className="p-6 text-center" style={{ color: 'oklch(0.50 0.010 285)' }}>
                    Nenhum item adicionado
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead style={{ background: 'oklch(0.14 0.005 285)', borderBottom: '1px solid oklch(0.22 0.005 285)' }}>
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Código</th>
                        <th className="px-4 py-2 text-left font-semibold">Produto</th>
                        <th className="px-4 py-2 text-center font-semibold">Preço USD</th>
                        <th className="px-4 py-2 text-center font-semibold">Qtd Sarom</th>
                        <th className="px-4 py-2 text-center font-semibold">Valor Sarom</th>
                        <th className="px-4 py-2 text-center font-semibold">Qtd Alexandre</th>
                        <th className="px-4 py-2 text-center font-semibold">Valor Alexandre</th>
                        <th className="px-4 py-2 text-center font-semibold">Qtd Total</th>
                        <th className="px-4 py-2 text-center font-semibold">Valor Total</th>
                        <th className="px-4 py-2 text-center font-semibold"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidoAtualAtual.items.map(item => {
                        const subtotalSarom = item.precoUSD * item.qtdSarom;
                        const subtotalAlexandre = item.precoUSD * item.qtdAlexandre;
                        const qtdTotal = item.qtdSarom + item.qtdAlexandre;
                        const valorTotal = subtotalSarom + subtotalAlexandre;

                        return (
                          <tr
                            key={item.produtoId}
                            style={{ borderBottom: '1px solid oklch(0.22 0.005 285)' }}
                          >
                            <td className="px-4 py-3 font-mono text-xs">{item.codigo}</td>
                            <td className="px-4 py-3 text-xs">{item.nome.substring(0, 40)}</td>
                            <td className="px-4 py-3 text-center">{formatUSD(item.precoUSD)}</td>
                            <td className="px-4 py-3 text-center">{item.qtdSarom}</td>
                            <td className="px-4 py-3 text-center">{formatUSD(subtotalSarom)}</td>
                            <td className="px-4 py-3 text-center">{item.qtdAlexandre}</td>
                            <td className="px-4 py-3 text-center">{formatUSD(subtotalAlexandre)}</td>
                            <td className="px-4 py-3 text-center font-semibold">{qtdTotal}</td>
                            <td className="px-4 py-3 text-center font-semibold" style={{ color: 'oklch(0.75 0.15 25)' }}>
                              {formatUSD(valorTotal)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => removerItem(pedidoAtivo, item.produtoId)}
                                className="p-1 rounded hover:opacity-75"
                                style={{ color: 'oklch(0.65 0.22 25)' }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Rodapé com totais */}
              {pedidoAtualAtual.items.length > 0 && (() => {
                const totais = calcularTotais(pedidoAtualAtual);
                const qtdSarom = pedidoAtualAtual.items.reduce((sum, item) => sum + item.qtdSarom, 0);
                const qtdAlexandre = pedidoAtualAtual.items.reduce((sum, item) => sum + item.qtdAlexandre, 0);
                const qtdTotal = qtdSarom + qtdAlexandre;

                return (
                  <div
                    className="border-t px-6 py-4"
                    style={{ borderColor: 'oklch(0.22 0.005 285)', background: 'oklch(0.13 0.005 285)' }}
                  >
                    <div className="grid grid-cols-2 gap-8">
                      {/* Coluna Sarom */}
                      <div className="border-r" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
                        <h3 className="font-semibold mb-3" style={{ color: 'oklch(0.80 0.005 65)' }}>PEDIDO SAROM</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span style={{ color: 'oklch(0.50 0.010 285)' }}>Total de Itens:</span>
                            <span className="font-semibold">{qtdSarom}</span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: 'oklch(0.50 0.010 285)' }}>Valor Total:</span>
                            <span className="font-semibold" style={{ color: 'oklch(0.75 0.15 25)' }}>
                              {formatUSD(totais.totalSarom)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Coluna Alexandre */}
                      <div>
                        <h3 className="font-semibold mb-3" style={{ color: 'oklch(0.80 0.005 65)' }}>PEDIDO ALEXANDRE</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span style={{ color: 'oklch(0.50 0.010 285)' }}>Total de Itens:</span>
                            <span className="font-semibold">{qtdAlexandre}</span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: 'oklch(0.50 0.010 285)' }}>Valor Total:</span>
                            <span className="font-semibold" style={{ color: 'oklch(0.75 0.15 25)' }}>
                              {formatUSD(totais.totalAlexandre)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Totais Gerais */}
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm" style={{ color: 'oklch(0.50 0.010 285)' }}>TOTAL GERAL DO PEDIDO</p>
                          <p className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>Itens: {qtdTotal}</p>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: 'oklch(0.48 0.22 25)' }}>
                          {formatUSD(totais.totalGeral)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : null}
        </main>
      </div>

      {/* Modal Auto-Distribuição */}
      {showAutoDistrib && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-sm w-full mx-4" style={{ background: 'oklch(0.14 0.005 285)' }}>
            <h2 className="text-lg font-bold mb-4">Auto-Distribuição</h2>
            <p className="text-sm mb-4" style={{ color: 'oklch(0.70 0.010 285)' }}>
              Distribuir {qtdSarom + qtdAlexandre} unidades entre Sarom e Alexandre
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Proporção Sarom: {proporcaoSarom}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={proporcaoSarom}
                  onChange={e => setProporcaoSarom(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs mt-2" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  <span>Sarom: {Math.round(((qtdSarom + qtdAlexandre) * proporcaoSarom) / 100)}</span>
                  <span>Alexandre: {(qtdSarom + qtdAlexandre) - Math.round(((qtdSarom + qtdAlexandre) * proporcaoSarom) / 100)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAutoDistribuir}
                  className="flex-1 px-4 py-2 rounded text-sm transition-colors"
                  style={{
                    background: 'oklch(0.48 0.22 145)',
                    color: 'white',
                  }}
                >
                  Aplicar
                </button>
                <button
                  onClick={() => setShowAutoDistrib(false)}
                  className="px-4 py-2 rounded text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    color: 'oklch(0.70 0.010 285)',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notificações de Pedidos */}
      <NotificacoesPedidos notificacoes={notificacoes} />
    </div>
  );
}
