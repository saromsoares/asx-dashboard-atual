// Design: Dark Command Center — painel automotivo escuro, acento vermelho ASX
// Fontes: Rajdhani (títulos/códigos) + Inter (dados/labels)

import React, { useState, useMemo, useCallback } from 'react';
import { produtos, categorias, type Produto } from '@/data/produtos';
import { useCustos } from '@/hooks/useCustos';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatUSD, formatBRL } from '@/lib/formatters';
import { Ship } from 'lucide-react';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { CategoryAdjustmentPanel } from '@/components/CategoryAdjustmentPanel';
import {
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  Package,
  X,
  Download,
  Settings,
  ArrowLeft,
  AlertTriangle,
  Tag,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { ProductCardMobile } from '@/components/ProductCardMobile';

// Função para disparar evento de mudança de processos
function dispatchProcessosChange() {
  window.dispatchEvent(new Event('processosChange'));
}

type ViewMode = 'grid' | 'list' | 'cards';
type SortField = 'codigo' | 'descricao' | 'preco_venda' | 'lucro' | 'lucro_pct';
type SortDir = 'asc' | 'desc';

const SortIcon = ({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) => {
  if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
  return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-red-400" /> : <ChevronDown className="w-3 h-3 text-red-400" />;
};

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('Todas');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('codigo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showSettings, setShowSettings] = useState(false);
  const [voltFilter, setVoltFilter] = useState<string>('TODOS');
  const [unidFilter, setUnidFilter] = useState<string>('TODOS');
  const [showOnlySemCusto, setShowOnlySemCusto] = useState(false);
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [markupFilter, setMarkupFilter] = useState<'TODOS' | '0-20' | '20-50' | '50+'>('TODOS');
  const [apenasComCusto, setApenasComCusto] = useState(false);

  const { custos, taxaCambio, setTaxaCambio, setCusto, getCusto, getCustoReal, getLucro, getLucroPct, getMarkup } = useCustos();

  // Dados de pedidos para alerta de saldo pendente
  const { data: pedidosDb = [] } = trpc.pedido.getAll.useQuery();
  const { data: todosItensDb = [] } = trpc.itemPedido.getAll.useQuery();

  const STORAGE_SALDO = 'asx_saldo_embarques';
  const pedidosPendentes = useMemo(() => {
    let saldo: Record<string, Record<string, { sarom: number; alexandre: number }>> = {};
    try { const s = localStorage.getItem(STORAGE_SALDO); if (s) saldo = JSON.parse(s); } catch {}
    const confirmados = pedidosDb.filter((p: any) => p.status === 'Confirmado');
    let countPendentes = 0;
    let totalUnidPend = 0;
    let totalUsdPend = 0;
    confirmados.forEach((pedido: any) => {
      const itens = todosItensDb.filter((i: any) => i.pedidoId === pedido.id);
      let temPendente = false;
      itens.forEach((item: any) => {
        const s = saldo[String(pedido.id)]?.[item.produtoId] || { sarom: 0, alexandre: 0 };
        const pendS = Math.max(0, (item.quantidadeSarom || 0) - s.sarom);
        const pendA = Math.max(0, (item.quantidadeAlexandre || 0) - s.alexandre);
        const tPend = pendS + pendA;
        if (tPend > 0) {
          temPendente = true;
          totalUnidPend += tPend;
          const preco = parseFloat(item.precoUnitario) || 0;
          totalUsdPend += tPend * preco;
        }
      });
      if (temPendente) countPendentes++;
    });
    return { count: countPendentes, totalConfirmados: confirmados.length, totalUnidPend, totalUsdPend };
  }, [pedidosDb, todosItensDb]);

  const volts = useMemo(() => ['TODOS', ...Array.from(new Set(produtos.map(p => p.volt).filter(Boolean)))], []);
  const unids = useMemo(() => ['TODOS', ...Array.from(new Set(produtos.map(p => p.unid).filter(Boolean)))], []);

  const filtered = useMemo(() => {
    let list = produtos;

    if (categoriaAtiva !== 'Todas') {
      list = list.filter(p => p.categoria === categoriaAtiva);
    }
    if (voltFilter !== 'TODOS') {
      list = list.filter(p => p.volt === voltFilter);
    }
    if (unidFilter !== 'TODOS') {
      list = list.filter(p => p.unid === unidFilter);
    }
    
    // Filtro por faixa de markup
    if (markupFilter !== 'TODOS') {
      list = list.filter(p => {
        const custoUsd = getCusto(p.id);
        const precoVenda = p.preco_venda;
        if (custoUsd === 0) return false;
        const custoBrl = custoUsd * taxaCambio;
        const markup = ((precoVenda - custoBrl) / custoBrl) * 100;
        
        if (markupFilter === '0-20') return markup >= 0 && markup <= 20;
        if (markupFilter === '20-50') return markup > 20 && markup <= 50;
        if (markupFilter === '50+') return markup > 50;
        return true;
      });
    }
    
    // Filtro por disponibilidade de custo
    if (apenasComCusto) {
      list = list.filter(p => getCusto(p.id) > 0);
    }
    
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.codigo.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.cod_barras.toLowerCase().includes(q)
      );
    }
    if (showOnlySemCusto) {
      list = list.filter(p => getCusto(p.id) <= 0);
    }

    return [...list].sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      if (sortField === 'codigo') { va = a.codigo; vb = b.codigo; }
      else if (sortField === 'descricao') { va = a.descricao; vb = b.descricao; }
      else if (sortField === 'preco_venda') { va = a.preco_venda; vb = b.preco_venda; }
      else if (sortField === 'lucro') { va = getLucro(a.id, a.preco_venda); vb = getLucro(b.id, b.preco_venda); }
      else if (sortField === 'lucro_pct') { va = getLucroPct(a.id, a.preco_venda); vb = getLucroPct(b.id, b.preco_venda); }

      if (typeof va === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      }
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [search, categoriaAtiva, voltFilter, unidFilter, sortField, sortDir, custos, taxaCambio, showOnlySemCusto, markupFilter, apenasComCusto]);

  const stats = useMemo(() => {
    const comCusto = filtered.filter(p => getCusto(p.id) > 0);
    const semCusto = filtered.filter(p => getCusto(p.id) <= 0);
    const avgLucroPct = comCusto.length > 0
      ? comCusto.reduce((s, p) => s + getLucroPct(p.id, p.preco_venda), 0) / comCusto.length
      : 0;
    const avgMarkup = comCusto.length > 0
      ? comCusto.reduce((s, p) => s + getMarkup(p.id, p.preco_venda), 0) / comCusto.length
      : 0;
    return { total: filtered.length, comCusto: comCusto.length, semCusto: semCusto.length, avgLucroPct, avgMarkup };
  }, [filtered, custos, taxaCambio]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }, [sortField]);

  const handleExportCSV = () => {
    const headers = ['Código', 'Descrição', 'Categoria', 'Unid', 'Volt', 'Cód. Barras', 'NCM', 'Preço Venda (R$)', 'Custo (USD)', 'Custo (R$)', 'Lucro (R$)', 'Margem (%)'];
    const rows = filtered.map(p => [
      p.codigo,
      p.descricao,
      p.categoria,
      p.unid,
      p.volt,
      p.cod_barras,
      p.ncm,
      p.preco_venda.toFixed(2),
      getCusto(p.id).toFixed(2),
      getCustoReal(p.id).toFixed(2),
      getLucro(p.id, p.preco_venda).toFixed(2),
      getLucroPct(p.id, p.preco_venda).toFixed(1),
    ]);

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asx_produtos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-asx-dark)', color: 'var(--color-asx-text)' }}>
      {/* Botão Voltar */}
      <div className="px-6 py-3 border-b flex items-center" style={{ borderColor: 'var(--color-asx-border)' }}>
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
          style={{ background: 'var(--color-asx-surface)', color: 'var(--color-asx-text-heading)' }}
          title="Voltar ao menu principal"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Menu</span>
        </button>
      </div>
      {/* Header */}
      <header className="z-40 border-b px-6 h-14 flex items-center gap-4 flex-shrink-0" style={{ background: 'var(--color-asx-base)', borderColor: 'var(--color-asx-border)' }}>
        <span className="font-rajdhani font-bold text-lg tracking-wide" style={{ color: 'var(--color-asx-text-heading)' }}>
          DASHBOARD DE PRODUTOS
        </span>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-80 md:w-80 md:block hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-asx-text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar código, nome, cód. barras..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm rounded-md border"
            style={{
              background: 'var(--color-asx-surface)',
              borderColor: 'var(--color-asx-border)',
              color: 'var(--color-asx-text)',
              outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--color-asx-red)')}
            onBlur={e => (e.target.style.borderColor = 'var(--color-asx-border)')}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5" style={{ color: 'var(--color-asx-text-muted)' }} />
            </button>
          )}
        </div>
        {/* Search Mobile */}
        <div className="relative flex-1 md:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-asx-text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-3 text-sm rounded-md border h-11"
            style={{
              background: 'var(--color-asx-surface)',
              borderColor: 'var(--color-asx-border)',
              color: 'var(--color-asx-text)',
              outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--color-asx-red)')}
            onBlur={e => (e.target.style.borderColor = 'var(--color-asx-border)')}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5" style={{ color: 'var(--color-asx-text-muted)' }} />
            </button>
          )}
        </div>

        {/* Filters */}
        <select
          value={voltFilter}
          onChange={e => setVoltFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-md border"
          style={{
            background: 'var(--color-asx-surface)',
            borderColor: 'var(--color-asx-border)',
            color: 'var(--color-asx-text-heading)',
          }}
        >
          {volts.map(v => <option key={v} value={v}>{v === 'TODOS' ? 'Volt: Todos' : v}</option>)}
        </select>

        <select
          value={unidFilter}
          onChange={e => setUnidFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-md border"
          style={{
            background: 'var(--color-asx-surface)',
            borderColor: 'var(--color-asx-border)',
            color: 'var(--color-asx-text-heading)',
          }}
        >
          {unids.map(u => <option key={u} value={u}>{u === 'TODOS' ? 'Unid: Todas' : u}</option>)}
        </select>

        {/* Filtro de Markup */}
        <select
          value={markupFilter}
          onChange={e => setMarkupFilter(e.target.value as any)}
          className="px-3 py-2 text-sm rounded-md border"
          style={{
            background: 'var(--color-asx-surface)',
            borderColor: 'var(--color-asx-border)',
            color: 'var(--color-asx-text-heading)',
          }}
          title="Filtrar por faixa de markup"
        >
          <option value="TODOS">Markup: Todos</option>
          <option value="0-20">Markup: 0-20%</option>
          <option value="20-50">Markup: 20-50%</option>
          <option value="50+">Markup: 50%+</option>
        </select>

        {/* Filtro de Custo */}
        <button
          onClick={() => setApenasComCusto(!apenasComCusto)}
          className="px-3 py-2 text-sm rounded-md border transition-colors"
          style={{
            background: apenasComCusto ? 'var(--color-asx-red)' : 'var(--color-asx-surface)',
            borderColor: apenasComCusto ? 'var(--color-asx-red)' : 'var(--color-asx-border)',
            color: apenasComCusto ? 'white' : 'var(--color-asx-text-heading)',
          }}
          title="Mostrar apenas produtos com custo em USD"
        >
          {apenasComCusto ? '✓ Com Custo' : 'Com Custo'}
        </button>

        {/* View toggle */}
        <div className="flex rounded-md overflow-hidden border" style={{ borderColor: 'var(--color-asx-border)' }}>
          <button
            onClick={() => setViewMode('grid')}
            className="px-3 py-2 transition-colors"
            style={{
              background: viewMode === 'grid' ? 'var(--color-asx-red)' : 'var(--color-asx-surface)',
              color: viewMode === 'grid' ? 'white' : 'var(--color-asx-text-muted)',
            }}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="px-3 py-2 transition-colors"
            style={{
              background: viewMode === 'list' ? 'var(--color-asx-red)' : 'var(--color-asx-surface)',
              color: viewMode === 'list' ? 'white' : 'var(--color-asx-text-muted)',
            }}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          className="p-2 rounded-md border transition-colors hover:border-green-500"
          style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)', color: 'var(--color-asx-text-secondary)' }}
          title="Exportar CSV"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Ajustar Categorias */}
        <button
          onClick={() => setShowCategoryPanel(true)}
          className="p-2 rounded-md border transition-colors hover:border-blue-500"
          style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)', color: 'var(--color-asx-text-secondary)' }}
          title="Ajustar categorias de produtos"
        >
          <Tag className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-md border transition-colors hover:border-red-500"
          style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)', color: 'var(--color-asx-text-secondary)' }}
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Sidebar Categorias */}
        <aside className="w-52 flex-shrink-0 border-r overflow-y-auto"
          style={{ background: 'var(--color-asx-dark)', borderColor: 'var(--color-asx-border)' }}>
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-asx-text-muted)' }}>Categorias</p>
            <div className="space-y-1">
              {['Todas', ...categorias].map(cat => {
                const count = cat === 'Todas' ? produtos.length : produtos.filter(p => p.categoria === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoriaAtiva(cat)}
                    className="w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center justify-between"
                    style={{
                      background: categoriaAtiva === cat ? 'var(--color-asx-red)' : 'transparent',
                      color: categoriaAtiva === cat ? 'white' : 'var(--color-asx-text-secondary)',
                    }}
                  >
                    <span className="truncate">{cat}</span>
                    <span className="text-[10px] ml-1 flex-shrink-0" style={{ opacity: 0.6 }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto flex flex-col">
          {/* Stats Bar */}
          <div className="border-b px-6 py-3 grid grid-cols-4 gap-4"
            style={{ background: 'var(--color-asx-base)', borderColor: 'var(--color-asx-border)' }}>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Produtos</p>
              <p className="font-rajdhani font-bold text-xl" style={{ color: 'var(--color-asx-text-heading)' }}>{stats.total}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Com Custo</p>
              <p className="font-rajdhani font-bold text-xl" style={{ color: 'var(--color-asx-success)' }}>{stats.comCusto}</p>
            </div>
            <div>
              <button
                onClick={() => setShowOnlySemCusto(!showOnlySemCusto)}
                className="text-left w-full group"
                title={showOnlySemCusto ? 'Clique para mostrar todos' : 'Clique para filtrar sem custo'}
              >
                <p className="text-[10px] uppercase tracking-wider flex items-center gap-1" style={{ color: stats.semCusto > 0 ? 'var(--color-asx-error)' : 'var(--color-asx-text-muted)' }}>
                  <AlertTriangle className="w-3 h-3" /> Sem Custo
                </p>
                <p className="font-rajdhani font-bold text-xl" style={{ color: stats.semCusto > 0 ? 'var(--color-asx-error)' : 'var(--color-asx-text-heading)' }}>
                  {stats.semCusto}
                  {showOnlySemCusto && <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-asx-error)' }}>(filtrado)</span>}
                </p>
              </button>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Margem Média</p>
              <p className="font-rajdhani font-bold text-xl" style={{ color: stats.avgLucroPct >= 0 ? 'var(--color-asx-success)' : 'var(--color-asx-error)' }}>
                {stats.avgLucroPct.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Markup Médio</p>
              <p className="font-rajdhani font-bold text-xl" style={{ color: stats.avgMarkup >= 0 ? 'var(--color-asx-success)' : 'var(--color-asx-error)' }}>
                {stats.avgMarkup.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Alerta visual para produtos sem custo USD */}
          {stats.semCusto > 0 && !showOnlySemCusto && (
            <div
              className="mx-6 mt-3 px-4 py-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all hover:brightness-110"
              style={{
                background: 'color-mix(in oklch, var(--color-asx-red) 15%, transparent)',
                borderColor: 'color-mix(in oklch, var(--color-asx-red) 50%, transparent)',
              }}
              onClick={() => setShowOnlySemCusto(true)}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-asx-border-strong)' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-asx-text)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-asx-text)' }}>
                  {stats.semCusto} produtos sem preço de custo em dólar
                </p>
                <p className="text-xs" style={{ color: 'var(--color-asx-text-secondary)' }}>
                  Clique para filtrar e preencher os custos USD pendentes
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: 'var(--color-asx-red)', color: 'white' }}>
                Filtrar
              </span>
            </div>
          )}

          {/* Alerta de pedidos com saldo pendente */}
          {pedidosPendentes.count > 0 && (
            <div
              className="mx-6 mt-3 px-4 py-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all hover:brightness-110"
              style={{
                background: 'color-mix(in oklch, oklch(0.50 0.18 250) 15%, transparent)',
                borderColor: 'color-mix(in oklch, oklch(0.50 0.18 250) 50%, transparent)',
              }}
              onClick={() => setLocation('/rastreamento')}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-asx-border-strong)' }}>
                <Ship className="w-5 h-5" style={{ color: 'var(--color-asx-text)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-asx-text)' }}>
                  {pedidosPendentes.count} pedido{pedidosPendentes.count > 1 ? 's' : ''} com saldo pendente de embarque
                </p>
                <p className="text-xs" style={{ color: 'var(--color-asx-text-secondary)' }}>
                  {pedidosPendentes.totalUnidPend.toLocaleString('pt-BR')} unidades pendentes
                  {pedidosPendentes.totalUsdPend > 0 && ` • $${pedidosPendentes.totalUsdPend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} em valor`}
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: 'var(--color-asx-text-muted)', color: 'white' }}>
                Ver Rastreamento
              </span>
            </div>
          )}

          {/* Banner ativo quando filtro sem custo está ligado */}
          {showOnlySemCusto && (
            <div
              className="mx-6 mt-3 px-4 py-2 rounded-lg border flex items-center gap-3"
              style={{
                background: 'color-mix(in oklch, var(--color-asx-red) 20%, transparent)',
                borderColor: 'var(--color-asx-error)',
              }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-asx-text)' }} />
              <p className="text-xs flex-1" style={{ color: 'var(--color-asx-text)' }}>
                Mostrando apenas <strong>{stats.total} produtos sem custo USD</strong>. Preencha os valores na coluna "Custo (USD)".
              </p>
              <button
                onClick={() => setShowOnlySemCusto(false)}
                className="text-xs px-3 py-1 rounded-full font-semibold transition-colors hover:brightness-110"
                style={{ background: 'var(--color-asx-border-strong)', color: 'var(--color-asx-text-heading)' }}
              >
                Mostrar Todos
              </button>
            </div>
          )}

          {/* Products - Mobile Cards */}
          <div className="md:hidden flex-1 flex flex-col p-4 overflow-auto" style={{ minHeight: 0 }}>
            <div className="grid grid-cols-1 gap-3">
              {filtered.map(p => {
                const custo = getCusto(p.id);
                const custoR = getCustoReal(p.id);
                const lucro = getLucro(p.id, p.preco_venda);
                const markup = getMarkup(p.id, p.preco_venda);
                return (
                  <ProductCardMobile
                    key={p.id}
                    codigo={p.codigo}
                    descricao={p.descricao}
                    precoVenda={p.preco_venda}
                    custoUsd={custo}
                    custoBrl={custoR}
                    lucro={lucro}
                    margem={getLucroPct(p.id, p.preco_venda)}
                    markup={markup}
                  />
                );
              })}
            </div>
          </div>

          {/* Products - Desktop */}
          <div className="hidden md:flex flex-1 flex-col p-4" style={{ minHeight: 0 }}>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-auto flex-1">
                {filtered.map(p => (
                  <ProductCard
                    key={p.id}
                    produto={p}
                    custo={getCusto(p.id)}
                    custoReal={getCustoReal(p.id)}
                    lucro={getLucro(p.id, p.preco_venda)}
                    lucroPct={getLucroPct(p.id, p.preco_venda)}
                    onCustoChange={(v) => setCusto(p.id, v)}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-auto flex-1" style={{ minHeight: 0 }}>
                <table className="w-full text-sm" style={{ color: 'var(--color-asx-text-heading)', minWidth: '1200px' }}>
                  <thead>
                    <tr style={{ borderColor: 'var(--color-asx-border)' }} className="border-b">
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider sticky left-0 z-20" style={{ color: 'var(--color-asx-text-muted)', background: 'var(--color-asx-base)', width: '100px' }}>
                        <button onClick={() => toggleSort('codigo')} className="flex items-center gap-1">
                          Código <SortIcon field="codigo" sortField={sortField} sortDir={sortDir} />
                        </button>
                      </th>
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider sticky left-[100px] z-20" style={{ color: 'var(--color-asx-text-muted)', background: 'var(--color-asx-base)', minWidth: '200px', boxShadow: '4px 0 8px -2px rgb(0 0 0 / 0.3)' }}>
                        <button onClick={() => toggleSort('descricao')} className="flex items-center gap-1">
                          Descrição <SortIcon field="descricao" sortField={sortField} sortDir={sortDir} />
                        </button>
                      </th>
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Cód. Barras</th>
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Unid</th>
                      <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>
                        <button onClick={() => toggleSort('preco_venda')} className="flex items-center gap-1 ml-auto">
                          Venda <SortIcon field="preco_venda" sortField={sortField} sortDir={sortDir} />
                        </button>
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-asx-red)' }}>Custo USD</th>
                      <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Custo R$</th>
                      <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>
                        <button onClick={() => toggleSort('lucro')} className="flex items-center gap-1 ml-auto">
                          Lucro <SortIcon field="lucro" sortField={sortField} sortDir={sortDir} />
                        </button>
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>
                        <button onClick={() => toggleSort('lucro_pct')} className="flex items-center gap-1 ml-auto">
                          Margem <SortIcon field="lucro_pct" sortField={sortField} sortDir={sortDir} />
                        </button>
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-asx-red)' }}>Markup %</th>
                      <th className="text-center px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Foto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const custo = getCusto(p.id);
                      const custoR = getCustoReal(p.id);
                      const lucro = getLucro(p.id, p.preco_venda);
                      const lucroPct = getLucroPct(p.id, p.preco_venda);
                      const markup = getMarkup(p.id, p.preco_venda);
                      return (
                        <tr
                          key={p.id}
                          style={{
                            borderColor: 'var(--color-asx-surface)',
                            borderLeft: custo <= 0 ? '3px solid var(--color-asx-error)' : '3px solid transparent',
                            background: custo <= 0 ? 'color-mix(in oklch, var(--color-asx-red) 10%, transparent)' : 'transparent',
                          }}
                          className="border-b transition-colors"
                          onMouseEnter={e => (e.currentTarget.style.background = custo <= 0 ? 'color-mix(in oklch, var(--color-asx-red) 15%, transparent)' : 'var(--color-asx-surface)')}
                          onMouseLeave={e => (e.currentTarget.style.background = custo <= 0 ? 'color-mix(in oklch, var(--color-asx-red) 10%, transparent)' : 'transparent')}
                        >
                          <td className="px-3 py-2 font-rajdhani font-semibold text-xs tracking-wide sticky left-0 z-10" style={{ color: 'var(--color-asx-red)', background: 'inherit' }}>{p.codigo}</td>
                          <td className="px-3 py-2 text-xs max-w-[280px] truncate sticky left-[100px] z-10" style={{ background: 'inherit', boxShadow: '4px 0 8px -2px rgb(0 0 0 / 0.3)' }}>{p.descricao}</td>
                          <td className="px-3 py-2 font-mono text-[11px]" style={{ color: 'var(--color-asx-text-muted)' }}>{p.cod_barras}</td>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-asx-text-muted)' }}>{p.unid}</td>
                          <td className="px-3 py-2 text-right">
                            <InlinePrecoInput
                              value={p.preco_venda}
                              onChange={(v) => {
                                const updatedProduto = { ...p, preco_venda: v, preco_venda_str: v.toFixed(2) };
                                const idx = produtos.findIndex(prod => prod.id === p.id);
                                if (idx >= 0) {
                                  produtos[idx] = updatedProduto;
                                  dispatchProcessosChange();
                                }
                              }}
                              label="Venda"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <InlineCustoInput
                              value={custo}
                              onChange={(v) => setCusto(p.id, v)}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <InlinePrecoInput
                              value={custoR}
                              onChange={(v) => {
                                const custoUSD = v / taxaCambio;
                                setCusto(p.id, custoUSD);
                              }}
                              label="Custo R$"
                              disabled={custo <= 0}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            {custo > 0 ? (
                              <InlinePrecoInput
                                value={lucro}
                                onChange={(v) => {
                                  const novoPrecoVenda = v + custoR;
                                  const updatedProduto = { ...p, preco_venda: novoPrecoVenda, preco_venda_str: novoPrecoVenda.toFixed(2) };
                                  const idx = produtos.findIndex(prod => prod.id === p.id);
                                  if (idx >= 0) {
                                    produtos[idx] = updatedProduto;
                                    dispatchProcessosChange();
                                  }
                                }}
                                label="Lucro"
                              />
                            ) : (
                              <span style={{ color: 'var(--color-asx-text-muted)' }}>—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {custo > 0 ? (
                              <InlinePercentInput
                                value={lucroPct}
                                onChange={(pct) => {
                                  const novoLucro = (p.preco_venda * pct) / 100;
                                  const novoPrecoVenda = custoR + novoLucro;
                                  const updatedProduto = { ...p, preco_venda: novoPrecoVenda, preco_venda_str: novoPrecoVenda.toFixed(2) };
                                  const idx = produtos.findIndex(prod => prod.id === p.id);
                                  if (idx >= 0) {
                                    produtos[idx] = updatedProduto;
                                    dispatchProcessosChange();
                                  }
                                }}
                                label="Margem"
                              />
                            ) : (
                              <span style={{ color: 'var(--color-asx-text-muted)' }}>—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {custo > 0 ? (
                              <span className="font-rajdhani font-semibold text-sm" style={{ color: markup >= 0 ? 'var(--color-asx-success)' : 'var(--color-asx-error)' }}>
                                {markup.toFixed(1)}%
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-asx-text-muted)' }}>—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <ImageUploadButton productId={p.id} size="sm" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--color-asx-text-muted)' }}>
                <Package className="w-12 h-12 mb-4" />
                <p className="text-lg font-rajdhani">Nenhum produto encontrado</p>
                <p className="text-sm mt-1">Tente ajustar os filtros ou a busca</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Category Adjustment Panel */}
      {showCategoryPanel && (
        <CategoryAdjustmentPanel onClose={() => setShowCategoryPanel(false)} />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
          <div
            className="rounded-xl p-6 w-96 shadow-2xl border"
            style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-rajdhani font-bold mb-4" style={{ color: 'var(--color-asx-text-heading)' }}>
              Configurações Rápidas
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Taxa de Câmbio (USD → R$)</label>
                <input
                  type="number"
                  value={taxaCambio}
                  onChange={e => setTaxaCambio(parseFloat(e.target.value) || 8.5)}
                  step="0.01"
                  className="w-full mt-2 px-4 py-2.5 rounded-md border font-rajdhani font-semibold text-lg"
                  style={{
                    background: 'var(--color-asx-base)',
                    borderColor: 'var(--color-asx-border)',
                    color: 'var(--color-asx-text)',
                  }}
                />
                <p className="text-[11px] mt-2" style={{ color: 'var(--color-asx-text-muted)' }}>
                  Fórmula: Custo R$ = Custo USD × {taxaCambio.toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="mt-6 w-full px-4 py-2.5 rounded-md font-medium transition-colors"
              style={{ background: 'var(--color-asx-red)', color: 'white' }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Inline Cost Input ---- */
/* ---- Inline Preço Input ---- */
const InlinePrecoInput = React.memo(function InlinePrecoInput({
  value,
  onChange,
  label = 'Preço',
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(value.toFixed(2));

  const handleSave = () => {
    const v = parseFloat(inputVal);
    if (!isNaN(v) && v >= 0) {
      onChange(v);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end md:flex-row flex-col md:w-auto w-full">
        <span className="text-xs font-bold md:block hidden" style={{ color: 'var(--color-asx-red)' }}>R$</span>
        <input
          type="number"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
          step="0.01"
          className="asx-input-usd w-24 md:h-auto h-11 md:py-2 py-3 md:px-2 px-3"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => { setInputVal(value.toFixed(2)); setEditing(true); }}
      disabled={disabled}
      className="font-rajdhani font-semibold text-sm px-2 py-0.5 rounded transition-colors"
      style={{
        color: value > 0 ? 'var(--color-asx-text-heading)' : 'var(--color-asx-text-muted)',
        background: value > 0 ? 'var(--color-asx-surface-2)' : 'var(--color-asx-surface)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {formatBRL(value)}
    </button>
  );
});

/* ---- Inline Percent Input ---- */
const InlinePercentInput = React.memo(function InlinePercentInput({
  value,
  onChange,
  label = 'Percentual',
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(value.toFixed(1));

  const handleSave = () => {
    const v = parseFloat(inputVal);
    if (!isNaN(v) && v >= 0) {
      onChange(v);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end">
        <input
          type="number"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
          step="0.1"
          className="asx-input-usd w-16"
        />
        <span className="text-xs font-bold" style={{ color: 'var(--color-asx-red)' }}>%</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setInputVal(value.toFixed(1)); setEditing(true); }}
      className={`font-rajdhani font-semibold text-sm px-2 py-0.5 rounded transition-colors ${
        value >= 0 ? 'asx-badge-profit-pos' : 'asx-badge-profit-neg'
      }`}
    >
      {value.toFixed(1)}%
    </button>
  );
});

const InlineCustoInput = React.memo(function InlineCustoInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(value.toString());

  const handleSave = () => {
    const v = parseFloat(inputVal);
    if (!isNaN(v) && v >= 0) {
      onChange(v);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end">
        <span className="text-xs font-bold" style={{ color: 'var(--color-asx-red)' }}>$</span>
        <input
          type="number"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
          step="0.01"
          className="asx-input-usd w-20"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => { setInputVal(value > 0 ? value.toString() : ''); setEditing(true); }}
      className="font-rajdhani font-semibold text-sm px-2 py-0.5 rounded transition-colors"
      style={{
        color: value > 0 ? 'var(--color-asx-text-heading)' : 'var(--color-asx-red)',
        background: value > 0 ? 'var(--color-asx-surface-2)' : 'color-mix(in oklch, var(--color-asx-red) 12%, transparent)',
      }}
    >
      {value > 0 ? `$${value.toFixed(2)}` : '+ Custo'}
    </button>
  );
});

/* ---- Product Card ---- */
const ProductCard = React.memo(function ProductCard({
  produto,
  custo,
  custoReal,
  lucro,
  lucroPct,
  onCustoChange,
}: {
  produto: Produto;
  custo: number;
  custoReal: number;
  lucro: number;
  lucroPct: number;
  onCustoChange: (v: number) => void;
}) {
  const [showCustoInput, setShowCustoInput] = useState(false);
  const [inputValue, setInputValue] = useState(custo.toString());

  const handleSaveCusto = () => {
    const val = parseFloat(inputValue);
    if (!isNaN(val) && val >= 0) {
      onCustoChange(val);
      setShowCustoInput(false);
    }
  };

  return (
    <div className="asx-card p-4">
      {/* Imagem */}
      <div className="mb-3 h-28 rounded-md flex items-center justify-center overflow-hidden relative group" style={{
        background: 'var(--color-asx-dark)',
      }}>
        <ImageUploadButton productId={produto.id} size="lg" showPreview={true} />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <Package className="w-8 h-8" style={{ color: 'var(--color-asx-border-strong)' }} />
        </div>
      </div>

      {/* Info */}
      <p className="font-rajdhani font-semibold text-xs tracking-wide" style={{ color: 'var(--color-asx-red)' }}>{produto.codigo}</p>
      <p className="text-xs font-medium line-clamp-2 mt-0.5 mb-1" style={{ color: 'var(--color-asx-text-heading)' }}>{produto.descricao}</p>
      <p className="text-[10px] font-mono mb-3" style={{ color: 'var(--color-asx-text-muted)' }}>EAN: {produto.cod_barras}</p>

      {/* Preço Venda */}
      <div className="mb-3 pb-3 border-b" style={{ borderColor: 'var(--color-asx-border)' }}>
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Preço Venda</p>
        <p className="font-rajdhani text-lg font-bold" style={{ color: 'var(--color-asx-text-heading)' }}>
          {produto.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      </div>

      {/* Custo */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Custo USD</p>
          {custo > 0 && (
            <button onClick={() => onCustoChange(0)} className="text-[10px]" style={{ color: 'var(--color-asx-text-muted)' }}>limpar</button>
          )}
        </div>
        {!showCustoInput ? (
          <button
            onClick={() => { setInputValue(custo > 0 ? custo.toString() : ''); setShowCustoInput(true); }}
            className="w-full px-2 py-1.5 rounded text-sm font-rajdhani font-semibold transition-colors"
            style={{
              background: custo > 0 ? 'var(--color-asx-surface-2)' : 'color-mix(in oklch, var(--color-asx-red) 12%, transparent)',
              color: custo > 0 ? 'var(--color-asx-text-heading)' : 'var(--color-asx-red)',
            }}
          >
            {custo > 0 ? `$ ${custo.toFixed(2)}` : '+ Inserir Custo'}
          </button>
        ) : (
          <div className="flex gap-1">
            <input
              type="number"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveCusto(); if (e.key === 'Escape') setShowCustoInput(false); }}
              className="asx-input-usd flex-1"
              autoFocus
              step="0.01"
              placeholder="0.00"
            />
            <button
              onClick={handleSaveCusto}
              className="px-3 py-1 rounded text-sm font-bold"
              style={{ background: 'var(--color-asx-red)', color: 'white' }}
            >
              OK
            </button>
          </div>
        )}
      </div>

      {/* Custo R$ */}
      {custoReal > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Custo R$</p>
          <p className="font-mono text-sm" style={{ color: 'var(--color-asx-text-secondary)' }}>
            {custoReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      )}

      {/* Lucro */}
      {custo > 0 && (
        <div className="pt-2 border-t" style={{ borderColor: 'var(--color-asx-border)' }}>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-asx-text-muted)' }}>Lucro Bruto</p>
          <div className="flex items-baseline gap-2">
            <span className={lucro >= 0 ? 'asx-badge-profit-pos' : 'asx-badge-profit-neg'}>
              {lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
            <span className={lucroPct >= 0 ? 'asx-badge-profit-pos' : 'asx-badge-profit-neg'}>
              {lucroPct.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
});