/*
  CentralCompraAvancada — Análise avançada de estoque com vendas históricas e sugestões
  Colunas: COD, DESCRIÇÃO, ESTOQUE EM, TOTAL ORDENS, ESTOQUE+PEDIDOS, DURAÇÃO 6M, DURAÇÃO 3M,
           TOTAL EMBARCADO, DURAÇÃO 6M EMBARC, DURAÇÃO 3M EMBARC, COMPRAS, DURAÇÃO 6M COMPRAS, DURAÇÃO 3M COMPRAS
*/

import { useState, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { produtos } from '@/data/produtos';
import { useAnaliseEstoque } from '@/hooks/useAnaliseEstoque';
import { useEstoque } from '@/hooks/useEstoque';
import { useCustos } from '@/hooks/useCustos';
import { ArrowLeft, Download, AlertTriangle, CheckCircle2, TrendingUp, ChevronUp, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface CentralCompraAvancadaProps {
  comprador: 'sarom' | 'alexandre';
  titulo: string;
  corAcento: string;
}

type SortField = 'codigo' | 'descricao' | 'estoque' | 'totalOrdens' | 'duracao6m' | 'duracao3m' | 'sugestaoCompra';
type SortDir = 'asc' | 'desc';

const formatNum = (v: number, decimals = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const getStatusColor = (duracao: number) => {
  if (duracao < 1) return 'oklch(0.65 0.22 25)'; // Vermelho - crítico
  if (duracao < 6) return 'oklch(0.60 0.18 85)'; // Amarelo - atenção
  return 'oklch(0.72 0.17 145)'; // Verde - ok
};

export default function CentralCompraAvancada({ comprador, titulo, corAcento }: CentralCompraAvancadaProps) {
  const [, setLocation] = useLocation();
  const { analisarProduto } = useAnaliseEstoque();
  const { produtosComEstoque } = useEstoque(comprador);
  const { taxaCambio } = useCustos();

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('codigo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [dataEstoque, setDataEstoque] = useState(new Date().toISOString().split('T')[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Análise de todos os produtos
  const analise = useMemo(() => {
    return produtos
      .map(p => {
        const estoque = produtosComEstoque.find(pe => pe.id === p.id)?.estoqueInicial || 0;
        return analisarProduto(p.id, p.codigo, p.descricao, estoque, dataEstoque, comprador as 'sarom' | 'alexandre');
      })
      .filter(a => !search.trim() || a.codigo.toLowerCase().includes(search.toLowerCase()) || a.descricao.toLowerCase().includes(search.toLowerCase()));
  }, [produtosComEstoque, search, dataEstoque, comprador, analisarProduto]);

  // KPIs
  const kpis = useMemo(() => {
    const criticos = analise.filter(a => a.duracao6meses < 1).length;
    const atencao = analise.filter(a => a.duracao6meses >= 1 && a.duracao6meses < 6).length;
    const ok = analise.filter(a => a.duracao6meses >= 6).length;
    const totalAtivos = analise.length;
    
    const investimentoUSD = analise.reduce((sum, a) => {
      const produto = produtos.find(p => p.id === a.produtoId);
      const custoPorUnidade = produto?.custo_usd || 0;
      return sum + (a.sugestaoCompra * custoPorUnidade);
    }, 0);
    
    const investimentoBRL = investimentoUSD * (taxaCambio || 8.5);

    return { criticos, atencao, ok, totalAtivos, investimentoUSD, investimentoBRL };
  }, [analise, taxaCambio]);

  // Ordenação
  const sorted = useMemo(() => {
    const copy = [...analise];
    copy.sort((a, b) => {
      let aVal: any = a[sortField as keyof typeof a];
      let bVal: any = b[sortField as keyof typeof b];
      if (aVal === undefined || aVal === null) aVal = 0;
      if (bVal === undefined || bVal === null) bVal = 0;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [analise, sortField, sortDir]);

  // Exportar Excel
  const exportarExcel = useCallback(() => {
    const dados = sorted.map(item => ({
      'COD': item.codigo,
      'DESCRIÇÃO': item.descricao,
      'ESTOQUE EM': item.estoqueAtual,
      'TOTAL ORDENS': item.totalOrdens,
      'ESTOQUE+PEDIDOS': item.estoquePlusPedidos,
      'DURAÇÃO 6M': item.duracao6meses,
      'DURAÇÃO 3M': item.duracao3meses,
      'TOTAL EMBARCADO': item.totalEmbarcado,
      'DURAÇÃO 6M EMBARC': item.duracao6mesesEmbarc,
      'DURAÇÃO 3M EMBARC': item.duracao3mesesEmbarc,
      'VENDA 6M': item.vendas6meses,
      'VENDA 3M': item.vendas3meses,
      'COMPRAS': item.sugestaoCompra,
      'DURAÇÃO 6M COMPRAS': item.duracao6mesesCompras,
      'DURAÇÃO 3M COMPRAS': item.duracao3mesesCompras,
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${comprador.toUpperCase()}`);

    ws['!cols'] = [
      { wch: 12 }, { wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 },
    ];

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
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'oklch(0.18 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
      {/* KPIs Panel */}
      <div className="px-6 py-4 border-b" style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.32 0.005 285)' }}>
        <div className="grid grid-cols-6 gap-3">
          {/* SKUs Ativos */}
          <div className="p-4 rounded-lg border" style={{ background: 'oklch(0.20 0.005 285)', borderColor: 'oklch(0.32 0.005 285)' }}>
            <div className="text-xs uppercase font-semibold" style={{ color: 'oklch(0.50 0.010 285)' }}>SKUs Ativos</div>
            <div className="text-2xl font-bold mt-2" style={{ color: 'oklch(0.80 0.005 65)' }}>{kpis.totalAtivos}</div>
            <div className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>de {produtos.length}</div>
          </div>

          {/* Críticos */}
          <div className="p-4 rounded-lg border" style={{ background: 'oklch(0.65 0.22 25 / 0.15)', borderColor: 'oklch(0.65 0.22 25)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: 'oklch(0.65 0.22 25)' }} />
              <span className="text-xs uppercase font-semibold" style={{ color: 'oklch(0.65 0.22 25)' }}>Críticos</span>
            </div>
            <div className="text-2xl font-bold mt-2" style={{ color: 'oklch(0.65 0.22 25)' }}>{kpis.criticos}</div>
            <div className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>{'<'} 1 mês</div>
          </div>

          {/* Atenção */}
          <div className="p-4 rounded-lg border" style={{ background: 'oklch(0.60 0.18 85 / 0.15)', borderColor: 'oklch(0.60 0.18 85)' }}>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'oklch(0.60 0.18 85)' }} />
              <span className="text-xs uppercase font-semibold" style={{ color: 'oklch(0.60 0.18 85)' }}>Atenção</span>
            </div>
            <div className="text-2xl font-bold mt-2" style={{ color: 'oklch(0.60 0.18 85)' }}>{kpis.atencao}</div>
            <div className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>1-6 meses</div>
          </div>

          {/* OK */}
          <div className="p-4 rounded-lg border" style={{ background: 'oklch(0.72 0.17 145 / 0.15)', borderColor: 'oklch(0.72 0.17 145)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: 'oklch(0.72 0.17 145)' }} />
              <span className="text-xs uppercase font-semibold" style={{ color: 'oklch(0.72 0.17 145)' }}>OK</span>
            </div>
            <div className="text-2xl font-bold mt-2" style={{ color: 'oklch(0.72 0.17 145)' }}>{kpis.ok}</div>
            <div className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>{'>'} 6 meses</div>
          </div>

          {/* Investimento USD */}
          <div className="p-4 rounded-lg border" style={{ background: 'oklch(0.48 0.22 25 / 0.15)', borderColor: 'oklch(0.48 0.22 25)' }}>
            <div className="text-xs uppercase font-semibold" style={{ color: 'oklch(0.50 0.010 285)' }}>Investimento USD</div>
            <div className="text-xl font-bold mt-2" style={{ color: 'oklch(0.48 0.22 25)' }}>
              ${kpis.investimentoUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>necessário</div>
          </div>

          {/* Investimento BRL */}
          <div className="p-4 rounded-lg border" style={{ background: 'oklch(0.48 0.22 25 / 0.15)', borderColor: 'oklch(0.48 0.22 25)' }}>
            <div className="text-xs uppercase font-semibold" style={{ color: 'oklch(0.50 0.010 285)' }}>Investimento BRL</div>
            <div className="text-xl font-bold mt-2" style={{ color: 'oklch(0.48 0.22 25)' }}>
              R${kpis.investimentoBRL.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>necessário</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b px-6 py-4" style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.32 0.005 285)' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-rajdhani font-bold text-2xl">{titulo}</h1>
          <button
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
            style={{ background: 'oklch(0.22 0.005 285)', color: 'oklch(0.70 0.010 285)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Menu</span>
          </button>
        </div>

        {/* Controles */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase" style={{ color: 'oklch(0.50 0.010 285)' }}>
              Buscar
            </label>
            <input
              type="text"
              placeholder="Código ou descrição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-md border text-sm mt-1"
              style={{
                background: 'oklch(0.22 0.005 285)',
                borderColor: 'oklch(0.32 0.005 285)',
                color: 'oklch(0.90 0.005 65)',
              }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase" style={{ color: 'oklch(0.50 0.010 285)' }}>
              Data Estoque
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="date"
                value={dataEstoque}
                onChange={e => setDataEstoque(e.target.value)}
                className="px-3 py-2 rounded-md border text-sm"
                style={{
                  background: 'oklch(0.22 0.005 285)',
                  borderColor: 'oklch(0.32 0.005 285)',
                  color: 'oklch(0.90 0.005 65)',
                }}
              />
              <button
                onClick={exportarExcel}
                className="px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                style={{ background: corAcento, color: 'white' }}
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Exportar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabela */}
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0" style={{ background: 'oklch(0.16 0.005 285)' }}>
            <tr style={{ borderBottom: '2px solid oklch(0.32 0.005 285)' }}>
              <th className="px-3 py-2 text-left font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                <button onClick={() => handleSort('codigo')} className="flex items-center gap-1 hover:opacity-75">
                  COD <SortIcon field="codigo" />
                </button>
              </th>
              <th className="px-3 py-2 text-left font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                <button onClick={() => handleSort('descricao')} className="flex items-center gap-1 hover:opacity-75">
                  DESCRIÇÃO <SortIcon field="descricao" />
                </button>
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                <button onClick={() => handleSort('estoque')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">
                  ESTOQUE <SortIcon field="estoque" />
                </button>
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                <button onClick={() => handleSort('totalOrdens')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">
                  ORDENS <SortIcon field="totalOrdens" />
                </button>
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                ESTOQUE+PEDIDOS
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                <button onClick={() => handleSort('duracao6m')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">
                  DURAÇÃO 6M <SortIcon field="duracao6m" />
                </button>
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                <button onClick={() => handleSort('duracao3m')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">
                  DURAÇÃO 3M <SortIcon field="duracao3m" />
                </button>
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                TOTAL EMBARC.
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                DURAÇÃO 6M EMBARC.
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                DURAÇÃO 3M EMBARC.
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                <button onClick={() => handleSort('sugestaoCompra')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">
                  COMPRAS <SortIcon field="sugestaoCompra" />
                </button>
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                DURAÇÃO 6M COMPRAS
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                DURAÇÃO 3M COMPRAS
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid oklch(0.22 0.005 285)',
                  background: idx % 2 === 0 ? 'transparent' : 'oklch(0.16 0.005 285 / 0.5)',
                }}
              >
                <td className="px-3 py-2 font-mono text-xs" style={{ color: 'oklch(0.80 0.005 65)' }}>
                  {item.codigo}
                </td>
                <td className="px-3 py-2 text-xs" style={{ color: 'oklch(0.70 0.010 285)' }}>
                  {item.descricao.substring(0, 40)}
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: 'oklch(0.80 0.005 65)', background: 'oklch(0.72 0.17 145 / 0.15)' }}>
                  {formatNum(item.estoqueAtual)}
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: 'oklch(0.80 0.005 65)', background: 'oklch(0.60 0.18 85 / 0.15)' }}>
                  {formatNum(item.totalOrdens)}
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                  {formatNum(item.estoquePlusPedidos)}
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: getStatusColor(item.duracao6meses) }}>
                  {item.duracao6meses.toFixed(1)}m
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: getStatusColor(item.duracao3meses) }}>
                  {item.duracao3meses.toFixed(1)}m
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: 'oklch(0.80 0.005 65)', background: 'oklch(0.48 0.22 25 / 0.15)' }}>
                  {formatNum(item.totalEmbarcado)}
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: getStatusColor(item.duracao6mesesEmbarc) }}>
                  {item.duracao6mesesEmbarc.toFixed(1)}m
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: getStatusColor(item.duracao3mesesEmbarc) }}>
                  {item.duracao3mesesEmbarc.toFixed(1)}m
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: 'oklch(0.80 0.005 65)', background: 'oklch(0.48 0.22 25 / 0.15)' }}>
                  {formatNum(item.sugestaoCompra)}
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: getStatusColor(item.duracao6mesesCompras) }}>
                  {item.duracao6mesesCompras.toFixed(1)}m
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: getStatusColor(item.duracao3mesesCompras) }}>
                  {item.duracao3mesesCompras.toFixed(1)}m
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
