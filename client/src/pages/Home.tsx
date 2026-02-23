// Design: Dark Command Center — painel automotivo escuro, acento vermelho ASX
// Fontes: Rajdhani (títulos/códigos) + Inter (dados/labels)

import React, { useState, useMemo, useCallback } from 'react';
import { produtos, categorias, type Produto } from '@/data/produtos';
import { useCustos } from '@/hooks/useCustos';
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
} from 'lucide-react';
import { useLocation } from 'wouter';

// Função para disparar evento de mudança de processos
function dispatchProcessosChange() {
  window.dispatchEvent(new Event('processosChange'));
}

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatUSD = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

type ViewMode = 'grid' | 'list';
type SortField = 'codigo' | 'descricao' | 'preco_venda' | 'lucro' | 'lucro_pct';
type SortDir = 'asc' | 'desc';

export default function Home() {
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

  const { custos, taxaCambio, setTaxaCambio, setCusto, getCusto, getCustoReal, getLucro, getLucroPct } = useCustos();

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
  }, [search, categoriaAtiva, voltFilter, unidFilter, sortField, sortDir, custos, taxaCambio, showOnlySemCusto]);

  const stats = useMemo(() => {
    const comCusto = filtered.filter(p => getCusto(p.id) > 0);
    const semCusto = filtered.filter(p => getCusto(p.id) <= 0);
    const totalVenda = filtered.reduce((s, p) => s + p.preco_venda, 0);
    const totalLucro = comCusto.reduce((s, p) => s + getLucro(p.id, p.preco_venda), 0);
    const avgLucroPct = comCusto.length > 0
      ? comCusto.reduce((s, p) => s + getLucroPct(p.id, p.preco_venda), 0) / comCusto.length
      : 0;
    return { total: filtered.length, comCusto: comCusto.length, semCusto: semCusto.length, totalVenda, totalLucro, avgLucroPct };
  }, [filtered, custos, taxaCambio]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }, [sortField]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-red-400" /> : <ChevronDown className="w-3 h-3 text-red-400" />;
  };

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
          DASHBOARD DE PRODUTOS
        </span>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'oklch(0.50 0.010 285)' }} />
          <input
            type="text"
            placeholder="Buscar código, nome, cód. barras..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm rounded-md border"
            style={{
              background: 'oklch(0.18 0.005 285)',
              borderColor: 'oklch(0.28 0.005 285)',
              color: 'oklch(0.90 0.005 65)',
              outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = 'oklch(0.48 0.22 25)')}
            onBlur={e => (e.target.style.borderColor = 'oklch(0.28 0.005 285)')}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5" style={{ color: 'oklch(0.60 0.010 285)' }} />
            </button>
          )}
        </div>

        {/* Filters */}
        <select
          value={voltFilter}
          onChange={e => setVoltFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-md border"
          style={{
            background: 'oklch(0.18 0.005 285)',
            borderColor: 'oklch(0.28 0.005 285)',
            color: 'oklch(0.80 0.005 65)',
          }}
        >
          {volts.map(v => <option key={v} value={v}>{v === 'TODOS' ? 'Volt: Todos' : v}</option>)}
        </select>

        <select
          value={unidFilter}
          onChange={e => setUnidFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-md border"
          style={{
            background: 'oklch(0.18 0.005 285)',
            borderColor: 'oklch(0.28 0.005 285)',
            color: 'oklch(0.80 0.005 65)',
          }}
        >
          {unids.map(u => <option key={u} value={u}>{u === 'TODOS' ? 'Unid: Todas' : u}</option>)}
        </select>

        {/* View toggle */}
        <div className="flex rounded-md overflow-hidden border" style={{ borderColor: 'oklch(0.26 0.005 285)' }}>
          <button
            onClick={() => setViewMode('grid')}
            className="px-3 py-2 transition-colors"
            style={{
              background: viewMode === 'grid' ? 'oklch(0.48 0.22 25)' : 'oklch(0.18 0.005 285)',
              color: viewMode === 'grid' ? 'white' : 'oklch(0.60 0.010 285)',
            }}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="px-3 py-2 transition-colors"
            style={{
              background: viewMode === 'list' ? 'oklch(0.48 0.22 25)' : 'oklch(0.18 0.005 285)',
              color: viewMode === 'list' ? 'white' : 'oklch(0.60 0.010 285)',
            }}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          className="p-2 rounded-md border transition-colors hover:border-green-500"
          style={{ background: 'oklch(0.18 0.005 285)', borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.70 0.010 285)' }}
          title="Exportar CSV"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-md border transition-colors hover:border-red-500"
          style={{ background: 'oklch(0.18 0.005 285)', borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.70 0.010 285)' }}
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Sidebar Categorias */}
        <aside className="w-52 flex-shrink-0 border-r overflow-y-auto"
          style={{ background: 'oklch(0.13 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'oklch(0.45 0.010 285)' }}>Categorias</p>
            <div className="space-y-1">
              {['Todas', ...categorias].map(cat => {
                const count = cat === 'Todas' ? produtos.length : produtos.filter(p => p.categoria === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoriaAtiva(cat)}
                    className="w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center justify-between"
                    style={{
                      background: categoriaAtiva === cat ? 'oklch(0.48 0.22 25)' : 'transparent',
                      color: categoriaAtiva === cat ? 'white' : 'oklch(0.65 0.010 285)',
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
          <div className="border-b px-6 py-3 grid grid-cols-6 gap-4"
            style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Produtos</p>
              <p className="font-rajdhani font-bold text-xl" style={{ color: 'oklch(0.85 0.005 65)' }}>{stats.total}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Com Custo</p>
              <p className="font-rajdhani font-bold text-xl" style={{ color: 'oklch(0.72 0.17 145)' }}>{stats.comCusto}</p>
            </div>
            <div>
              <button
                onClick={() => setShowOnlySemCusto(!showOnlySemCusto)}
                className="text-left w-full group"
                title={showOnlySemCusto ? 'Clique para mostrar todos' : 'Clique para filtrar sem custo'}
              >
                <p className="text-[10px] uppercase tracking-wider flex items-center gap-1" style={{ color: stats.semCusto > 0 ? 'oklch(0.65 0.22 25)' : 'oklch(0.45 0.010 285)' }}>
                  <AlertTriangle className="w-3 h-3" /> Sem Custo
                </p>
                <p className="font-rajdhani font-bold text-xl" style={{ color: stats.semCusto > 0 ? 'oklch(0.65 0.22 25)' : 'oklch(0.85 0.005 65)' }}>
                  {stats.semCusto}
                  {showOnlySemCusto && <span className="text-xs font-normal ml-1" style={{ color: 'oklch(0.65 0.22 25)' }}>(filtrado)</span>}
                </p>
              </button>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Total Venda</p>
              <p className="font-rajdhani font-bold text-xl" style={{ color: 'oklch(0.85 0.005 65)' }}>{formatBRL(stats.totalVenda)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Total Lucro</p>
              <p className="font-rajdhani font-bold text-xl" style={{ color: stats.totalLucro >= 0 ? 'oklch(0.72 0.17 145)' : 'oklch(0.65 0.22 25)' }}>
                {formatBRL(stats.totalLucro)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Margem Média</p>
              <p className="font-rajdhani font-bold text-xl" style={{ color: stats.avgLucroPct >= 0 ? 'oklch(0.72 0.17 145)' : 'oklch(0.65 0.22 25)' }}>
                {stats.avgLucroPct.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Alerta visual para produtos sem custo USD */}
          {stats.semCusto > 0 && !showOnlySemCusto && (
            <div
              className="mx-6 mt-3 px-4 py-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all hover:brightness-110"
              style={{
                background: 'oklch(0.18 0.08 25 / 0.3)',
                borderColor: 'oklch(0.50 0.22 25 / 0.5)',
              }}
              onClick={() => setShowOnlySemCusto(true)}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'oklch(0.30 0.18 25)' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: 'oklch(0.90 0.15 65)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'oklch(0.90 0.15 65)' }}>
                  {stats.semCusto} produtos sem preço de custo em dólar
                </p>
                <p className="text-xs" style={{ color: 'oklch(0.65 0.08 65)' }}>
                  Clique para filtrar e preencher os custos USD pendentes
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: 'oklch(0.50 0.22 25)', color: 'white' }}>
                Filtrar
              </span>
            </div>
          )}

          {/* Banner ativo quando filtro sem custo está ligado */}
          {showOnlySemCusto && (
            <div
              className="mx-6 mt-3 px-4 py-2 rounded-lg border flex items-center gap-3"
              style={{
                background: 'oklch(0.20 0.15 25 / 0.4)',
                borderColor: 'oklch(0.55 0.22 25)',
              }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: 'oklch(0.90 0.15 65)' }} />
              <p className="text-xs flex-1" style={{ color: 'oklch(0.90 0.10 65)' }}>
                Mostrando apenas <strong>{stats.total} produtos sem custo USD</strong>. Preencha os valores na coluna "Custo (USD)".
              </p>
              <button
                onClick={() => setShowOnlySemCusto(false)}
                className="text-xs px-3 py-1 rounded-full font-semibold transition-colors hover:brightness-110"
                style={{ background: 'oklch(0.35 0.010 285)', color: 'oklch(0.85 0.005 65)' }}
              >
                Mostrar Todos
              </button>
            </div>
          )}

          {/* Products */}
          <div className="flex-1 flex flex-col p-4" style={{ minHeight: 0 }}>
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
                <table className="w-full text-sm" style={{ color: 'oklch(0.85 0.005 65)', minWidth: '1200px' }}>
                  <thead>
                    <tr style={{ borderColor: 'oklch(0.22 0.005 285)' }} className="border-b">
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider sticky left-0 z-20" style={{ color: 'oklch(0.50 0.010 285)', background: 'oklch(0.14 0.005 285)', width: '100px' }}>
                        <button onClick={() => toggleSort('codigo')} className="flex items-center gap-1">
                          Código <SortIcon field="codigo" />
                        </button>
                      </th>
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider sticky left-[100px] z-20" style={{ color: 'oklch(0.50 0.010 285)', background: 'oklch(0.14 0.005 285)', minWidth: '200px', boxShadow: '4px 0 8px -2px oklch(0 0 0 / 0.3)' }}>
                        <button onClick={() => toggleSort('descricao')} className="flex items-center gap-1">
                          Descrição <SortIcon field="descricao" />
                        </button>
                      </th>
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Cód. Barras</th>
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Unid</th>
                      <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                        <button onClick={() => toggleSort('preco_venda')} className="flex items-center gap-1 ml-auto">
                          Venda <SortIcon field="preco_venda" />
                        </button>
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.48 0.22 25)' }}>Custo USD</th>
                      <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Custo R$</th>
                      <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                        <button onClick={() => toggleSort('lucro')} className="flex items-center gap-1 ml-auto">
                          Lucro <SortIcon field="lucro" />
                        </button>
                      </th>
                      <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                        <button onClick={() => toggleSort('lucro_pct')} className="flex items-center gap-1 ml-auto">
                          Margem <SortIcon field="lucro_pct" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const custo = getCusto(p.id);
                      const custoR = getCustoReal(p.id);
                      const lucro = getLucro(p.id, p.preco_venda);
                      const lucroPct = getLucroPct(p.id, p.preco_venda);
                      return (
                        <tr
                          key={p.id}
                          style={{
                            borderColor: 'oklch(0.18 0.005 285)',
                            borderLeft: custo <= 0 ? '3px solid oklch(0.55 0.22 25)' : '3px solid transparent',
                            background: custo <= 0 ? 'oklch(0.14 0.03 25 / 0.15)' : 'transparent',
                          }}
                          className="border-b transition-colors"
                          onMouseEnter={e => (e.currentTarget.style.background = custo <= 0 ? 'oklch(0.16 0.05 25 / 0.25)' : 'oklch(0.16 0.005 285)')}
                          onMouseLeave={e => (e.currentTarget.style.background = custo <= 0 ? 'oklch(0.14 0.03 25 / 0.15)' : 'transparent')}
                        >
                          <td className="px-3 py-2 font-rajdhani font-semibold text-xs tracking-wide sticky left-0 z-10" style={{ color: 'oklch(0.48 0.22 25)', background: 'inherit' }}>{p.codigo}</td>
                          <td className="px-3 py-2 text-xs max-w-[280px] truncate sticky left-[100px] z-10" style={{ background: 'inherit', boxShadow: '4px 0 8px -2px oklch(0 0 0 / 0.3)' }}>{p.descricao}</td>
                          <td className="px-3 py-2 font-mono text-[11px]" style={{ color: 'oklch(0.55 0.010 285)' }}>{p.cod_barras}</td>
                          <td className="px-3 py-2 text-xs" style={{ color: 'oklch(0.55 0.010 285)' }}>{p.unid}</td>
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
                              <span style={{ color: 'oklch(0.40 0.010 285)' }}>—</span>
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
                              <span style={{ color: 'oklch(0.40 0.010 285)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20" style={{ color: 'oklch(0.45 0.010 285)' }}>
                <Package className="w-12 h-12 mb-4" />
                <p className="text-lg font-rajdhani">Nenhum produto encontrado</p>
                <p className="text-sm mt-1">Tente ajustar os filtros ou a busca</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
          <div
            className="rounded-xl p-6 w-96 shadow-2xl border"
            style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-rajdhani font-bold mb-4" style={{ color: 'oklch(0.85 0.005 65)' }}>
              Configurações Rápidas
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Taxa de Câmbio (USD → R$)</label>
                <input
                  type="number"
                  value={taxaCambio}
                  onChange={e => setTaxaCambio(parseFloat(e.target.value) || 8.5)}
                  step="0.01"
                  className="w-full mt-2 px-4 py-2.5 rounded-md border font-rajdhani font-semibold text-lg"
                  style={{
                    background: 'oklch(0.14 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
                <p className="text-[11px] mt-2" style={{ color: 'oklch(0.45 0.010 285)' }}>
                  Fórmula: Custo R$ = Custo USD × {taxaCambio.toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="mt-6 w-full px-4 py-2.5 rounded-md font-medium transition-colors"
              style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
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
      <div className="flex items-center gap-1 justify-end">
        <span className="text-xs font-bold" style={{ color: 'oklch(0.48 0.22 25)' }}>R$</span>
        <input
          type="number"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
          step="0.01"
          className="asx-input-usd w-24"
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
        color: value > 0 ? 'oklch(0.85 0.005 65)' : 'oklch(0.45 0.010 285)',
        background: value > 0 ? 'oklch(0.20 0.005 285)' : 'oklch(0.16 0.005 285)',
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
        <span className="text-xs font-bold" style={{ color: 'oklch(0.48 0.22 25)' }}>%</span>
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
        <span className="text-xs font-bold" style={{ color: 'oklch(0.48 0.22 25)' }}>$</span>
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
        color: value > 0 ? 'oklch(0.85 0.005 65)' : 'oklch(0.48 0.22 25)',
        background: value > 0 ? 'oklch(0.20 0.005 285)' : 'oklch(0.48 0.22 25 / 0.12)',
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
      <div className="mb-3 h-28 rounded-md flex items-center justify-center overflow-hidden" style={{
        background: 'oklch(0.12 0.005 285)',
      }}>
        <Package className="w-8 h-8" style={{ color: 'oklch(0.30 0.010 285)' }} />
      </div>

      {/* Info */}
      <p className="font-rajdhani font-semibold text-xs tracking-wide" style={{ color: 'oklch(0.48 0.22 25)' }}>{produto.codigo}</p>
      <p className="text-xs font-medium line-clamp-2 mt-0.5 mb-1" style={{ color: 'oklch(0.80 0.005 65)' }}>{produto.descricao}</p>
      <p className="text-[10px] font-mono mb-3" style={{ color: 'oklch(0.40 0.010 285)' }}>EAN: {produto.cod_barras}</p>

      {/* Preço Venda */}
      <div className="mb-3 pb-3 border-b" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Preço Venda</p>
        <p className="font-rajdhani text-lg font-bold" style={{ color: 'oklch(0.85 0.005 65)' }}>
          {produto.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      </div>

      {/* Custo */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Custo USD</p>
          {custo > 0 && (
            <button onClick={() => onCustoChange(0)} className="text-[10px]" style={{ color: 'oklch(0.50 0.010 285)' }}>limpar</button>
          )}
        </div>
        {!showCustoInput ? (
          <button
            onClick={() => { setInputValue(custo > 0 ? custo.toString() : ''); setShowCustoInput(true); }}
            className="w-full px-2 py-1.5 rounded text-sm font-rajdhani font-semibold transition-colors"
            style={{
              background: custo > 0 ? 'oklch(0.20 0.005 285)' : 'oklch(0.48 0.22 25 / 0.12)',
              color: custo > 0 ? 'oklch(0.85 0.005 65)' : 'oklch(0.48 0.22 25)',
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
              style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
            >
              OK
            </button>
          </div>
        )}
      </div>

      {/* Custo R$ */}
      {custoReal > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Custo R$</p>
          <p className="font-mono text-sm" style={{ color: 'oklch(0.65 0.010 285)' }}>
            {custoReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      )}

      {/* Lucro */}
      {custo > 0 && (
        <div className="pt-2 border-t" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'oklch(0.45 0.010 285)' }}>Lucro Bruto</p>
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