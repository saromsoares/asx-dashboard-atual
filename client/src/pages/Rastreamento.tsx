// Rastreamento — Centro de Controle de Embarques
// Monitora pedidos confirmados: o que embarcou, o que está pendente, % por produto
// Permite embarcar saldo pendente em novo contêiner

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { produtos as produtosCatalogo } from '@/data/produtos';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Ship,
  BarChart3,
  ExternalLink,
} from 'lucide-react';

const STORAGE_SALDO = 'asx_saldo_embarques';
const STORAGE_PROCESSOS = 'asx_processos_sr';

interface SaldoEmbarque { [pedidoId: string]: { [produtoId: string]: { sarom: number; alexandre: number } } }
interface ProcessoSR { id: string; numeroProcesso: string; itens: Array<{ codigo: string; pedidoSarom: number; pedidoAlexandre: number; ordemCompra: string }> }

function lerSaldo(): SaldoEmbarque { try { const s = localStorage.getItem(STORAGE_SALDO); return s ? JSON.parse(s) : {}; } catch { return {}; } }
function lerProcessos(): ProcessoSR[] { try { const s = localStorage.getItem(STORAGE_PROCESSOS); return s ? JSON.parse(s) : []; } catch { return []; } }
const fmtN = (n: number) => n.toLocaleString('pt-BR');
const fmtUSD = (n: number) => `$${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Rastreamento() {
  const [, setLocation] = useLocation();
  const [pedidoExpandido, setPedidoExpandido] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'pendente' | 'completo'>('todos');

  const { data: pedidosDb = [], isLoading: l1 } = trpc.pedido.getAll.useQuery();
  const { data: todosItensDb = [], isLoading: l2 } = trpc.itemPedido.getAll.useQuery();

  const [saldo, setSaldo] = useState<SaldoEmbarque>(lerSaldo);
  const [procs, setProcs] = useState<ProcessoSR[]>(lerProcessos);

  useEffect(() => {
    const up = () => { setSaldo(lerSaldo()); setProcs(lerProcessos()); };
    window.addEventListener('asx_processos_changed', up);
    const hs = (e: StorageEvent) => { if (e.key === STORAGE_SALDO || e.key === STORAGE_PROCESSOS) up(); };
    window.addEventListener('storage', hs);
    const iv = setInterval(up, 3000);
    return () => { window.removeEventListener('asx_processos_changed', up); window.removeEventListener('storage', hs); clearInterval(iv); };
  }, []);

  const catMap = useMemo(() => new Map(produtosCatalogo.map(p => [p.codigo, p])), []);

  const pedidosAnalise = useMemo(() => {
    return pedidosDb.filter((p: any) => p.status === 'Confirmado').map((pedido: any) => {
      const itens = todosItensDb.filter((i: any) => i.pedidoId === pedido.id).map((item: any) => {
        const prod = catMap.get(item.produtoId);
        const s = saldo[String(pedido.id)]?.[item.produtoId] || { sarom: 0, alexandre: 0 };
        const pS = item.quantidadeSarom || 0, pA = item.quantidadeAlexandre || 0;
        const eS = s.sarom, eA = s.alexandre;
        const pendS = Math.max(0, pS - eS), pendA = Math.max(0, pA - eA);
        const tPed = pS + pA, tEmb = eS + eA, tPend = pendS + pendA;
        const pct = tPed > 0 ? (tEmb / tPed) * 100 : 0;
        const preco = parseFloat(item.precoUnitario) || prod?.custo_usd || 0;
        return { produtoId: item.produtoId, descricao: prod?.descricao || item.produtoId, unidade: prod?.unid || 'UND', pS, pA, eS, eA, pendS, pendA, tPed, tEmb, tPend, pct, preco, usdPend: tPend * preco };
      });

      const tPedG = itens.reduce((a: number, i: any) => a + i.tPed, 0);
      const tEmbG = itens.reduce((a: number, i: any) => a + i.tEmb, 0);
      const tPendG = itens.reduce((a: number, i: any) => a + i.tPend, 0);
      const pctG = tPedG > 0 ? (tEmbG / tPedG) * 100 : 0;
      const usdPend = itens.reduce((a: number, i: any) => a + i.usdPend, 0);
      const iPend = itens.filter((i: any) => i.tPend > 0).length;
      const iComp = itens.filter((i: any) => i.tPend === 0 && i.tPed > 0).length;
      const completo = tPendG === 0 && tPedG > 0;

      const ctnrs = new Set<string>();
      procs.forEach(proc => proc.itens.forEach(it => {
        if (it.ordemCompra === pedido.nome) ctnrs.add(proc.numeroProcesso);
      }));

      return { id: pedido.id, nome: pedido.nome, itens, tPedG, tEmbG, tPendG, pctG, usdPend, iPend, iComp, completo, ctnrs: Array.from(ctnrs), totalItens: itens.length };
    });
  }, [pedidosDb, todosItensDb, saldo, procs, catMap]);

  const pedFilt = useMemo(() => {
    if (filtro === 'pendente') return pedidosAnalise.filter(p => !p.completo);
    if (filtro === 'completo') return pedidosAnalise.filter(p => p.completo);
    return pedidosAnalise;
  }, [pedidosAnalise, filtro]);

  const kpis = useMemo(() => {
    const t = pedidosAnalise.length, pend = pedidosAnalise.filter(p => !p.completo).length, comp = pedidosAnalise.filter(p => p.completo).length;
    const uPed = pedidosAnalise.reduce((s, p) => s + p.tPedG, 0);
    const uEmb = pedidosAnalise.reduce((s, p) => s + p.tEmbG, 0);
    const uPend = pedidosAnalise.reduce((s, p) => s + p.tPendG, 0);
    const pctG = uPed > 0 ? (uEmb / uPed) * 100 : 0;
    const usd = pedidosAnalise.reduce((s, p) => s + p.usdPend, 0);
    return { t, pend, comp, uPed, uEmb, uPend, pctG, usd };
  }, [pedidosAnalise]);

  const handleEmbarcar = useCallback((pedidoId: number) => {
    sessionStorage.setItem('asx_importar_pedido', String(pedidoId));
    setLocation('/conteiner');
  }, [setLocation]);

  const isLoading = l1 || l2;

  return (
    <div className="h-full flex flex-col" style={{ background: 'oklch(0.12 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
      {/* Header */}
      <div className="px-4 md:px-6 py-3 border-b flex items-center gap-3" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        <button onClick={() => setLocation('/')} className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors" style={{ background: 'oklch(0.16 0.005 285)', color: 'oklch(0.80 0.005 65)' }}>
          <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Menu</span>
        </button>
        <Ship className="w-5 h-5" style={{ color: 'oklch(0.48 0.22 25)' }} />
        <span className="font-rajdhani font-bold text-lg tracking-wide" style={{ color: 'oklch(0.80 0.005 65)' }}>RASTREAMENTO DE EMBARQUES</span>
      </div>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Pedidos Confirm.</p>
            <p className="font-rajdhani font-bold text-2xl" style={{ color: 'oklch(0.85 0.005 65)' }}>{kpis.t}</p>
          </div>
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.70 0.18 85 / 0.12)', borderColor: 'oklch(0.70 0.18 85 / 0.3)' }}>
            <div className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" style={{ color: 'oklch(0.75 0.18 85)' }} /><p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.75 0.18 85)' }}>Pendentes</p></div>
            <p className="font-rajdhani font-bold text-2xl" style={{ color: 'oklch(0.80 0.18 85)' }}>{kpis.pend}</p>
          </div>
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.60 0.17 145 / 0.12)', borderColor: 'oklch(0.60 0.17 145 / 0.3)' }}>
            <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" style={{ color: 'oklch(0.72 0.17 145)' }} /><p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.72 0.17 145)' }}>Completos</p></div>
            <p className="font-rajdhani font-bold text-2xl" style={{ color: 'oklch(0.72 0.17 145)' }}>{kpis.comp}</p>
          </div>
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Unid. Pedidas</p>
            <p className="font-rajdhani font-bold text-2xl" style={{ color: 'oklch(0.85 0.005 65)' }}>{fmtN(kpis.uPed)}</p>
          </div>
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
            <div className="flex items-center gap-1"><Truck className="w-3 h-3" style={{ color: 'oklch(0.60 0.15 200)' }} /><p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Embarcadas</p></div>
            <p className="font-rajdhani font-bold text-2xl" style={{ color: 'oklch(0.60 0.15 200)' }}>{fmtN(kpis.uEmb)}</p>
          </div>
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.55 0.25 30 / 0.10)', borderColor: 'oklch(0.55 0.25 30 / 0.3)' }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.70 0.22 30)' }}>Unid. Pendentes</p>
            <p className="font-rajdhani font-bold text-2xl" style={{ color: 'oklch(0.75 0.22 30)' }}>{fmtN(kpis.uPend)}</p>
          </div>
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
            <div className="flex items-center gap-1"><BarChart3 className="w-3 h-3" style={{ color: 'oklch(0.48 0.22 25)' }} /><p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>% Embarcado</p></div>
            <p className="font-rajdhani font-bold text-2xl" style={{ color: kpis.pctG >= 90 ? 'oklch(0.72 0.17 145)' : kpis.pctG >= 50 ? 'oklch(0.80 0.18 85)' : 'oklch(0.75 0.22 30)' }}>{kpis.pctG.toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.48 0.22 25 / 0.10)', borderColor: 'oklch(0.48 0.22 25 / 0.3)' }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.65 0.22 25)' }}>USD Pendente</p>
            <p className="font-rajdhani font-bold text-lg" style={{ color: 'oklch(0.65 0.22 25)' }}>{fmtUSD(kpis.usd)}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-4">
          {(['todos', 'pendente', 'completo'] as const).map(f => {
            const labels: Record<string, string> = { todos: `Todos (${kpis.t})`, pendente: `Pendentes (${kpis.pend})`, completo: `Completos (${kpis.comp})` };
            return (
              <button key={f} onClick={() => setFiltro(f)} className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{ background: filtro === f ? 'oklch(0.48 0.22 25)' : 'oklch(0.18 0.005 285)', color: filtro === f ? 'white' : 'oklch(0.70 0.010 285)', border: `1px solid ${filtro === f ? 'transparent' : 'oklch(0.26 0.005 285)'}` }}>
                {labels[f]}
              </button>
            );
          })}
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="text-center py-12" style={{ color: 'oklch(0.50 0.010 285)' }}>Carregando...</div>
        ) : pedFilt.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center gap-3" style={{ color: 'oklch(0.45 0.010 285)' }}>
            <Package className="w-12 h-12" /><p>Nenhum pedido confirmado encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pedFilt.map(ped => {
              const exp = pedidoExpandido === ped.id;
              const bord = ped.completo ? 'oklch(0.60 0.17 145 / 0.4)' : ped.pctG > 0 ? 'oklch(0.70 0.18 85 / 0.4)' : 'oklch(0.55 0.25 30 / 0.3)';
              return (
                <div key={ped.id} className="rounded-lg border overflow-hidden" style={{ borderColor: bord, background: 'oklch(0.14 0.005 285)' }}>
                  {/* Header */}
                  <div className="p-4 flex items-center justify-between cursor-pointer transition-all hover:brightness-110" onClick={() => setPedidoExpandido(exp ? null : ped.id)} style={{ background: 'oklch(0.16 0.005 285)' }}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-2.5 rounded-lg flex-shrink-0" style={{ background: ped.completo ? 'oklch(0.60 0.17 145 / 0.15)' : 'oklch(0.55 0.25 30 / 0.15)' }}>
                        {ped.completo ? <CheckCircle2 className="w-5 h-5" style={{ color: 'oklch(0.72 0.17 145)' }} /> : <AlertTriangle className="w-5 h-5" style={{ color: 'oklch(0.75 0.22 30)' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="font-rajdhani font-bold text-base" style={{ color: 'oklch(0.90 0.005 65)' }}>{ped.nome}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: ped.completo ? 'oklch(0.35 0.15 145)' : 'oklch(0.35 0.15 50)', color: 'white' }}>
                            {ped.completo ? '100% EMBARCADO' : `${ped.pctG.toFixed(0)}% EMBARCADO`}
                          </span>
                          {ped.ctnrs.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'oklch(0.22 0.005 285)', color: 'oklch(0.60 0.005 285)' }}>{ped.ctnrs.join(', ')}</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: 'oklch(0.50 0.010 285)' }}>
                          <span>{ped.totalItens} itens</span><span>•</span>
                          <span style={{ color: 'oklch(0.60 0.15 200)' }}>Emb: {fmtN(ped.tEmbG)}</span><span>•</span>
                          <span style={{ color: ped.tPendG > 0 ? 'oklch(0.75 0.22 30)' : 'oklch(0.50 0.010 285)' }}>Pend: {fmtN(ped.tPendG)}</span>
                          {ped.usdPend > 0 && <><span>•</span><span style={{ color: 'oklch(0.65 0.22 25)' }}>{fmtUSD(ped.usdPend)} pend.</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="hidden md:flex flex-col items-end gap-1">
                        <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: 'oklch(0.22 0.005 285)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, ped.pctG)}%`, background: ped.pctG >= 100 ? 'oklch(0.55 0.17 145)' : ped.pctG >= 50 ? 'oklch(0.70 0.18 85)' : 'oklch(0.55 0.25 30)' }} />
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: ped.pctG >= 100 ? 'oklch(0.72 0.17 145)' : 'oklch(0.65 0.010 285)' }}>{fmtN(ped.tEmbG)}/{fmtN(ped.tPedG)}</span>
                      </div>
                      {exp ? <ChevronUp className="w-5 h-5" style={{ color: 'oklch(0.50 0.010 285)' }} /> : <ChevronDown className="w-5 h-5" style={{ color: 'oklch(0.50 0.010 285)' }} />}
                    </div>
                  </div>

                  {/* Expanded table */}
                  {exp && (
                    <div className="border-t" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ background: 'oklch(0.11 0.005 285)' }}>
                              <th className="px-3 py-2.5 text-left font-bold" style={{ color: 'oklch(0.55 0.010 285)' }}>CÓDIGO</th>
                              <th className="px-3 py-2.5 text-left font-bold" style={{ color: 'oklch(0.55 0.010 285)' }}>DESCRIÇÃO</th>
                              <th className="px-3 py-2.5 text-center font-bold" style={{ color: 'oklch(0.55 0.15 200)' }}>PED. S</th>
                              <th className="px-3 py-2.5 text-center font-bold" style={{ color: 'oklch(0.55 0.15 145)' }}>PED. A</th>
                              <th className="px-3 py-2.5 text-center font-bold" style={{ color: 'oklch(0.60 0.15 200)' }}>EMB. S</th>
                              <th className="px-3 py-2.5 text-center font-bold" style={{ color: 'oklch(0.60 0.15 145)' }}>EMB. A</th>
                              <th className="px-3 py-2.5 text-center font-bold" style={{ color: 'oklch(0.75 0.22 30)' }}>PEND. S</th>
                              <th className="px-3 py-2.5 text-center font-bold" style={{ color: 'oklch(0.75 0.22 30)' }}>PEND. A</th>
                              <th className="px-3 py-2.5 text-center font-bold" style={{ color: 'oklch(0.55 0.010 285)' }}>%</th>
                              <th className="px-3 py-2.5 text-right font-bold" style={{ color: 'oklch(0.55 0.010 285)' }}>USD PEND.</th>
                              <th className="px-3 py-2.5 text-center font-bold" style={{ color: 'oklch(0.55 0.010 285)' }}>STATUS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ped.itens.map((it: any, idx: number) => {
                              const ok = it.tPend === 0 && it.tPed > 0;
                              return (
                                <tr key={it.produtoId} style={{ background: idx % 2 === 0 ? 'transparent' : 'oklch(0.14 0.005 285 / 0.5)', opacity: ok ? 0.5 : 1 }}>
                                  <td className="px-3 py-2 font-mono font-bold" style={{ color: 'oklch(0.48 0.22 25)' }}>{it.produtoId}</td>
                                  <td className="px-3 py-2 max-w-[220px] truncate" style={{ color: 'oklch(0.70 0.010 285)' }}>{it.descricao}</td>
                                  <td className="px-3 py-2 text-center font-bold" style={{ color: 'oklch(0.60 0.15 200)' }}>{fmtN(it.pS)}</td>
                                  <td className="px-3 py-2 text-center font-bold" style={{ color: 'oklch(0.60 0.15 145)' }}>{fmtN(it.pA)}</td>
                                  <td className="px-3 py-2 text-center" style={{ color: it.eS > 0 ? 'oklch(0.70 0.12 200)' : 'oklch(0.35 0.010 285)' }}>{fmtN(it.eS)}</td>
                                  <td className="px-3 py-2 text-center" style={{ color: it.eA > 0 ? 'oklch(0.70 0.12 145)' : 'oklch(0.35 0.010 285)' }}>{fmtN(it.eA)}</td>
                                  <td className="px-3 py-2 text-center font-bold" style={{ color: it.pendS > 0 ? 'oklch(0.80 0.22 30)' : 'oklch(0.35 0.010 285)', background: it.pendS > 0 ? 'oklch(0.55 0.25 30 / 0.08)' : 'transparent' }}>{fmtN(it.pendS)}</td>
                                  <td className="px-3 py-2 text-center font-bold" style={{ color: it.pendA > 0 ? 'oklch(0.80 0.22 30)' : 'oklch(0.35 0.010 285)', background: it.pendA > 0 ? 'oklch(0.55 0.25 30 / 0.08)' : 'transparent' }}>{fmtN(it.pendA)}</td>
                                  <td className="px-3 py-2 text-center">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="text-[10px] font-bold" style={{ color: it.pct >= 100 ? 'oklch(0.72 0.17 145)' : it.pct > 0 ? 'oklch(0.80 0.18 85)' : 'oklch(0.40 0.010 285)' }}>{it.pct.toFixed(0)}%</span>
                                      <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.22 0.005 285)' }}>
                                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, it.pct)}%`, background: it.pct >= 100 ? 'oklch(0.55 0.17 145)' : it.pct >= 50 ? 'oklch(0.70 0.18 85)' : 'oklch(0.55 0.25 30)' }} />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono" style={{ color: it.usdPend > 0 ? 'oklch(0.65 0.22 25)' : 'oklch(0.35 0.010 285)' }}>{fmtUSD(it.usdPend)}</td>
                                  <td className="px-3 py-2 text-center">
                                    {ok ? <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'oklch(0.30 0.15 145)', color: 'oklch(0.75 0.15 145)' }}>COMPLETO</span>
                                    : it.tEmb > 0 ? <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'oklch(0.30 0.15 50)', color: 'oklch(0.80 0.15 50)' }}>PARCIAL</span>
                                    : <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'oklch(0.30 0.20 30)', color: 'oklch(0.80 0.22 30)' }}>PENDENTE</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: 'oklch(0.11 0.005 285)' }}>
                              <td colSpan={2} className="px-3 py-2.5 font-bold text-right" style={{ color: 'oklch(0.55 0.010 285)' }}>TOTAIS:</td>
                              <td className="px-3 py-2.5 text-center font-bold" style={{ color: 'oklch(0.60 0.15 200)' }}>{fmtN(ped.itens.reduce((s: number, i: any) => s + i.pS, 0))}</td>
                              <td className="px-3 py-2.5 text-center font-bold" style={{ color: 'oklch(0.60 0.15 145)' }}>{fmtN(ped.itens.reduce((s: number, i: any) => s + i.pA, 0))}</td>
                              <td className="px-3 py-2.5 text-center font-bold" style={{ color: 'oklch(0.60 0.12 200)' }}>{fmtN(ped.itens.reduce((s: number, i: any) => s + i.eS, 0))}</td>
                              <td className="px-3 py-2.5 text-center font-bold" style={{ color: 'oklch(0.60 0.12 145)' }}>{fmtN(ped.itens.reduce((s: number, i: any) => s + i.eA, 0))}</td>
                              <td className="px-3 py-2.5 text-center font-bold" style={{ color: 'oklch(0.80 0.22 30)' }}>{fmtN(ped.itens.reduce((s: number, i: any) => s + i.pendS, 0))}</td>
                              <td className="px-3 py-2.5 text-center font-bold" style={{ color: 'oklch(0.80 0.22 30)' }}>{fmtN(ped.itens.reduce((s: number, i: any) => s + i.pendA, 0))}</td>
                              <td className="px-3 py-2.5 text-center font-bold" style={{ color: ped.pctG >= 100 ? 'oklch(0.72 0.17 145)' : 'oklch(0.80 0.18 85)' }}>{ped.pctG.toFixed(0)}%</td>
                              <td className="px-3 py-2.5 text-right font-bold font-mono" style={{ color: 'oklch(0.65 0.22 25)' }}>{fmtUSD(ped.usdPend)}</td>
                              <td className="px-3 py-2.5 text-center"><span className="text-[10px] font-bold" style={{ color: ped.completo ? 'oklch(0.72 0.17 145)' : 'oklch(0.65 0.010 285)' }}>{ped.iComp}/{ped.totalItens}</span></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Ação: Embarcar Pendente */}
                      {!ped.completo && (
                        <div className="px-4 py-3 flex items-center justify-between border-t" style={{ borderColor: 'oklch(0.22 0.005 285)', background: 'oklch(0.12 0.005 285)' }}>
                          <div className="text-xs" style={{ color: 'oklch(0.50 0.010 285)' }}>
                            {ped.iPend} item(ns) pendentes — {fmtN(ped.tPendG)} unidades ({fmtUSD(ped.usdPend)})
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleEmbarcar(ped.id); }}
                            className="px-5 py-2 rounded-md text-sm font-bold transition-colors flex items-center gap-2"
                            style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}>
                            <Ship className="w-4 h-4" />Embarcar Pendente no Contêiner<ExternalLink className="w-3.5 h-3.5 opacity-60" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
