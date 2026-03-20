/*
  ASX Dark Command Center — Pagamentos
  Controle de Debitos e Pagamentos com balanco geral
  Layout: 3 KPIs no topo + duas tabelas lado a lado (Debitos | Pagamentos)
  Data: tRPC (debito / pagamento)
*/

import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Check, X, DollarSign, TrendingDown, TrendingUp, ArrowUpDown, Download } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatUSD } from '@/lib/formatters';

// ─── Types (local UI representations) ────────────────────────────────
interface Debito {
  id: number;
  data: string;
  ordem: string;
  valor: number;
}

interface Pagamento {
  id: number;
  data: string;
  remetente: string;
  valor: number;
  tipo: string;
}

// ─── Constants ───────────────────────────────────────────────────────
const TIPOS_PAGAMENTO = ['MIC', 'NAITE', 'TT', 'LC', 'OUTRO'];

// ─── Helpers ─────────────────────────────────────────────────────────
function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function parseFloatSafe(str: string): number {
  const cleaned = str.replace(/[^\d.,-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

// ─── Component ───────────────────────────────────────────────────────
export default function Pagamentos() {
  // ─── tRPC queries ───────────────────────────────────────────────
  const utils = trpc.useUtils();
  const debitosQuery = trpc.debito.getAll.useQuery();
  const pagamentosQuery = trpc.pagamento.getAll.useQuery();

  // ─── tRPC mutations — Debitos ───────────────────────────────────
  const criarDebito = trpc.debito.criar.useMutation({
    onSuccess: () => utils.debito.getAll.invalidate(),
  });
  const atualizarDebito = trpc.debito.atualizar.useMutation({
    onSuccess: () => utils.debito.getAll.invalidate(),
  });
  const deletarDebito = trpc.debito.deletar.useMutation({
    onSuccess: () => utils.debito.getAll.invalidate(),
  });

  // ─── tRPC mutations — Pagamentos ───────────────────────────────
  const criarPagamento = trpc.pagamento.criar.useMutation({
    onSuccess: () => utils.pagamento.getAll.invalidate(),
  });
  const atualizarPagamento = trpc.pagamento.atualizar.useMutation({
    onSuccess: () => utils.pagamento.getAll.invalidate(),
  });
  const deletarPagamento = trpc.pagamento.deletar.useMutation({
    onSuccess: () => utils.pagamento.getAll.invalidate(),
  });

  // ─── Map DB records to local shape (parseFloat on valor) ────────
  const debitos: Debito[] = useMemo(() => {
    if (!debitosQuery.data) return [];
    return debitosQuery.data.map((d: any) => ({
      id: d.id,
      data: d.dataVencimento ? new Date(d.dataVencimento).toISOString().slice(0, 10) : '',
      ordem: d.descricao || '',
      valor: parseFloat(d.valor),
    }));
  }, [debitosQuery.data]);

  const pagamentos: Pagamento[] = useMemo(() => {
    if (!pagamentosQuery.data) return [];
    return pagamentosQuery.data.map((p: any) => ({
      id: p.id,
      data: p.dataPagamento ? new Date(p.dataPagamento).toISOString().slice(0, 10) : '',
      remetente: p.observacoes || '',
      valor: parseFloat(p.valor),
      tipo: 'TT',
    }));
  }, [pagamentosQuery.data]);

  // Edit states
  const [editingDebitoId, setEditingDebitoId] = useState<number | null>(null);
  const [editingPagamentoId, setEditingPagamentoId] = useState<number | null>(null);

  // New row states
  const [showNewDebito, setShowNewDebito] = useState(false);
  const [showNewPagamento, setShowNewPagamento] = useState(false);

  // New debito form
  const [newDebito, setNewDebito] = useState({ data: '', ordem: '', valor: '' });
  // New pagamento form
  const [newPagamento, setNewPagamento] = useState({ data: '', remetente: '', valor: '', tipo: 'MIC' });

  // Edit forms
  const [editDebito, setEditDebito] = useState<Debito | null>(null);
  const [editPagamento, setEditPagamento] = useState<Pagamento | null>(null);

  // Sort
  const [sortDebitos, setSortDebitos] = useState<'date-asc' | 'date-desc' | 'value-asc' | 'value-desc'>('date-desc');
  const [sortPagamentos, setSortPagamentos] = useState<'date-asc' | 'date-desc' | 'value-asc' | 'value-desc'>('date-desc');

  // ─── Totals ──────────────────────────────────────────────────────
  const totalDebitos = useMemo(() => debitos.reduce((s, d) => s + d.valor, 0), [debitos]);
  const totalPagamentos = useMemo(() => pagamentos.reduce((s, p) => s + p.valor, 0), [pagamentos]);
  const balanco = useMemo(() => totalPagamentos - totalDebitos, [totalDebitos, totalPagamentos]);

  // ─── Sorted lists ────────────────────────────────────────────────
  const sortedDebitos = useMemo(() => {
    const arr = [...debitos];
    arr.sort((a, b) => {
      if (sortDebitos === 'date-asc') return a.data.localeCompare(b.data);
      if (sortDebitos === 'date-desc') return b.data.localeCompare(a.data);
      if (sortDebitos === 'value-asc') return a.valor - b.valor;
      return b.valor - a.valor;
    });
    return arr;
  }, [debitos, sortDebitos]);

  const sortedPagamentos = useMemo(() => {
    const arr = [...pagamentos];
    arr.sort((a, b) => {
      if (sortPagamentos === 'date-asc') return a.data.localeCompare(b.data);
      if (sortPagamentos === 'date-desc') return b.data.localeCompare(a.data);
      if (sortPagamentos === 'value-asc') return a.valor - b.valor;
      return b.valor - a.valor;
    });
    return arr;
  }, [pagamentos, sortPagamentos]);

  // ─── CRUD Debitos ────────────────────────────────────────────────
  const addDebito = () => {
    if (!newDebito.data || !newDebito.ordem || !newDebito.valor) return;
    criarDebito.mutate({
      descricao: newDebito.ordem.trim(),
      valor: parseFloatSafe(newDebito.valor),
      dataVencimento: newDebito.data,
      pago: 0,
    });
    setNewDebito({ data: '', ordem: '', valor: '' });
    setShowNewDebito(false);
  };

  const deleteDebito = (id: number) => {
    // TODO: Replace confirm() with a proper confirmation dialog component
    if (!confirm('Deseja realmente excluir este debito?')) return;
    deletarDebito.mutate({ id });
  };

  const startEditDebito = (d: Debito) => {
    setEditingDebitoId(d.id);
    setEditDebito({ ...d });
  };

  const saveEditDebito = () => {
    if (!editDebito) return;
    atualizarDebito.mutate({
      id: editDebito.id,
      descricao: editDebito.ordem,
      valor: parseFloat(String(editDebito.valor)),
      dataVencimento: editDebito.data,
    });
    setEditingDebitoId(null);
    setEditDebito(null);
  };

  const cancelEditDebito = () => {
    setEditingDebitoId(null);
    setEditDebito(null);
  };

  // ─── CRUD Pagamentos ────────────────────────────────────────────
  const addPagamento = () => {
    if (!newPagamento.data || !newPagamento.remetente || !newPagamento.valor) return;
    criarPagamento.mutate({
      valor: parseFloatSafe(newPagamento.valor),
      dataPagamento: newPagamento.data,
      observacoes: newPagamento.remetente.trim(),
    });
    setNewPagamento({ data: '', remetente: '', valor: '', tipo: 'MIC' });
    setShowNewPagamento(false);
  };

  const deletePagamento = (id: number) => {
    // TODO: Replace confirm() with a proper confirmation dialog component
    if (!confirm('Deseja realmente excluir este pagamento?')) return;
    deletarPagamento.mutate({ id });
  };

  const startEditPagamento = (p: Pagamento) => {
    setEditingPagamentoId(p.id);
    setEditPagamento({ ...p });
  };

  const saveEditPagamento = () => {
    if (!editPagamento) return;
    atualizarPagamento.mutate({
      id: editPagamento.id,
      valor: parseFloat(String(editPagamento.valor)),
      dataPagamento: editPagamento.data,
      observacoes: editPagamento.remetente,
    });
    setEditingPagamentoId(null);
    setEditPagamento(null);
  };

  const cancelEditPagamento = () => {
    setEditingPagamentoId(null);
    setEditPagamento(null);
  };

  // ─── Export CSV ──────────────────────────────────────────────────
  const exportCSV = () => {
    let csv = 'DEBITOS\nDATA,ORDEM,VALOR USD\n';
    debitos.forEach(d => {
      csv += `${formatDateBR(d.data)},"${d.ordem}",${d.valor.toFixed(2)}\n`;
    });
    csv += `\nTOTAL DEBITOS,,${totalDebitos.toFixed(2)}\n`;
    csv += '\nPAGAMENTOS\nDATA,REMETENTE,VALOR USD,TIPO\n';
    pagamentos.forEach(p => {
      csv += `${formatDateBR(p.data)},"${p.remetente}",${p.valor.toFixed(2)},${p.tipo}\n`;
    });
    csv += `\nTOTAL PAGAMENTOS,,${totalPagamentos.toFixed(2)}\n`;
    csv += `\nBALANCO,,${balanco.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagamentos_asx_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Cycle sort ──────────────────────────────────────────────────
  const cycleSortDebitos = () => {
    const cycle: typeof sortDebitos[] = ['date-desc', 'date-asc', 'value-desc', 'value-asc'];
    const idx = cycle.indexOf(sortDebitos);
    setSortDebitos(cycle[(idx + 1) % cycle.length]);
  };

  const cycleSortPagamentos = () => {
    const cycle: typeof sortPagamentos[] = ['date-desc', 'date-asc', 'value-desc', 'value-asc'];
    const idx = cycle.indexOf(sortPagamentos);
    setSortPagamentos(cycle[(idx + 1) % cycle.length]);
  };

  // ─── Styles (CSS custom properties) ──────────────────────────────
  const bg = 'var(--color-asx-dark)';
  const bgCard = 'var(--color-asx-surface)';
  const bgRow = 'var(--color-asx-base)';
  const bgRowHover = 'oklch(0.18 0.005 285)';
  const border = 'var(--color-asx-border)';
  const textPrimary = 'var(--color-asx-text)';
  const textSecondary = 'var(--color-asx-text-muted)';
  const accentRed = 'oklch(0.55 0.22 25)';
  const accentGreen = 'oklch(0.55 0.18 155)';
  const accentOrange = 'oklch(0.70 0.18 65)';

  const inputStyle: React.CSSProperties = {
    background: bgRow,
    border: `1px solid ${border}`,
    color: textPrimary,
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '13px',
    fontFamily: 'Rajdhani, sans-serif',
    width: '100%',
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: textSecondary,
    borderBottom: `1px solid ${border}`,
    textAlign: 'left',
    fontFamily: 'Rajdhani, sans-serif',
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '13px',
    color: textPrimary,
    borderBottom: `1px solid var(--color-asx-surface-2)`,
    fontFamily: 'Rajdhani, sans-serif',
  };

  // ─── Loading state ───────────────────────────────────────────────
  if (debitosQuery.isLoading || pagamentosQuery.isLoading) {
    return (
      <div className="p-4 md:p-6 min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <p className="text-lg font-rajdhani" style={{ color: textSecondary }}>Carregando...</p>
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────
  if (debitosQuery.isError || pagamentosQuery.isError) {
    return (
      <div className="p-4 md:p-6 min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <div className="text-center">
          <p className="text-lg font-rajdhani mb-2" style={{ color: 'var(--color-asx-error)' }}>
            Erro ao carregar dados
          </p>
          <p className="text-sm font-rajdhani" style={{ color: textSecondary }}>
            {debitosQuery.error?.message || pagamentosQuery.error?.message || 'Erro desconhecido'}
          </p>
        </div>
      </div>
    );
  }

  // ─── Mutation pending helpers ────────────────────────────────────
  const isDebitoMutating = criarDebito.isPending || atualizarDebito.isPending || deletarDebito.isPending;
  const isPagamentoMutating = criarPagamento.isPending || atualizarPagamento.isPending || deletarPagamento.isPending;

  return (
    <div className="p-4 md:p-6 min-h-screen" style={{ background: bg }}>
      {/* === Header === */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-rajdhani font-bold" style={{ color: textPrimary }}>
            Pagamentos
          </h1>
          <p className="text-sm mt-1" style={{ color: textSecondary }}>
            Controle de debitos e pagamentos — Balanco geral
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-rajdhani font-semibold transition-all hover:opacity-80"
          style={{ background: 'oklch(0.25 0.005 285)', color: textPrimary, border: `1px solid ${border}` }}
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* === KPI Cards === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Debitos */}
        <div className="rounded-xl p-5 border" style={{ background: bgCard, borderColor: border }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'oklch(0.20 0.15 25 / 0.4)' }}>
              <TrendingDown className="w-5 h-5" style={{ color: accentRed }} />
            </div>
            <span className="text-xs font-rajdhani font-bold tracking-wider uppercase" style={{ color: textSecondary }}>
              Total Debitos
            </span>
          </div>
          <div className="text-2xl font-rajdhani font-bold" style={{ color: accentRed }}>
            {formatUSD(totalDebitos)}
          </div>
          <div className="text-xs mt-1" style={{ color: textSecondary }}>
            {debitos.length} {debitos.length === 1 ? 'registro' : 'registros'}
          </div>
        </div>

        {/* Balanco */}
        <div className="rounded-xl p-5 border" style={{
          background: bgCard,
          borderColor: balanco >= 0 ? accentGreen : accentRed,
          boxShadow: `0 0 20px ${balanco >= 0 ? 'oklch(0.55 0.18 155 / 0.1)' : 'oklch(0.55 0.22 25 / 0.15)'}`,
        }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
              background: balanco >= 0 ? 'oklch(0.20 0.15 155 / 0.4)' : 'oklch(0.20 0.15 25 / 0.4)',
            }}>
              <DollarSign className="w-5 h-5" style={{ color: balanco >= 0 ? accentGreen : accentRed }} />
            </div>
            <span className="text-xs font-rajdhani font-bold tracking-wider uppercase" style={{ color: textSecondary }}>
              Balanco
            </span>
          </div>
          <div className="text-3xl font-rajdhani font-bold" style={{ color: balanco >= 0 ? accentGreen : accentRed }}>
            {balanco < 0 ? '-' : ''}{formatUSD(Math.abs(balanco))}
          </div>
          <div className="text-xs mt-1" style={{ color: textSecondary }}>
            {balanco >= 0 ? 'Credito disponivel' : 'Saldo devedor'}
          </div>
        </div>

        {/* Total Pagamentos */}
        <div className="rounded-xl p-5 border" style={{ background: bgCard, borderColor: border }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'oklch(0.20 0.15 155 / 0.4)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: accentGreen }} />
            </div>
            <span className="text-xs font-rajdhani font-bold tracking-wider uppercase" style={{ color: textSecondary }}>
              Total Pagamentos
            </span>
          </div>
          <div className="text-2xl font-rajdhani font-bold" style={{ color: accentGreen }}>
            {formatUSD(totalPagamentos)}
          </div>
          <div className="text-xs mt-1" style={{ color: textSecondary }}>
            {pagamentos.length} {pagamentos.length === 1 ? 'registro' : 'registros'}
          </div>
        </div>
      </div>

      {/* === Two-column tables === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* --- DEBITOS --- */}
        <div className="rounded-xl border overflow-hidden" style={{ background: bgCard, borderColor: border }}>
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${border}` }}>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: accentRed }} />
              <h2 className="text-base font-rajdhani font-bold uppercase tracking-wider" style={{ color: textPrimary }}>
                Debitos
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-rajdhani" style={{ background: 'oklch(0.20 0.15 25 / 0.3)', color: accentRed }}>
                {debitos.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cycleSortDebitos}
                className="p-1.5 rounded-lg hover:opacity-80 transition-all"
                style={{ background: 'var(--color-asx-surface-2)' }}
                title={`Ordenar: ${sortDebitos}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" style={{ color: textSecondary }} />
              </button>
              <button
                onClick={() => { setShowNewDebito(true); setNewDebito({ data: new Date().toISOString().slice(0, 10), ordem: '', valor: '' }); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-rajdhani font-semibold transition-all hover:opacity-80"
                style={{ background: accentRed, color: 'white' }}
                disabled={isDebitoMutating}
              >
                <Plus className="w-3.5 h-3.5" />
                Novo
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'oklch(0.13 0.005 285)' }}>
                  <th style={{ ...thStyle, width: '110px' }}>Data</th>
                  <th style={thStyle}>Ordem</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: '140px' }}>Valor (USD)</th>
                  <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {/* New row */}
                {showNewDebito && (
                  <tr style={{ background: 'oklch(0.18 0.02 25 / 0.15)' }}>
                    <td style={tdStyle}>
                      <input type="date" value={newDebito.data} onChange={e => setNewDebito(p => ({ ...p, data: e.target.value }))} style={inputStyle} />
                    </td>
                    <td style={tdStyle}>
                      <input placeholder="Ex: TRUCK082023" value={newDebito.ordem} onChange={e => setNewDebito(p => ({ ...p, ordem: e.target.value }))} style={inputStyle}
                        onKeyDown={e => e.key === 'Enter' && addDebito()} />
                    </td>
                    <td style={tdStyle}>
                      <input placeholder="0.00" value={newDebito.valor} onChange={e => setNewDebito(p => ({ ...p, valor: e.target.value }))} style={{ ...inputStyle, textAlign: 'right' }}
                        onKeyDown={e => e.key === 'Enter' && addDebito()} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={addDebito} className="p-1 rounded hover:opacity-80" style={{ color: accentGreen }} disabled={criarDebito.isPending}>
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowNewDebito(false)} className="p-1 rounded hover:opacity-80" style={{ color: accentRed }}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {sortedDebitos.map((d) => (
                  <tr key={d.id} className="group" style={{ background: bgRow }}
                    onMouseEnter={e => (e.currentTarget.style.background = bgRowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = bgRow)}
                  >
                    {editingDebitoId === d.id && editDebito ? (
                      <>
                        <td style={tdStyle}>
                          <input type="date" value={editDebito.data} onChange={e => setEditDebito({ ...editDebito, data: e.target.value })} style={inputStyle} />
                        </td>
                        <td style={tdStyle}>
                          <input value={editDebito.ordem} onChange={e => setEditDebito({ ...editDebito, ordem: e.target.value })} style={inputStyle} />
                        </td>
                        <td style={tdStyle}>
                          <input value={editDebito.valor} onChange={e => setEditDebito({ ...editDebito, valor: parseFloatSafe(e.target.value) })} style={{ ...inputStyle, textAlign: 'right' }}
                            onKeyDown={e => e.key === 'Enter' && saveEditDebito()} />
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={saveEditDebito} className="p-1 rounded hover:opacity-80" style={{ color: accentGreen }} disabled={atualizarDebito.isPending}>
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEditDebito} className="p-1 rounded hover:opacity-80" style={{ color: accentRed }}>
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={tdStyle}>{formatDateBR(d.data)}</td>
                        <td style={tdStyle}>{d.ordem}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatUSD(d.valor)}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEditDebito(d)} className="p-1 rounded hover:opacity-80" style={{ color: accentOrange }} disabled={isDebitoMutating}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteDebito(d.id)} className="p-1 rounded hover:opacity-80" style={{ color: accentRed }} disabled={deletarDebito.isPending}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}

                {debitos.length === 0 && !showNewDebito && (
                  <tr>
                    <td colSpan={4} className="text-center py-12" style={{ color: textSecondary, fontSize: '13px' }}>
                      Nenhum debito registrado. Clique em "Novo" para adicionar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer total */}
          {debitos.length > 0 && (
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${border}`, background: 'oklch(0.13 0.005 285)' }}>
              <span className="text-xs font-rajdhani font-bold uppercase tracking-wider" style={{ color: textSecondary }}>
                Total Debitos
              </span>
              <span className="text-base font-rajdhani font-bold" style={{ color: accentRed }}>
                {formatUSD(totalDebitos)}
              </span>
            </div>
          )}
        </div>

        {/* --- PAGAMENTOS --- */}
        <div className="rounded-xl border overflow-hidden" style={{ background: bgCard, borderColor: border }}>
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${border}` }}>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: accentGreen }} />
              <h2 className="text-base font-rajdhani font-bold uppercase tracking-wider" style={{ color: textPrimary }}>
                Pagamentos
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-rajdhani" style={{ background: 'oklch(0.20 0.15 155 / 0.3)', color: accentGreen }}>
                {pagamentos.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cycleSortPagamentos}
                className="p-1.5 rounded-lg hover:opacity-80 transition-all"
                style={{ background: 'var(--color-asx-surface-2)' }}
                title={`Ordenar: ${sortPagamentos}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" style={{ color: textSecondary }} />
              </button>
              <button
                onClick={() => { setShowNewPagamento(true); setNewPagamento({ data: new Date().toISOString().slice(0, 10), remetente: '', valor: '', tipo: 'MIC' }); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-rajdhani font-semibold transition-all hover:opacity-80"
                style={{ background: accentGreen, color: 'white' }}
                disabled={isPagamentoMutating}
              >
                <Plus className="w-3.5 h-3.5" />
                Novo
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'oklch(0.13 0.005 285)' }}>
                  <th style={{ ...thStyle, width: '110px' }}>Data</th>
                  <th style={thStyle}>Remetente</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: '140px' }}>Valor (USD)</th>
                  <th style={{ ...thStyle, width: '75px', textAlign: 'center' }}>Tipo</th>
                  <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {/* New row */}
                {showNewPagamento && (
                  <tr style={{ background: 'oklch(0.18 0.02 155 / 0.1)' }}>
                    <td style={tdStyle}>
                      <input type="date" value={newPagamento.data} onChange={e => setNewPagamento(p => ({ ...p, data: e.target.value }))} style={inputStyle} />
                    </td>
                    <td style={tdStyle}>
                      <input placeholder="Ex: BLUE SMART HOMES INC" value={newPagamento.remetente} onChange={e => setNewPagamento(p => ({ ...p, remetente: e.target.value }))} style={inputStyle}
                        onKeyDown={e => e.key === 'Enter' && addPagamento()} />
                    </td>
                    <td style={tdStyle}>
                      <input placeholder="0.00" value={newPagamento.valor} onChange={e => setNewPagamento(p => ({ ...p, valor: e.target.value }))} style={{ ...inputStyle, textAlign: 'right' }}
                        onKeyDown={e => e.key === 'Enter' && addPagamento()} />
                    </td>
                    <td style={tdStyle}>
                      <select value={newPagamento.tipo} onChange={e => setNewPagamento(p => ({ ...p, tipo: e.target.value }))} style={inputStyle}>
                        {TIPOS_PAGAMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={addPagamento} className="p-1 rounded hover:opacity-80" style={{ color: accentGreen }} disabled={criarPagamento.isPending}>
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowNewPagamento(false)} className="p-1 rounded hover:opacity-80" style={{ color: accentRed }}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {sortedPagamentos.map((p) => (
                  <tr key={p.id} className="group" style={{ background: bgRow }}
                    onMouseEnter={e => (e.currentTarget.style.background = bgRowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = bgRow)}
                  >
                    {editingPagamentoId === p.id && editPagamento ? (
                      <>
                        <td style={tdStyle}>
                          <input type="date" value={editPagamento.data} onChange={e => setEditPagamento({ ...editPagamento, data: e.target.value })} style={inputStyle} />
                        </td>
                        <td style={tdStyle}>
                          <input value={editPagamento.remetente} onChange={e => setEditPagamento({ ...editPagamento, remetente: e.target.value })} style={inputStyle} />
                        </td>
                        <td style={tdStyle}>
                          <input value={editPagamento.valor} onChange={e => setEditPagamento({ ...editPagamento, valor: parseFloatSafe(e.target.value) })} style={{ ...inputStyle, textAlign: 'right' }}
                            onKeyDown={e => e.key === 'Enter' && saveEditPagamento()} />
                        </td>
                        <td style={tdStyle}>
                          <select value={editPagamento.tipo} onChange={e => setEditPagamento({ ...editPagamento, tipo: e.target.value })} style={inputStyle}>
                            {TIPOS_PAGAMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={saveEditPagamento} className="p-1 rounded hover:opacity-80" style={{ color: accentGreen }} disabled={atualizarPagamento.isPending}>
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEditPagamento} className="p-1 rounded hover:opacity-80" style={{ color: accentRed }}>
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={tdStyle}>{formatDateBR(p.data)}</td>
                        <td style={tdStyle}>{p.remetente}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatUSD(p.valor)}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span className="text-xs px-2 py-0.5 rounded-full font-rajdhani font-semibold" style={{
                            background: p.tipo === 'NAITE' ? 'oklch(0.20 0.15 65 / 0.4)' : 'oklch(0.20 0.10 285 / 0.4)',
                            color: p.tipo === 'NAITE' ? accentOrange : 'oklch(0.70 0.10 250)',
                          }}>
                            {p.tipo}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEditPagamento(p)} className="p-1 rounded hover:opacity-80" style={{ color: accentOrange }} disabled={isPagamentoMutating}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deletePagamento(p.id)} className="p-1 rounded hover:opacity-80" style={{ color: accentRed }} disabled={deletarPagamento.isPending}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}

                {pagamentos.length === 0 && !showNewPagamento && (
                  <tr>
                    <td colSpan={5} className="text-center py-12" style={{ color: textSecondary, fontSize: '13px' }}>
                      Nenhum pagamento registrado. Clique em "Novo" para adicionar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer total */}
          {pagamentos.length > 0 && (
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${border}`, background: 'oklch(0.13 0.005 285)' }}>
              <span className="text-xs font-rajdhani font-bold uppercase tracking-wider" style={{ color: textSecondary }}>
                Total Pagamentos
              </span>
              <span className="text-base font-rajdhani font-bold" style={{ color: accentGreen }}>
                {formatUSD(totalPagamentos)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
