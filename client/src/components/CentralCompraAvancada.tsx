/*
  CentralCompraAvancada — Gestão de Estoque e Compras
  Colunas conforme imagem de referência:
  COD, DESCRIÇÃO, ESTOQUE EM (data), TOTAL ORDENS, ESTOQUE+PEDIDOS,
  DURAÇÃO 6M, DURAÇÃO 3M, TOTAL EMBARCADO,
  DURAÇÃO 6M EMBARC., DURAÇÃO 3M EMBARC.,
  COMPRAS, DURAÇÃO 6M COMPRAS, DURAÇÃO 3M COMPRAS
*/

import { useState, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { produtos } from '@/data/produtos';
import { useAnaliseEstoque } from '@/hooks/useAnaliseEstoque';
import { useEstoque } from '@/hooks/useEstoque';
import { useIdioma } from '@/hooks/useIdioma';
import { ArrowLeft, Download, Upload, ChevronUp, ChevronDown, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import ModalEstoque from '@/components/ModalEstoque';
import * as XLSX from 'xlsx';

interface CentralCompraAvancadaProps {
  comprador: 'sarom' | 'alexandre';
  titulo: string;
  corAcento: string;
}

type SortField = 'codigo' | 'descricao' | 'estoqueAtual' | 'totalOrdens' | 'estoquePlusPedidos' | 'duracao6meses' | 'duracao3meses' | 'totalEmbarcado' | 'duracao6mesesEmbarc' | 'duracao3mesesEmbarc' | 'sugestaoCompra' | 'duracao6mesesCompras' | 'duracao3mesesCompras';
type SortDir = 'asc' | 'desc';

const formatNum = (v: number, decimals = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const getDuracaoColor = (duracao: number) => {
  if (duracao <= 0) return { bg: 'oklch(0.55 0.25 30 / 0.25)', text: 'oklch(0.75 0.22 30)' };
  if (duracao < 1) return { bg: 'oklch(0.55 0.25 30 / 0.25)', text: 'oklch(0.75 0.22 30)' };
  if (duracao < 3) return { bg: 'oklch(0.70 0.18 85 / 0.25)', text: 'oklch(0.80 0.18 85)' };
  if (duracao < 6) return { bg: 'oklch(0.60 0.17 145 / 0.15)', text: 'oklch(0.72 0.17 145)' };
  return { bg: 'oklch(0.60 0.17 145 / 0.25)', text: 'oklch(0.80 0.17 145)' };
};

const LOGO_URL = '/logo-asx-black.svg'; // Logo SVG simples em preto

export default function CentralCompraAvancada({ comprador, titulo, corAcento }: CentralCompraAvancadaProps) {
  const [, setLocation] = useLocation();
  const { analisarProduto } = useAnaliseEstoque();
  const { produtosComEstoque } = useEstoque(comprador);
  const { t } = useIdioma();

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('codigo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [dataEstoque, setDataEstoque] = useState(new Date().toISOString().split('T')[0]);
  const [showModalEstoque, setShowModalEstoque] = useState(false);
  const [estoqueEditando, setEstoqueEditando] = useState<{[key: string]: number}>({});

  const handleSaveManualEstoque = useCallback((codigo: string, quantidade: number) => {
    console.log(`Estoque adicionado: ${codigo} = ${quantidade}`);
  }, []);

  const handleImportExcelEstoque = useCallback((dados: Array<{ codigo: string; quantidade: number }>) => {
    console.log('Estoque importado:', dados);
  }, []);

  const analise = useMemo(() => {
    return produtos
      .map(p => {
        const estoque = produtosComEstoque.find(pe => pe.id === p.id)?.estoqueInicial || 0;
        return analisarProduto(p.id, p.codigo, p.descricao, estoque, dataEstoque, comprador);
      })
      .filter(a => !search.trim() || a.codigo.toLowerCase().includes(search.toLowerCase()) || a.descricao.toLowerCase().includes(search.toLowerCase()));
  }, [produtosComEstoque, search, dataEstoque, comprador, analisarProduto]);

  const kpis = useMemo(() => {
    const totalProdutos = analise.length;
    const totalEstoque = analise.reduce((s, a) => s + a.estoqueAtual, 0);
    const totalOrdens = analise.reduce((s, a) => s + a.totalOrdens, 0);
    const totalEmbarcado = analise.reduce((s, a) => s + a.totalEmbarcado, 0);
    const skusCriticos = analise.filter(a => a.duracao6meses < 1).length;
    const skusAtencao = analise.filter(a => a.duracao6meses >= 1 && a.duracao6meses < 6).length;
    const skusOk = analise.filter(a => a.duracao6meses >= 6).length;
    const totalSugestaoCompra = analise.reduce((s, a) => s + a.sugestaoCompra, 0);
    return { totalProdutos, totalEstoque, totalOrdens, totalEmbarcado, skusCriticos, skusAtencao, skusOk, totalSugestaoCompra };
  }, [analise]);

  const sorted = useMemo(() => {
    const copy = [...analise];
    copy.sort((a, b) => {
      const aVal = (a as any)[sortField] ?? 0;
      const bVal = (b as any)[sortField] ?? 0;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [analise, sortField, sortDir]);

  const exportarExcel = useCallback(() => {
    const dados = sorted.map(item => ({
      'COD': item.codigo, 'DESCRIÇÃO': item.descricao, 'ESTOQUE': item.estoqueAtual,
      'TOTAL ORDENS': item.totalOrdens, 'ESTOQUE+PEDIDOS': item.estoquePlusPedidos,
      'DURAÇÃO 6M': item.duracao6meses, 'DURAÇÃO 3M': item.duracao3meses,
      'TOTAL EMBARCADO': item.totalEmbarcado, 'DUR. 6M EMBARC.': item.duracao6mesesEmbarc,
      'DUR. 3M EMBARC.': item.duracao3mesesEmbarc, 'COMPRAS': item.sugestaoCompra,
      'DUR. 6M COMPRAS': item.duracao6mesesCompras, 'DUR. 3M COMPRAS': item.duracao3mesesCompras,
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, comprador.toUpperCase());
    ws['!cols'] = Array(13).fill({ wch: 14 });
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Central_${comprador}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sorted, comprador]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <>
    <div className="h-full flex flex-col" style={{ background: 'oklch(0.18 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
      {/* KPIs */}
      <div className="px-6 py-4 border-b" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.28 0.005 285)' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.20 0.005 285)', borderColor: 'oklch(0.30 0.005 285)' }}>
            <div className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>{t('skusAtivos') || 'SKUs ATIVOS'}</div>
            <div className="text-2xl font-bold font-rajdhani mt-1" style={{ color: 'oklch(0.85 0.005 65)' }}>{kpis.totalProdutos}</div>
            <div className="text-[10px]" style={{ color: 'oklch(0.45 0.010 285)' }}>de {analise.length}</div>
          </div>
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.55 0.25 30 / 0.12)', borderColor: 'oklch(0.55 0.25 30 / 0.4)' }}>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'oklch(0.70 0.22 30)' }} />
              <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'oklch(0.70 0.22 30)' }}>{t('criticos') || 'CRÍTICOS'}</span>
            </div>
            <div className="text-2xl font-bold font-rajdhani mt-1" style={{ color: 'oklch(0.70 0.22 30)' }}>{kpis.skusCriticos}</div>
            <div className="text-[10px]" style={{ color: 'oklch(0.45 0.010 285)' }}>{'< 1 '}{t('mes') || 'mês'}</div>
          </div>
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.70 0.18 85 / 0.12)', borderColor: 'oklch(0.70 0.18 85 / 0.4)' }}>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" style={{ color: 'oklch(0.75 0.18 85)' }} />
              <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'oklch(0.75 0.18 85)' }}>{t('atencao') || 'ATENÇÃO'}</span>
            </div>
            <div className="text-2xl font-bold font-rajdhani mt-1" style={{ color: 'oklch(0.75 0.18 85)' }}>{kpis.skusAtencao}</div>
            <div className="text-[10px]" style={{ color: 'oklch(0.45 0.010 285)' }}>1-6 {t('meses') || 'meses'}</div>
          </div>
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.60 0.17 145 / 0.12)', borderColor: 'oklch(0.60 0.17 145 / 0.4)' }}>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'oklch(0.72 0.17 145)' }} />
              <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'oklch(0.72 0.17 145)' }}>OK</span>
            </div>
            <div className="text-2xl font-bold font-rajdhani mt-1" style={{ color: 'oklch(0.72 0.17 145)' }}>{kpis.skusOk}</div>
            <div className="text-[10px]" style={{ color: 'oklch(0.45 0.010 285)' }}>{'>'}6 {t('meses') || 'meses'}</div>
          </div>
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.20 0.005 285)', borderColor: 'oklch(0.30 0.005 285)' }}>
            <div className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>{t('estoqueTotal') || 'ESTOQUE'}</div>
            <div className="text-2xl font-bold font-rajdhani mt-1" style={{ color: 'oklch(0.85 0.005 65)' }}>{formatNum(kpis.totalEstoque)}</div>
            <div className="text-[10px]" style={{ color: 'oklch(0.45 0.010 285)' }}>{t('unidades')}</div>
          </div>
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.20 0.005 285)', borderColor: 'oklch(0.30 0.005 285)' }}>
            <div className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>{t('pedidosConfirmados') || 'PEDIDOS'}</div>
            <div className="text-2xl font-bold font-rajdhani mt-1" style={{ color: 'oklch(0.85 0.005 65)' }}>{formatNum(kpis.totalOrdens)}</div>
            <div className="text-[10px]" style={{ color: 'oklch(0.45 0.010 285)' }}>{t('confirmados') || 'confirmados'}</div>
          </div>
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.48 0.22 25 / 0.12)', borderColor: 'oklch(0.48 0.22 25 / 0.4)' }}>
            <div className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'oklch(0.65 0.22 25)' }}>{t('sugestaoCompra') || 'COMPRAS'}</div>
            <div className="text-2xl font-bold font-rajdhani mt-1" style={{ color: 'oklch(0.65 0.22 25)' }}>{formatNum(kpis.totalSugestaoCompra)}</div>
            <div className="text-[10px]" style={{ color: 'oklch(0.45 0.010 285)' }}>{t('sugeridas') || 'sugeridas'}</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b px-6 py-3" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.28 0.005 285)' }}>
        <div className="flex items-center justify-between mb-3 gap-4">
          <div className="flex-1 flex items-center">
            <svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="h-14">
              <text x="50" y="65" fontSize="60" fontWeight="bold" textAnchor="middle" fill="black" fontFamily="Arial, sans-serif" stroke="white" strokeWidth="2" paintOrder="stroke">ASX</text>
            </svg>
          </div>
          <button onClick={() => setLocation('/')} className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors" style={{ background: 'oklch(0.22 0.005 285)', color: 'oklch(0.70 0.010 285)' }}>
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t('menu')}</span>
          </button>
        </div>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>{t('buscar')}</label>
            <input type="text" placeholder={t('codigo_ou_descricao')} value={search} onChange={e => setSearch(e.target.value)} className="w-full px-3 py-2 rounded-md border text-sm mt-1" style={{ background: 'oklch(0.22 0.005 285)', borderColor: 'oklch(0.30 0.005 285)', color: 'oklch(0.90 0.005 65)' }} />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>{t('data_estoque')}</label>
            <div className="flex gap-2 mt-1">
              <input type="date" value={dataEstoque} onChange={e => setDataEstoque(e.target.value)} className="px-3 py-2 rounded-md border text-sm" style={{ background: 'oklch(0.22 0.005 285)', borderColor: 'oklch(0.30 0.005 285)', color: 'oklch(0.90 0.005 65)' }} />
              <button onClick={() => setShowModalEstoque(true)} className="px-4 py-2 rounded-md transition-colors flex items-center gap-2" style={{ background: 'oklch(0.60 0.18 85)', color: 'white' }}>
                <Upload className="w-4 h-4" /><span className="text-sm">{t('importar')}</span>
              </button>
              <button onClick={exportarExcel} className="px-4 py-2 rounded-md transition-colors flex items-center gap-2" style={{ background: corAcento, color: 'white' }}>
                <Download className="w-4 h-4" /><span className="text-sm">{t('exportar')}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabela */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10" style={{ background: 'oklch(0.12 0.005 285)' }}>
            <tr style={{ borderBottom: '2px solid oklch(0.30 0.005 285)' }}>
              <th className="px-2 py-2.5 text-left font-bold whitespace-nowrap" style={{ color: 'oklch(0.85 0.005 65)' }}>
                <button onClick={() => handleSort('codigo')} className="flex items-center gap-1 hover:opacity-75">COD <SortIcon field="codigo" /></button>
              </th>
              <th className="px-2 py-2.5 text-left font-bold whitespace-nowrap" style={{ color: 'oklch(0.85 0.005 65)' }}>
                <button onClick={() => handleSort('descricao')} className="flex items-center gap-1 hover:opacity-75">{t('descricao') || 'DESCRIÇÃO'} <SortIcon field="descricao" /></button>
              </th>
              <th className="px-2 py-2.5 text-center font-bold whitespace-nowrap" style={{ color: 'oklch(0.85 0.005 65)' }}>
                <div className="flex flex-col items-center gap-0.5">
                  <button onClick={() => handleSort('estoqueAtual')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">{t('estoqueAtual') || 'ESTOQUE ATUAL'} <SortIcon field="estoqueAtual" /></button>
                  <span className="text-[8px]" style={{ color: 'oklch(0.50 0.010 285)' }}>{dataEstoque}</span>
                </div>
              </th>
              <th className="px-2 py-2.5 text-center font-bold whitespace-nowrap" style={{ color: 'oklch(0.85 0.005 65)' }}>
                <button onClick={() => handleSort('totalOrdens')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">{t('totalOrdens') || 'TOTAL ORDENS'} <SortIcon field="totalOrdens" /></button>
              </th>
              <th className="px-2 py-2.5 text-center font-bold whitespace-nowrap" style={{ color: 'oklch(0.85 0.005 65)' }}>{t('estoquePedidos') || 'EST.+PED.'}</th>
              <th className="px-2 py-2.5 text-center font-bold whitespace-nowrap" style={{ color: 'oklch(0.80 0.18 85)' }}>
                <button onClick={() => handleSort('duracao6meses')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">{t('duracao6m') || 'DUR. 6M'} <SortIcon field="duracao6meses" /></button>
              </th>
              <th className="px-2 py-2.5 text-center font-bold whitespace-nowrap" style={{ color: 'oklch(0.80 0.18 85)' }}>
                <button onClick={() => handleSort('duracao3meses')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">{t('duracao3m') || 'DUR. 3M'} <SortIcon field="duracao3meses" /></button>
              </th>
              <th className="px-2 py-2.5 text-center font-bold whitespace-nowrap" style={{ color: 'oklch(0.85 0.005 65)' }}>
                <button onClick={() => handleSort('totalEmbarcado')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">{t('totalEmbarc') || 'TOTAL EMBARC.'} <SortIcon field="totalEmbarcado" /></button>
              </th>
              <th className="px-2 py-2.5 text-center font-bold whitespace-nowrap" style={{ color: 'oklch(0.70 0.17 145)' }}>
                <button onClick={() => handleSort('duracao6mesesEmbarc')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">{t('duracao6mEmbarc') || 'DUR. 6M EMB.'} <SortIcon field="duracao6mesesEmbarc" /></button>
              </th>
              <th className="px-2 py-2.5 text-center font-bold whitespace-nowrap" style={{ color: 'oklch(0.70 0.17 145)' }}>
                <button onClick={() => handleSort('duracao3mesesEmbarc')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">{t('duracao3mEmbarc') || 'DUR. 3M EMB.'} <SortIcon field="duracao3mesesEmbarc" /></button>
              </th>
              <th className="px-2 py-2.5 text-center font-bold whitespace-nowrap" style={{ color: 'oklch(0.65 0.22 25)' }}>
                <button onClick={() => handleSort('sugestaoCompra')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">{t('compras') || 'COMPRAS'} <SortIcon field="sugestaoCompra" /></button>
              </th>
              <th className="px-2 py-2.5 text-center font-bold whitespace-nowrap" style={{ color: 'oklch(0.65 0.22 25)' }}>
                <button onClick={() => handleSort('duracao6mesesCompras')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">{t('duracao6mCompras') || 'DUR. 6M COMP.'} <SortIcon field="duracao6mesesCompras" /></button>
              </th>
              <th className="px-2 py-2.5 text-center font-bold whitespace-nowrap" style={{ color: 'oklch(0.65 0.22 25)' }}>
                <button onClick={() => handleSort('duracao3mesesCompras')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">{t('duracao3mCompras') || 'DUR. 3M COMP.'} <SortIcon field="duracao3mesesCompras" /></button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, idx) => {
              const dur6 = getDuracaoColor(item.duracao6meses);
              const dur3 = getDuracaoColor(item.duracao3meses);
              const dur6e = getDuracaoColor(item.duracao6mesesEmbarc);
              const dur3e = getDuracaoColor(item.duracao3mesesEmbarc);
              const dur6c = getDuracaoColor(item.duracao6mesesCompras);
              const dur3c = getDuracaoColor(item.duracao3mesesCompras);
              return (
                <tr key={idx} style={{ borderBottom: '1px solid oklch(0.22 0.005 285)', background: idx % 2 === 0 ? 'transparent' : 'oklch(0.15 0.005 285 / 0.5)' }}>
                  <td className="px-2 py-2 font-mono text-xs font-semibold" style={{ color: 'oklch(0.85 0.005 65)' }}>{item.codigo}</td>
                  <td className="px-2 py-2 text-xs max-w-[200px] truncate" style={{ color: 'oklch(0.70 0.010 285)' }}>{item.descricao}</td>
                  <td className="px-2 py-2 text-center text-xs font-bold" style={{ color: 'oklch(0.85 0.005 65)', background: 'oklch(0.22 0.005 285)' }}>
                    <input
                      type="number"
                      value={estoqueEditando[item.codigo] ?? item.estoqueAtual}
                      onChange={e => setEstoqueEditando({...estoqueEditando, [item.codigo]: parseInt(e.target.value) || 0})}
                      className="w-full px-1 py-0.5 text-center rounded border text-xs"
                      style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.30 0.005 285)', color: 'oklch(0.90 0.005 65)' }}
                    />
                  </td>
                  <td className="px-2 py-2 text-center text-xs font-bold" style={{ color: 'oklch(0.85 0.005 65)' }}>{formatNum(item.totalOrdens)}</td>
                  <td className="px-2 py-2 text-center text-xs font-bold" style={{ color: 'oklch(0.85 0.005 65)', background: 'oklch(0.22 0.005 285)' }}>{formatNum(item.estoquePlusPedidos)}</td>
                  <td className="px-2 py-2 text-center text-xs font-bold" style={{ color: dur6.text, background: dur6.bg }}>{item.duracao6meses.toFixed(1)}m</td>
                  <td className="px-2 py-2 text-center text-xs font-bold" style={{ color: dur3.text, background: dur3.bg }}>{item.duracao3meses.toFixed(1)}m</td>
                  <td className="px-2 py-2 text-center text-xs font-bold" style={{ color: 'oklch(0.85 0.005 65)' }}>{formatNum(item.totalEmbarcado)}</td>
                  <td className="px-2 py-2 text-center text-xs font-bold" style={{ color: dur6e.text, background: dur6e.bg }}>{item.duracao6mesesEmbarc.toFixed(1)}m</td>
                  <td className="px-2 py-2 text-center text-xs font-bold" style={{ color: dur3e.text, background: dur3e.bg }}>{item.duracao3mesesEmbarc.toFixed(1)}m</td>
                  <td className="px-2 py-2 text-center text-xs font-bold" style={{ color: item.sugestaoCompra > 0 ? 'oklch(0.65 0.22 25)' : 'oklch(0.50 0.010 285)', background: item.sugestaoCompra > 0 ? 'oklch(0.48 0.22 25 / 0.15)' : 'transparent' }}>{formatNum(item.sugestaoCompra)}</td>
                  <td className="px-2 py-2 text-center text-xs font-bold" style={{ color: dur6c.text, background: dur6c.bg }}>{item.duracao6mesesCompras.toFixed(1)}m</td>
                  <td className="px-2 py-2 text-center text-xs font-bold" style={{ color: dur3c.text, background: dur3c.bg }}>{item.duracao3mesesCompras.toFixed(1)}m</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ModalEstoque isOpen={showModalEstoque} onClose={() => setShowModalEstoque(false)} onSaveManual={handleSaveManualEstoque} onImportExcel={handleImportExcelEstoque} />
    </div>
    </>
  );
}
