/*
  CentralCompraAvancada — Gestão de Compras com Análise de Preço e Margem
  Colunas: COD, DESCRIÇÃO, ESTOQUE, PEDIDOS, TOTAL, PREÇO CUSTO USD/BRL, PREÇO VENDA,
           MARGEM UNITÁRIA, MARKUP %, INVESTIMENTO ESTOQUE
*/

import { useState, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { produtos } from '@/data/produtos';
import { useAnaliseEstoqueSimples } from '@/hooks/useAnaliseEstoqueSimples';
import { useEstoque } from '@/hooks/useEstoque';
import { useCustos } from '@/hooks/useCustos';
import { useIdioma } from '@/hooks/useIdioma';
import { ArrowLeft, Download, AlertTriangle, CheckCircle2, TrendingUp, ChevronUp, ChevronDown, Upload } from 'lucide-react';
import ModalEstoque from '@/components/ModalEstoque';
import * as XLSX from 'xlsx';

interface CentralCompraAvancadaProps {
  comprador: 'sarom' | 'alexandre';
  titulo: string;
  corAcento: string;
}

type SortField = 'codigo' | 'descricao' | 'estoque' | 'totalOrdens' | 'precoCustoUSD' | 'precoVenda' | 'margemUnitaria' | 'markupPct' | 'investimentoEstoque';
type SortDir = 'asc' | 'desc';

const formatNum = (v: number, decimals = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getMargemColor = (markup: number) => {
  if (markup < 20) return 'oklch(0.65 0.22 25)'; // Vermelho - baixa margem
  if (markup < 50) return 'oklch(0.60 0.18 85)'; // Amarelo - margem média
  return 'oklch(0.72 0.17 145)'; // Verde - boa margem
};

export default function CentralCompraAvancada({ comprador, titulo, corAcento }: CentralCompraAvancadaProps) {
  const [, setLocation] = useLocation();
  const { analisarProduto } = useAnaliseEstoqueSimples();
  const { produtosComEstoque } = useEstoque(comprador);
  const { taxaCambio } = useCustos();
  const { t } = useIdioma();

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('codigo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [dataEstoque, setDataEstoque] = useState(new Date().toISOString().split('T')[0]);
  const [showModalEstoque, setShowModalEstoque] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveManualEstoque = useCallback((codigo: string, quantidade: number) => {
    // Aqui você pode salvar o estoque manual
    console.log(`Estoque adicionado: ${codigo} = ${quantidade}`);
  }, []);

  const handleImportExcelEstoque = useCallback((dados: Array<{ codigo: string; quantidade: number }>) => {
    // Aqui você pode importar o estoque do Excel
    console.log('Estoque importado:', dados);
  }, []);

  // Análise de todos os produtos
  const analise = useMemo(() => {
    return produtos
      .map(p => {
        const estoque = produtosComEstoque.find(pe => pe.id === p.id)?.estoqueInicial || 0;
        return analisarProduto(
          p.id,
          p.codigo,
          p.descricao,
          estoque,
          dataEstoque,
          p.custo_usd,
          p.preco_venda,
          comprador as 'sarom' | 'alexandre'
        );
      })
      .filter(a => !search.trim() || a.codigo.toLowerCase().includes(search.toLowerCase()) || a.descricao.toLowerCase().includes(search.toLowerCase()));
  }, [produtosComEstoque, search, dataEstoque, comprador, analisarProduto]);

  // KPIs
  const kpis = useMemo(() => {
    const totalProdutos = analise.length;
    const totalEstoque = analise.reduce((sum, a) => sum + a.estoqueAtual, 0);
    const totalPedidos = analise.reduce((sum, a) => sum + a.totalOrdens, 0);
    const investimentoTotal = analise.reduce((sum, a) => sum + a.investimentoEstoque, 0);
    const margemTotalBRL = analise.reduce((sum, a) => sum + (a.estoqueAtual * a.margemUnitaria), 0);
    const markupMedio = analise.length > 0 ? analise.reduce((sum, a) => sum + a.markupPct, 0) / analise.length : 0;

    return { totalProdutos, totalEstoque, totalPedidos, investimentoTotal, margemTotalBRL, markupMedio };
  }, [analise]);

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
      'ESTOQUE': item.estoqueAtual,
      'PEDIDOS CONFIRMADOS': item.totalOrdens,
      'TOTAL (EST+PED)': item.estoquePlusPedidos,
      'TOTAL EMBARCADO': item.totalEmbarcado,
      'PREÇO CUSTO USD': item.precoCustoUSD,
      'PREÇO CUSTO BRL': item.precoCustoBRL,
      'PREÇO VENDA': item.precoVenda,
      'MARGEM UNITÁRIA': item.margemUnitaria,
      'MARKUP %': item.markupPct,
      'INVESTIMENTO ESTOQUE': item.investimentoEstoque,
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${comprador.toUpperCase()}`);

    ws['!cols'] = [
      { wch: 12 }, { wch: 40 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 12 }, { wch: 16 },
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
    <>
    <div className="h-full flex flex-col" style={{ background: 'oklch(0.18 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
      {/* KPIs Panel */}
      <div className="px-6 py-4 border-b" style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.32 0.005 285)' }}>
        <div className="grid grid-cols-6 gap-3">
          {/* Total de Produtos */}
          <div className="p-4 rounded-lg border" style={{ background: 'oklch(0.20 0.005 285)', borderColor: 'oklch(0.32 0.005 285)' }}>
            <div className="text-xs uppercase font-semibold" style={{ color: 'oklch(0.50 0.010 285)' }}>{t('produtos')}</div>
            <div className="text-2xl font-bold mt-2" style={{ color: 'oklch(0.80 0.005 65)' }}>{kpis.totalProdutos}</div>
            <div className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>no catálogo</div>
          </div>

          {/* Total Estoque */}
          <div className="p-4 rounded-lg border" style={{ background: 'oklch(0.72 0.17 145 / 0.15)', borderColor: 'oklch(0.72 0.17 145)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: 'oklch(0.72 0.17 145)' }} />
              <span className="text-xs uppercase font-semibold" style={{ color: 'oklch(0.72 0.17 145)' }}>Estoque</span>
            </div>
            <div className="text-2xl font-bold mt-2" style={{ color: 'oklch(0.72 0.17 145)' }}>{formatNum(kpis.totalEstoque)}</div>
            <div className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>unidades</div>
          </div>

          {/* Pedidos Confirmados */}
          <div className="p-4 rounded-lg border" style={{ background: 'oklch(0.60 0.18 85 / 0.15)', borderColor: 'oklch(0.60 0.18 85)' }}>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'oklch(0.60 0.18 85)' }} />
              <span className="text-xs uppercase font-semibold" style={{ color: 'oklch(0.60 0.18 85)' }}>Pedidos</span>
            </div>
            <div className="text-2xl font-bold mt-2" style={{ color: 'oklch(0.60 0.18 85)' }}>{formatNum(kpis.totalPedidos)}</div>
            <div className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>confirmados</div>
          </div>

          {/* Investimento Total */}
          <div className="p-4 rounded-lg border" style={{ background: 'oklch(0.48 0.22 25 / 0.15)', borderColor: 'oklch(0.48 0.22 25)' }}>
            <div className="text-xs uppercase font-semibold" style={{ color: 'oklch(0.50 0.010 285)' }}>Investimento</div>
            <div className="text-lg font-bold mt-2" style={{ color: 'oklch(0.48 0.22 25)' }}>
              {formatCurrency(kpis.investimentoTotal)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>em estoque</div>
          </div>

          {/* Margem Total */}
          <div className="p-4 rounded-lg border" style={{ background: 'oklch(0.72 0.17 145 / 0.15)', borderColor: 'oklch(0.72 0.17 145)' }}>
            <div className="text-xs uppercase font-semibold" style={{ color: 'oklch(0.50 0.010 285)' }}>Margem Potencial</div>
            <div className="text-lg font-bold mt-2" style={{ color: 'oklch(0.72 0.17 145)' }}>
              {formatCurrency(kpis.margemTotalBRL)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>se vender tudo</div>
          </div>

          {/* Markup Médio */}
          <div className="p-4 rounded-lg border" style={{ background: 'oklch(0.60 0.18 85 / 0.15)', borderColor: 'oklch(0.60 0.18 85)' }}>
            <div className="text-xs uppercase font-semibold" style={{ color: 'oklch(0.50 0.010 285)' }}>Markup Médio</div>
            <div className="text-2xl font-bold mt-2" style={{ color: 'oklch(0.60 0.18 85)' }}>
              {kpis.markupMedio.toFixed(1)}%
            </div>
            <div className="text-xs mt-1" style={{ color: 'oklch(0.50 0.010 285)' }}>dos produtos</div>
          </div>
        </div>
      </div>

      {/* Header com Logo ASX */}
      <header className="sticky top-0 z-40 border-b px-6 py-4" style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.32 0.005 285)' }}>
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex-1 flex items-center">
            <img 
              src="https://private-us-east-1.manuscdn.com/sessionFile/FG2NlBmjp3Wa0JwHMPnarr/sandbox/mh3OVtgJZkgUlDNT832z4V_1771881726879_na1fn_bG9nby1hc3gtYmxhY2std2hpdGUtc3Ryb2tl.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvRkcyTmxCbWpwM1dhMEp3SE1QbmFyci9zYW5kYm94L21oM09WdGdKWmtnVWxETlQ4MzJ6NFZfMTc3MTg4MTcyNjg3OV9uYTFmbl9iRzluYnkxaGMzZ3RZbXhoWTJzdGQyaHBkR1V0YzNSeWIydGwucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=YUTomiKwAU3zyzbTEEm7Bh8emjo3G9fmxndTieJCJ5rfh3vm9E~5zRDyUC9CzVG0lmCRrt2sN02t4oV8WvVLZ5MGczJOxJMWmQDvkdTOYhQ-0BRfpD~Kpd55avDCqUmHSx7ycDepIUvP8fqs43sKEECNLXZzy9Q2w8GQ573hlDfZW6nsVm0F034fa8uv5kcdK-RlAmQNA2UNlu4qOPSEzhYsPg4ysrEmAETgaRMzT8lg9UPa0TdQzaBORbDClrviEP0nKTHJUTutspZ-RFWD8erWQ~HN23C-qzIXwvVtcwvfcsqYk5jHLjwAs64HTg3nTP1JiWWEne~9wxesFb8Y8w__" 
              alt="ASX" 
              className="h-16 object-contain"
            />
          </div>
          <button
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
            style={{ background: 'oklch(0.22 0.005 285)', color: 'oklch(0.70 0.010 285)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t('menu')}</span>
          </button>
        </div>

        {/* Controles */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase" style={{ color: 'oklch(0.50 0.010 285)' }}>
              {t('buscar')}
            </label>
            <input
              type="text"
              placeholder={t('codigo_ou_descricao')}
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
              {t('data_estoque')}
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
                onClick={() => setShowModalEstoque(true)}
                className="px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                style={{ background: 'oklch(0.60 0.18 85)', color: 'white' }}
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm">{t('importar')}</span>
              </button>
              <button
                onClick={exportarExcel}
                className="px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                style={{ background: corAcento, color: 'white' }}
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">{t('exportar')}</span>
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
                  PEDIDOS <SortIcon field="totalOrdens" />
                </button>
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                TOTAL
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                EMBARQUE
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                <button onClick={() => handleSort('precoCustoUSD')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">
                  CUSTO USD <SortIcon field="precoCustoUSD" />
                </button>
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                CUSTO BRL
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                <button onClick={() => handleSort('precoVenda')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">
                  VENDA <SortIcon field="precoVenda" />
                </button>
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                <button onClick={() => handleSort('margemUnitaria')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">
                  MARGEM <SortIcon field="margemUnitaria" />
                </button>
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                <button onClick={() => handleSort('markupPct')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">
                  MARKUP % <SortIcon field="markupPct" />
                </button>
              </th>
              <th className="px-3 py-2 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                <button onClick={() => handleSort('investimentoEstoque')} className="flex items-center justify-center gap-1 hover:opacity-75 w-full">
                  INVESTIMENTO <SortIcon field="investimentoEstoque" />
                </button>
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
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: 'oklch(0.80 0.005 65)', background: 'oklch(0.48 0.22 25 / 0.15)' }}>
                  {formatNum(item.totalEmbarcado)}
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                  ${item.precoCustoUSD.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                  {formatCurrency(item.precoCustoBRL)}
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                  {formatCurrency(item.precoVenda)}
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: 'oklch(0.72 0.17 145)' }}>
                  {formatCurrency(item.margemUnitaria)}
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: getMargemColor(item.markupPct) }}>
                  {item.markupPct.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: 'oklch(0.48 0.22 25)' }}>
                  {formatCurrency(item.investimentoEstoque)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Estoque */}
      <ModalEstoque
        isOpen={showModalEstoque}
        onClose={() => setShowModalEstoque(false)}
        onSaveManual={handleSaveManualEstoque}
        onImportExcel={handleImportExcelEstoque}
      />
    </div>
    </>
  );
}
