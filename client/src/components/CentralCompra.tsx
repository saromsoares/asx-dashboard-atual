/*
  CentralCompra — Componente reutilizável para Central de Compra Sarom/Alexandre
  Design: Dark Command Center com semáforo de estoque
  Cores: fundo oklch(0.12), acento configurável por comprador
*/

import { useState, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { useEstoqueDB as useEstoque, type ProdutoComEstoque, type StatusEstoque } from '@/hooks/useEstoqueDB';
import { categorias } from '@/data/produtos';
import {
  Search,
  ArrowLeft,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  HelpCircle,
  Settings,
  ShoppingCart,
  Ship,
  Link2,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ---- Tipos ----

interface CentralCompraProps {
  comprador: 'sarom' | 'alexandre';
  titulo: string;
  corAcento: string; // oklch color
  corAcentoHover: string;
}

type SortField = 'codigo' | 'descricao' | 'categoria' | 'estoqueInicial' | 'mercadoriaAChegar' | 'estoqueProjetado' | 'mediaMensal' | 'coberturaMeses' | 'necessidadeCompra' | 'valorCompraUsd' | 'status';
type SortDir = 'asc' | 'desc';

// ---- Helpers ----

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatUSD = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const formatNum = (v: number, decimals = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const STATUS_CONFIG: Record<StatusEstoque, { label: string; bg: string; text: string; icon: typeof AlertTriangle }> = {
  critico: { label: 'CRÍTICO', bg: 'oklch(0.45 0.22 25 / 0.25)', text: 'oklch(0.70 0.22 25)', icon: XCircle },
  atencao: { label: 'ATENÇÃO', bg: 'oklch(0.60 0.18 85 / 0.25)', text: 'oklch(0.80 0.18 85)', icon: AlertTriangle },
  ok: { label: 'OK', bg: 'oklch(0.55 0.17 145 / 0.25)', text: 'oklch(0.72 0.17 145)', icon: CheckCircle2 },
  excesso: { label: 'EXCESSO', bg: 'oklch(0.50 0.15 250 / 0.25)', text: 'oklch(0.70 0.15 250)', icon: MinusCircle },
  sem_dados: { label: 'SEM DADOS', bg: 'oklch(0.25 0.005 285 / 0.5)', text: 'oklch(0.50 0.010 285)', icon: HelpCircle },
};

// ---- Componente Principal ----

export default function CentralCompra({ comprador, titulo, corAcento, corAcentoHover }: CentralCompraProps) {
  const [, setLocation] = useLocation();
  const {
    produtosComEstoque,
    kpis,
    metaCobertura,
    setMetaCobertura,
    atualizarDados,
  } = useEstoque(comprador);

  // Estado da UI
  const [search, setSearch] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');
  const [statusFiltro, setStatusFiltro] = useState<StatusEstoque | 'todos'>('todos');
  const [sortField, setSortField] = useState<SortField>('codigo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showConfig, setShowConfig] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Filtros e Ordenação ----

  const filtered = useMemo(() => {
    let list = produtosComEstoque;

    if (categoriaAtiva !== 'Todas') {
      list = list.filter(p => p.categoria === categoriaAtiva);
    }
    if (statusFiltro !== 'todos') {
      list = list.filter(p => p.status === statusFiltro);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.codigo.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      let va: any = a[sortField];
      let vb: any = b[sortField];
      if (typeof va === 'string') {
        va = va.toLowerCase();
        vb = (vb as string).toLowerCase();
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [produtosComEstoque, categoriaAtiva, statusFiltro, search, sortField, sortDir]);

  // Contagem por categoria
  const categoriasComContagem = useMemo(() => {
    const counts: Record<string, number> = { Todas: produtosComEstoque.length };
    categorias.forEach(c => {
      counts[c] = produtosComEstoque.filter(p => p.categoria === c).length;
    });
    return counts;
  }, [produtosComEstoque]);

  // ---- Handlers ----

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-1" />
      : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  const startEdit = (id: number, field: string, currentValue: number) => {
    setEditingCell({ id, field });
    setEditValue(String(currentValue));
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const val = parseFloat(editValue) || 0;
    atualizarDados(String(editingCell.id), editingCell.field as any, Math.max(0, val));
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // ---- Importação Excel ----

  const handleImportExcel = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(ws);

        const dadosImport: Record<number, any> = {};
        let importados = 0;

        rows.forEach((row: any) => {
          const codigo = String(row['CODIGO'] || row['Codigo'] || row['codigo'] || row['Código'] || '').trim();
          if (!codigo) return;

          // Encontrar produto pelo código
          const produto = produtosComEstoque.find(p => p.codigo.toUpperCase() === codigo.toUpperCase());
          if (!produto) return;

          const dados: any = { produtoId: produto.id };

          // Mapear colunas possíveis
          if (row['ESTOQUE'] !== undefined || row['Estoque'] !== undefined || row['estoque'] !== undefined || row['ESTOQUE_INICIAL'] !== undefined) {
            dados.estoqueInicial = parseFloat(row['ESTOQUE'] ?? row['Estoque'] ?? row['estoque'] ?? row['ESTOQUE_INICIAL']) || 0;
          }
          if (row['A_CHEGAR'] !== undefined || row['MERCADORIA_A_CHEGAR'] !== undefined || row['a_chegar'] !== undefined) {
            dados.mercadoriaAChegar = parseFloat(row['A_CHEGAR'] ?? row['MERCADORIA_A_CHEGAR'] ?? row['a_chegar']) || 0;
          }
          if (row['VENDA_TRIMESTRE'] !== undefined || row['venda_trimestre'] !== undefined || row['TRIMESTRE'] !== undefined) {
            dados.vendaTrimestre = parseFloat(row['VENDA_TRIMESTRE'] ?? row['venda_trimestre'] ?? row['TRIMESTRE']) || 0;
          }
          // Compatibilidade: se importar com MES1/2/3 antigos, somar
          if (row['VENDA_MES1'] !== undefined || row['VENDA_MES2'] !== undefined || row['VENDA_MES3'] !== undefined) {
            const m1 = parseFloat(row['VENDA_MES1'] ?? row['venda_mes1'] ?? row['MES1']) || 0;
            const m2 = parseFloat(row['VENDA_MES2'] ?? row['venda_mes2'] ?? row['MES2']) || 0;
            const m3 = parseFloat(row['VENDA_MES3'] ?? row['venda_mes3'] ?? row['MES3']) || 0;
            dados.vendaTrimestre = m1 + m2 + m3;
          }

          dadosImport[produto.id] = dados;
          importados++;
        });

        if (importados > 0) {
          // Atualizar dados um a um (sem atualizarDadosEmMassa)
          for (const [produtoId, dados] of Object.entries(dadosImport)) {
            const d = dados as any;
            if (d.estoqueInicial !== undefined) atualizarDados(String(produtoId), 'estoqueInicial', d.estoqueInicial);
            if (d.vendaTrimestre !== undefined) atualizarDados(String(produtoId), 'vendaTrimestre', d.vendaTrimestre);
            if (d.mercadoriaAChegarManual !== undefined) atualizarDados(String(produtoId), 'mercadoriaAChegarManual', d.mercadoriaAChegarManual);
          }
          alert(`Importação concluída: ${importados} produtos atualizados.`);
        } else {
          alert('Nenhum produto encontrado na planilha. Verifique se a coluna CODIGO está presente.');
        }
      } catch (err) {
        console.error('Erro na importação:', err);
        alert('Erro ao ler a planilha. Verifique o formato do arquivo.');
      }
    };
    reader.readAsBinaryString(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [produtosComEstoque, atualizarDados]);

  // ---- Exportação Excel ----

  const handleExportCompra = useCallback(() => {
    const precisaComprar = filtered.filter(p => p.necessidadeCompra > 0);

    if (precisaComprar.length === 0) {
      alert('Nenhum produto precisa de compra no momento.');
      return;
    }

    const dados = precisaComprar
      .sort((a, b) => {
        const statusOrder: Record<StatusEstoque, number> = { critico: 0, atencao: 1, ok: 2, excesso: 3, sem_dados: 4 };
        return statusOrder[a.status] - statusOrder[b.status];
      })
      .map(p => ({
        'STATUS': STATUS_CONFIG[p.status].label,
        'CÓDIGO': p.codigo,
        'DESCRIÇÃO': p.descricao,
        'UNIDADE': p.unidade,
        'CATEGORIA': p.categoria,
        'ESTOQUE ATUAL': p.estoqueInicial,
        'A CHEGAR': p.mercadoriaAChegar,
        'ESTOQUE PROJETADO': p.estoqueProjetado,
        'MÉDIA MENSAL': Math.round(p.mediaMensal * 10) / 10,
        'COBERTURA (MESES)': Math.round(p.coberturaMeses * 10) / 10,
        'ESTOQUE IDEAL': Math.round(p.estoqueIdeal),
        'NECESSIDADE COMPRA': Math.round(p.necessidadeCompra),
        'CUSTO USD': p.custoUsd,
        'VALOR COMPRA USD': Math.round(p.valorCompraUsd * 100) / 100,
        'VALOR COMPRA BRL': Math.round(p.valorCompraBrl * 100) / 100,
      }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Compra ${titulo}`);

    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 50 }, { wch: 8 }, { wch: 22 },
      { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
      { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 16 },
    ];

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Planilha_Compra_${titulo}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, titulo]);

  const handleExportCompleto = useCallback(() => {
    const dados = filtered.map(p => ({
      'CÓDIGO': p.codigo,
      'DESCRIÇÃO': p.descricao,
      'UNIDADE': p.unidade,
      'CATEGORIA': p.categoria,
      'PREÇO VENDA': p.precoVenda,
      'CUSTO USD': p.custoUsd,
      'CUSTO BRL': Math.round(p.custoBrl * 100) / 100,
      'ESTOQUE ATUAL': p.estoqueInicial,
      'A CHEGAR': p.mercadoriaAChegar,
      'ESTOQUE PROJETADO': p.estoqueProjetado,
      'VENDA TRIMESTRE': p.vendaTrimestre,
      'MÉDIA MENSAL': Math.round(p.mediaMensal * 10) / 10,
      'COBERTURA (MESES)': Math.round(p.coberturaMeses * 10) / 10,
      'ESTOQUE IDEAL': Math.round(p.estoqueIdeal),
      'NECESSIDADE COMPRA': Math.round(p.necessidadeCompra),
      'VALOR COMPRA USD': Math.round(p.valorCompraUsd * 100) / 100,
      'VALOR COMPRA BRL': Math.round(p.valorCompraBrl * 100) / 100,
      'STATUS': STATUS_CONFIG[p.status].label,
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Completo ${titulo}`);

    ws['!cols'] = Array(20).fill({ wch: 16 });

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_Completo_${titulo}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, titulo]);

  // Exportar modelo de importação
  const handleExportModelo = useCallback(() => {
    const dados = produtosComEstoque.map(p => ({
      'CODIGO': p.codigo,
      'DESCRICAO': p.descricao,
      'UNIDADE': p.unidade,
      'ESTOQUE': p.estoqueInicial || '',
      'A_CHEGAR': p.mercadoriaAChegar || '',
      'VENDA_TRIMESTRE': p.vendaTrimestre || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');

    ws['!cols'] = [
      { wch: 14 }, { wch: 55 }, { wch: 8 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    ];

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Modelo_Importacao_${titulo}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [produtosComEstoque, titulo]);

  // ---- Editable Cell Component ----

  const EditableCell = ({ produtoId, field, value, width = 'w-16' }: { produtoId: number; field: string; value: number; width?: string }) => {
    const isEditing = editingCell?.id === produtoId && editingCell?.field === field;

    if (isEditing) {
      return (
        <input
          type="number"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') cancelEdit();
          }}
          autoFocus
          className={`${width} px-1.5 py-0.5 rounded text-xs text-right border`}
          style={{
            background: 'oklch(0.20 0.005 285)',
            borderColor: corAcento,
            color: 'oklch(0.95 0.005 65)',
          }}
          min="0"
        />
      );
    }

    return (
      <button
        onClick={() => startEdit(produtoId, field, value)}
        className={`${width} px-1.5 py-0.5 rounded text-xs text-right transition-colors cursor-pointer`}
        style={{
          background: value > 0 ? 'oklch(0.18 0.005 285)' : 'oklch(0.15 0.005 285)',
          color: value > 0 ? 'oklch(0.90 0.005 65)' : 'oklch(0.40 0.010 285)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'oklch(0.22 0.005 285)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = value > 0 ? 'oklch(0.18 0.005 285)' : 'oklch(0.15 0.005 285)'; }}
        title="Clique para editar"
      >
        {value > 0 ? formatNum(value) : '—'}
      </button>
    );
  };

  // ---- Status Badge ----

  const StatusBadge = ({ status }: { status: StatusEstoque }) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
        style={{ background: config.bg, color: config.text }}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // ---- A Chegar Cell (com vinculação ao contêiner) ----

  const AChegarCell = ({ produto: p }: { produto: ProdutoComEstoque }) => {
    const hasConteiner = p.mercadoriaAChegarConteiner > 0;
    const hasManual = p.mercadoriaAChegarManual > 0;
    const total = p.mercadoriaAChegar;

    // Tooltip com detalhamento
    const tooltipParts: string[] = [];
    if (hasConteiner) {
      tooltipParts.push(`Contêiner: ${formatNum(p.mercadoriaAChegarConteiner)} (${p.processosVinculados.join(', ')})`);
    }
    if (hasManual) {
      tooltipParts.push(`Manual: ${formatNum(p.mercadoriaAChegarManual)}`);
    }
    if (total > 0 && hasConteiner && hasManual) {
      tooltipParts.push(`Total: ${formatNum(total)}`);
    }
    const tooltip = tooltipParts.length > 0 ? tooltipParts.join(' | ') : 'Clique para editar (manual)';

    // Se tem dados do contêiner, mostra badge especial
    if (hasConteiner) {
      return (
        <div className="flex items-center justify-center gap-1" title={tooltip}>
          {/* Ícone de vinculação */}
          <Link2 className="w-3 h-3 flex-shrink-0" style={{ color: 'oklch(0.65 0.17 145)' }} />
          {/* Valor do contêiner */}
          <span className="text-xs font-semibold" style={{ color: 'oklch(0.72 0.17 145)' }}>
            {formatNum(p.mercadoriaAChegarConteiner)}
          </span>
          {/* Se também tem manual, mostra o + manual */}
          {hasManual && (
            <>
              <span className="text-[10px]" style={{ color: 'oklch(0.45 0.010 285)' }}>+</span>
              <button
                onClick={() => startEdit(p.id, 'mercadoriaAChegarManual', p.mercadoriaAChegarManual)}
                className="px-1 py-0.5 rounded text-xs cursor-pointer transition-colors"
                style={{
                  background: 'oklch(0.18 0.005 285)',
                  color: 'oklch(0.80 0.18 85)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'oklch(0.22 0.005 285)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'oklch(0.18 0.005 285)'; }}
                title="Editar quantidade manual adicional"
              >
                {formatNum(p.mercadoriaAChegarManual)}
              </button>
            </>
          )}
          {/* Se não tem manual, mostra botão + para adicionar */}
          {!hasManual && (
            <button
              onClick={() => startEdit(p.id, 'mercadoriaAChegarManual', 0)}
              className="px-1 py-0.5 rounded text-[10px] cursor-pointer transition-colors"
              style={{
                background: 'oklch(0.16 0.005 285)',
                color: 'oklch(0.40 0.010 285)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'oklch(0.22 0.005 285)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'oklch(0.16 0.005 285)'; }}
              title="Adicionar quantidade manual"
            >
              +
            </button>
          )}
          {/* Total se ambos existem */}
          {hasManual && (
            <span className="text-[10px] font-semibold" style={{ color: 'oklch(0.70 0.15 250)' }}>
              ={formatNum(total)}
            </span>
          )}
        </div>
      );
    }

    // Sem dados de contêiner: célula editável normal (campo manual)
    const isEditing = editingCell?.id === p.id && editingCell?.field === 'mercadoriaAChegarManual';

    if (isEditing) {
      return (
        <input
          type="number"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') cancelEdit();
          }}
          autoFocus
          className="w-14 px-1.5 py-0.5 rounded text-xs text-right border"
          style={{
            background: 'oklch(0.20 0.005 285)',
            borderColor: corAcento,
            color: 'oklch(0.95 0.005 65)',
          }}
          min="0"
        />
      );
    }

    return (
      <button
        onClick={() => startEdit(p.id, 'mercadoriaAChegarManual', p.mercadoriaAChegarManual)}
        className="w-14 px-1.5 py-0.5 rounded text-xs text-right transition-colors cursor-pointer"
        style={{
          background: total > 0 ? 'oklch(0.18 0.005 285)' : 'oklch(0.15 0.005 285)',
          color: total > 0 ? 'oklch(0.90 0.005 65)' : 'oklch(0.40 0.010 285)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'oklch(0.22 0.005 285)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = total > 0 ? 'oklch(0.18 0.005 285)' : 'oklch(0.15 0.005 285)'; }}
        title={tooltip}
      >
        {total > 0 ? formatNum(total) : '—'}
      </button>
    );
  };

  // ---- Render ----

  return (
    <div className="h-full flex flex-col" style={{ background: 'oklch(0.12 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b px-6 py-4" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation('/')}
              className="flex items-center gap-1 text-sm transition-colors"
              style={{ color: 'oklch(0.60 0.010 285)' }}
              title="Voltar ao menu principal"
            >
              <ArrowLeft className="w-4 h-4" />
              Menu
            </button>
            <h1 className="font-rajdhani font-bold text-2xl" style={{ color: corAcento }}>
              {titulo}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="px-3 py-2 rounded-md border transition-colors text-sm flex items-center gap-2"
              style={{ background: 'oklch(0.18 0.005 285)', borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.70 0.010 285)' }}
            >
              <Settings className="w-4 h-4" />
              Meta: {metaCobertura} meses
            </button>

            <button
              onClick={handleExportModelo}
              className="px-3 py-2 rounded-md border transition-colors text-sm flex items-center gap-2"
              style={{ background: 'oklch(0.18 0.005 285)', borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.70 0.010 285)' }}
              title="Baixar modelo Excel para importação em massa"
            >
              <Download className="w-4 h-4" />
              Modelo
            </button>

            <label
              className="px-3 py-2 rounded-md border transition-colors text-sm flex items-center gap-2 cursor-pointer"
              style={{ background: 'oklch(0.18 0.005 285)', borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.70 0.010 285)' }}
              title="Importar planilha Excel com dados de estoque e vendas"
            >
              <Upload className="w-4 h-4" />
              Importar
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>

            <button
              onClick={handleExportCompra}
              className="px-3 py-2 rounded-md transition-colors text-sm flex items-center gap-2"
              style={{ background: corAcento, color: 'white' }}
              title="Exportar planilha de compra (apenas produtos que precisam ser comprados)"
            >
              <ShoppingCart className="w-4 h-4" />
              Planilha de Compra
            </button>

            <button
              onClick={handleExportCompleto}
              className="px-3 py-2 rounded-md border transition-colors text-sm flex items-center gap-2"
              style={{ background: 'oklch(0.18 0.005 285)', borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.70 0.010 285)' }}
              title="Exportar relatório completo com todos os dados"
            >
              <Download className="w-4 h-4" />
              Completo
            </button>
          </div>
        </div>

        {/* Config panel */}
        {showConfig && (
          <div className="mt-3 p-4 rounded-lg border" style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
            <div className="flex items-center gap-4">
              <label className="text-sm" style={{ color: 'oklch(0.70 0.010 285)' }}>
                Meta de Cobertura (meses):
              </label>
              <input
                type="number"
                value={metaCobertura}
                onChange={e => setMetaCobertura(Math.max(1, parseInt(e.target.value) || 9))}
                className="w-20 px-3 py-1.5 rounded-md border text-sm text-center"
                style={{
                  background: 'oklch(0.20 0.005 285)',
                  borderColor: 'oklch(0.30 0.005 285)',
                  color: 'oklch(0.95 0.005 65)',
                }}
                min="1"
                max="24"
              />
              <span className="text-xs" style={{ color: 'oklch(0.50 0.010 285)' }}>
                (Padrão: 9 meses de estoque)
              </span>
            </div>
          </div>
        )}
      </header>

      {/* KPIs */}
      <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="SKUs Ativos" value={String(kpis.skusAtivos)} sub={`de ${kpis.totalSkus}`} color="oklch(0.70 0.010 285)" />
        <KPICard label="Críticos" value={String(kpis.skusCriticos)} sub="< 3 meses" color="oklch(0.70 0.22 25)" />
        <KPICard label="Atenção" value={String(kpis.skusAtencao)} sub="3-6 meses" color="oklch(0.80 0.18 85)" />
        <KPICard label="OK" value={String(kpis.skusOk)} sub="6-9 meses" color="oklch(0.72 0.17 145)" />
        <KPICard label="Investimento USD" value={formatUSD(kpis.investimentoTotalUsd)} sub="necessário" color={corAcento} />
        <KPICard label="Investimento BRL" value={formatBRL(kpis.investimentoTotalBrl)} sub="necessário" color={corAcento} />
      </div>

      {/* Filtros */}
      <div className="px-6 pb-3 flex flex-wrap items-center gap-3">
        {/* Busca */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'oklch(0.45 0.010 285)' }} />
          <input
            type="text"
            placeholder="Buscar código ou nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
            style={{
              background: 'oklch(0.16 0.005 285)',
              borderColor: 'oklch(0.26 0.005 285)',
              color: 'oklch(0.95 0.005 65)',
            }}
          />
        </div>

        {/* Filtro por status */}
        <div className="flex gap-1">
          {(['todos', 'critico', 'atencao', 'ok', 'excesso', 'sem_dados'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFiltro(s)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                background: statusFiltro === s
                  ? (s === 'todos' ? corAcento : STATUS_CONFIG[s as StatusEstoque].bg)
                  : 'oklch(0.16 0.005 285)',
                color: statusFiltro === s
                  ? (s === 'todos' ? 'white' : STATUS_CONFIG[s as StatusEstoque].text)
                  : 'oklch(0.55 0.010 285)',
                borderWidth: '1px',
                borderColor: statusFiltro === s ? 'transparent' : 'oklch(0.24 0.005 285)',
              }}
            >
              {s === 'todos' ? 'Todos' : STATUS_CONFIG[s as StatusEstoque].label}
            </button>
          ))}
        </div>
      </div>

      {/* Categorias */}
      <div className="px-6 pb-3 flex flex-wrap gap-1.5">
        {['Todas', ...categorias].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoriaAtiva(cat)}
            className="px-3 py-1 rounded-md text-xs transition-colors flex items-center gap-1.5"
            style={{
              background: categoriaAtiva === cat ? corAcento : 'oklch(0.16 0.005 285)',
              color: categoriaAtiva === cat ? 'white' : 'oklch(0.60 0.010 285)',
            }}
          >
            {cat}
            <span className="opacity-60">{categoriasComContagem[cat] || 0}</span>
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="flex-1 px-6 pb-6 flex flex-col" style={{ minHeight: 0 }}>
        <div className="rounded-lg border flex-1 flex flex-col overflow-hidden" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs" style={{ minWidth: '1400px' }}>
              <thead>
                <tr style={{ background: 'oklch(0.16 0.005 285)' }}>
                  <th className="px-3 py-2.5 text-left font-semibold cursor-pointer select-none sticky left-0 z-20" style={{ color: 'oklch(0.55 0.010 285)', width: '100px', background: 'oklch(0.16 0.005 285)' }} onClick={() => handleSort('codigo')}>
                    Código <SortIcon field="codigo" />
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold cursor-pointer select-none sticky left-[100px] z-20" style={{ color: 'oklch(0.55 0.010 285)', background: 'oklch(0.16 0.005 285)', minWidth: '220px' }} onClick={() => handleSort('descricao')}>
                    Descrição <SortIcon field="descricao" />
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: 'oklch(0.55 0.010 285)', width: '50px' }}>
                    Unid
                  </th>

                  {/* Bloco 2 — Estoque */}
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: 'oklch(0.70 0.15 250)', width: '80px', borderLeft: '2px solid oklch(0.22 0.005 285)' }}>
                    Estoque
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: 'oklch(0.70 0.15 250)', width: '110px' }}>
                    <div className="flex items-center justify-center gap-1">
                      <Ship className="w-3 h-3" />
                      A Chegar
                    </div>
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold cursor-pointer select-none" style={{ color: 'oklch(0.70 0.15 250)', width: '80px' }} onClick={() => handleSort('estoqueProjetado')}>
                    Projetado <SortIcon field="estoqueProjetado" />
                  </th>

                  {/* Bloco 3 — Vendas */}
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: 'oklch(0.80 0.18 85)', width: '100px', borderLeft: '2px solid oklch(0.22 0.005 285)' }}>
                    Venda Trim.
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold cursor-pointer select-none" style={{ color: 'oklch(0.80 0.18 85)', width: '85px' }} onClick={() => handleSort('mediaMensal')}>
                    Média/Mês <SortIcon field="mediaMensal" />
                  </th>

                  {/* Bloco 4 — Necessidade */}
                  <th className="px-3 py-2.5 text-center font-semibold cursor-pointer select-none" style={{ color: 'oklch(0.72 0.17 145)', width: '80px', borderLeft: '2px solid oklch(0.22 0.005 285)' }} onClick={() => handleSort('coberturaMeses')}>
                    Cobert. <SortIcon field="coberturaMeses" />
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold cursor-pointer select-none" style={{ color: 'oklch(0.70 0.22 25)', width: '90px' }} onClick={() => handleSort('necessidadeCompra')}>
                    Comprar <SortIcon field="necessidadeCompra" />
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold cursor-pointer select-none" style={{ color: 'oklch(0.70 0.22 25)', width: '100px' }} onClick={() => handleSort('valorCompraUsd')}>
                    Valor USD <SortIcon field="valorCompraUsd" />
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold cursor-pointer select-none" style={{ color: 'oklch(0.55 0.010 285)', width: '100px' }} onClick={() => handleSort('status')}>
                    Status <SortIcon field="status" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => (
                  <tr
                    key={p.id}
                    className="transition-colors"
                    style={{
                      background: idx % 2 === 0 ? 'oklch(0.12 0.005 285)' : 'oklch(0.13 0.005 285)',
                      borderBottom: '1px solid oklch(0.18 0.005 285)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'oklch(0.16 0.005 285)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? 'oklch(0.12 0.005 285)' : 'oklch(0.13 0.005 285)'; }}
                  >
                    {/* Código — sticky */}
                    <td className="px-3 py-2 font-mono font-semibold sticky left-0 z-10" style={{ color: corAcento, background: idx % 2 === 0 ? 'oklch(0.12 0.005 285)' : 'oklch(0.13 0.005 285)' }}>
                      {p.codigo}
                    </td>

                    {/* Descrição — sticky */}
                    <td className="px-3 py-2 truncate max-w-[280px] sticky left-[100px] z-10" style={{ color: 'oklch(0.80 0.005 65)', background: idx % 2 === 0 ? 'oklch(0.12 0.005 285)' : 'oklch(0.13 0.005 285)', boxShadow: '4px 0 8px -2px oklch(0 0 0 / 0.3)' }} title={p.descricao}>
                      {p.descricao}
                    </td>

                    {/* Unidade */}
                    <td className="px-3 py-2 text-center" style={{ color: 'oklch(0.55 0.010 285)' }}>
                      {p.unidade}
                    </td>

                    {/* Bloco 2 — Estoque (editável) */}
                    <td className="px-2 py-1.5 text-center" style={{ borderLeft: '2px solid oklch(0.20 0.005 285)' }}>
                      <EditableCell produtoId={p.id} field="estoqueInicial" value={p.estoqueInicial} width="w-14" />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <AChegarCell produto={p} />
                    </td>
                    <td className="px-3 py-2 text-center font-semibold" style={{ color: p.estoqueProjetado > 0 ? 'oklch(0.70 0.15 250)' : 'oklch(0.40 0.010 285)' }}>
                      {p.estoqueProjetado > 0 ? formatNum(p.estoqueProjetado) : '—'}
                    </td>

                    {/* Bloco 3 — Vendas */}
                    <td className="px-2 py-1.5 text-center" style={{ borderLeft: '2px solid oklch(0.20 0.005 285)' }}>
                      <EditableCell produtoId={p.id} field="vendaTrimestre" value={p.vendaTrimestre} width="w-16" />
                    </td>
                    <td className="px-3 py-2 text-center font-semibold" style={{ color: p.mediaMensal > 0 ? 'oklch(0.80 0.18 85)' : 'oklch(0.40 0.010 285)' }}>
                      {p.mediaMensal > 0 ? formatNum(p.mediaMensal, 1) : '—'}
                    </td>

                    {/* Bloco 4 — Necessidade */}
                    <td className="px-3 py-2 text-center font-semibold" style={{ color: STATUS_CONFIG[p.status].text, borderLeft: '2px solid oklch(0.20 0.005 285)' }}>
                      {p.mediaMensal > 0 ? `${formatNum(p.coberturaMeses, 1)}m` : '—'}
                    </td>
                    <td className="px-3 py-2 text-center font-bold" style={{ color: p.necessidadeCompra > 0 ? 'oklch(0.70 0.22 25)' : 'oklch(0.40 0.010 285)' }}>
                      {p.necessidadeCompra > 0 ? formatNum(Math.round(p.necessidadeCompra)) : '—'}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-[11px]" style={{ color: p.valorCompraUsd > 0 ? 'oklch(0.80 0.005 65)' : 'oklch(0.40 0.010 285)' }}>
                      {p.valorCompraUsd > 0 ? formatUSD(p.valorCompraUsd) : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé com total */}
        <div className="mt-3 flex items-center justify-between text-xs" style={{ color: 'oklch(0.50 0.010 285)' }}>
          <span>{filtered.length} produtos exibidos</span>
          <span>Meta de cobertura: {metaCobertura} meses</span>
        </div>
      </div>
    </div>
  );
}

// ---- KPI Card ----

function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div
      className="rounded-lg p-3 border"
      style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'oklch(0.50 0.010 285)' }}>
        {label}
      </p>
      <p className="font-rajdhani font-bold text-xl" style={{ color }}>
        {value}
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: 'oklch(0.40 0.010 285)' }}>
        {sub}
      </p>
    </div>
  );
}
