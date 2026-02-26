/*
  ASX Dark Command Center — Sidebar
  Design: Painel lateral escuro com navegação por ícones e labels
  Cores: fundo oklch(0.14), acento vermelho ASX oklch(0.48 0.22 25)
  Cotação USD/BRL: API oficial do Banco Central do Brasil (PTAX)
  Alertas: Badges de estoque crítico nas Centrais de Compra
*/

import { Link, useLocation } from "wouter";
import { BarChart3, ShoppingCart, Settings, Lightbulb, ChevronLeft, ChevronRight, RefreshCw, ClipboardList, AlertTriangle, LogOut, DollarSign } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useEstoqueDB as useEstoque } from "@/hooks/useEstoqueDB";
import { useAuth } from "@/hooks/useAuth";
import { useIdiomaDB as useIdioma } from "@/hooks/useIdiomaDB";

// Logo removido

interface SidebarProps {
  currentPage: string;
}

interface CotacaoPTAX {
  cotacaoCompra: number;
  cotacaoVenda: number;
  dataHoraCotacao: string;
}

function getRecentDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    dates.push(`${mm}-${dd}-${yyyy}`);
  }
  return dates;
}

export default function Sidebar({ currentPage }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [cotacao, setCotacao] = useState<CotacaoPTAX | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [error, setError] = useState(false);
  const { t } = useIdioma();

  // Dados de estoque para alertas
  const { kpis: kpisSarom } = useEstoque('sarom');
  const { kpis: kpisAlexandre } = useEstoque('alexandre');

  const fetchCotacao = useCallback(async () => {
    setLoading(true);
    setError(false);
    
    const dates = getRecentDates();
    
    for (const date of dates) {
      try {
        const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${date}'&$top=1&$orderby=dataHoraCotacao%20desc&$format=json`;
        const response = await fetch(url);
        if (!response.ok) continue;
        const data = await response.json();
        
        if (data.value && data.value.length > 0) {
          const ptax = data.value[0] as CotacaoPTAX;
          setCotacao(ptax);
          setLastUpdate(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
          localStorage.setItem('asx_cotacao_ptax', JSON.stringify(ptax));
          localStorage.setItem('asx_cotacao_timestamp', new Date().toISOString());
          setLoading(false);
          return;
        }
      } catch (err) {
        continue;
      }
    }
    
    setError(true);
    try {
      const cached = localStorage.getItem('asx_cotacao_ptax');
      if (cached) {
        setCotacao(JSON.parse(cached));
        const cachedTime = localStorage.getItem('asx_cotacao_timestamp');
        if (cachedTime) {
          setLastUpdate(new Date(cachedTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' (cache)');
        }
      }
    } catch { /* ignore */ }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCotacao();
    const interval = setInterval(fetchCotacao, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchCotacao]);

  // Mapa de alertas por item de menu
  const alertas = useMemo(() => {
    const map: Record<string, { criticos: number; atencao: number }> = {};
    map['central-sarom'] = { criticos: kpisSarom.skusCriticos, atencao: kpisSarom.skusAtencao };
    map['central-alexandre'] = { criticos: kpisAlexandre.skusCriticos, atencao: kpisAlexandre.skusAtencao };
    return map;
  }, [kpisSarom, kpisAlexandre]);

  const menuItems = [
    {
      id: "dashboard",
      label: t('dashboard'),
      icon: BarChart3,
      href: "/",
      description: t('produtosCategoriasCustos'),
    },
    {
      id: "compras",
      label: t('gerenciadorCompras'),
      icon: ShoppingCart,
      href: "/compras",
      description: t('pedidosCompra'),
    },
    {
      id: "central-sarom",
      label: t('centralSarom'),
      icon: ClipboardList,
      href: "/central-sarom",
      description: t('estoqueComprasSarom'),
    },
    {
      id: "central-alexandre",
      label: t('centralAlexandre'),
      icon: ClipboardList,
      href: "/central-alexandre",
      description: t('estoqueComprasAlexandre'),
    },
    {
      id: "conteiner",
      label: t('conteiner'),
      icon: ShoppingCart,
      href: "/conteiner",
      description: t('processosImportacaoSR'),
    },
    {
      id: "rastreamento",
      label: t('rastreamento'),
      icon: ShoppingCart,
      href: "/rastreamento",
      description: t('vincularConteineresAosPedidos'),
    },
    {
      id: "pagamentos",
      label: t('pagamentos'),
      icon: DollarSign,
      href: "/pagamentos",
      description: t('controleDebitosPagamentos'),
    },
    {
      id: "desenvolvimento",
      label: t('desenvolvimento'),
      icon: Lightbulb,
      href: "/desenvolvimento",
      description: t('produtosEmDesenvolvimento'),
    },
    {
      id: "configuracoes",
      label: t('configuracoes'),
      icon: Settings,
      href: "/configuracoes",
      description: t('cambioEPreferencias'),
    },
  ];

  const formatCotacao = (valor: number) => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  };

  const formatDataCotacao = (dataHora: string) => {
    try {
      const [datePart] = dataHora.split(' ');
      const [yyyy, mm, dd] = datePart.split('-');
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return dataHora;
    }
  };

  return (
    <aside
      className="h-screen flex flex-col border-r transition-all duration-300 flex-shrink-0"
      style={{
        width: collapsed ? '72px' : '256px',
        background: 'oklch(0.10 0.005 285)',
        borderColor: 'oklch(0.22 0.005 285)',
      }}
    >
      {/* Logo removido */}

      {/* Cotação USD em tempo real - Banco Central do Brasil */}
      {!collapsed && (
        <div className="px-4 py-3 border-b" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.50 0.010 285)' }}>
              USD / BRL ({t('ptax')})
            </span>
            <button
              onClick={fetchCotacao}
              disabled={loading}
              className="p-1 rounded transition-colors"
              style={{ color: loading ? 'oklch(0.35 0.010 285)' : 'oklch(0.55 0.010 285)' }}
              title={t('atualizarCotacao')}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {cotacao ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-rajdhani font-bold text-xl" style={{ color: 'oklch(0.48 0.22 25)' }}>
                  R$ {formatCotacao(cotacao.cotacaoVenda)}
                </span>
              </div>
              <div className="flex gap-4 mt-1.5">
                <div>
                  <span className="text-[9px] uppercase" style={{ color: 'oklch(0.40 0.010 285)' }}>Compra</span>
                  <p className="text-[11px] font-mono" style={{ color: 'oklch(0.65 0.010 285)' }}>
                    R$ {formatCotacao(cotacao.cotacaoCompra)}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] uppercase" style={{ color: 'oklch(0.40 0.010 285)' }}>Venda</span>
                  <p className="text-[11px] font-mono" style={{ color: 'oklch(0.65 0.010 285)' }}>
                    R$ {formatCotacao(cotacao.cotacaoVenda)}
                  </p>
                </div>
              </div>
              <div className="mt-1.5">
                <span className="text-[9px]" style={{ color: 'oklch(0.35 0.010 285)' }}>
                  {t('ptax')}: {formatDataCotacao(cotacao.dataHoraCotacao)}
                </span>
              </div>
              {lastUpdate && (
                <p className="text-[9px] mt-0.5" style={{ color: 'oklch(0.30 0.010 285)' }}>
                  {t('atualizado')}: {lastUpdate}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {loading ? (
                <span className="text-[11px]" style={{ color: 'oklch(0.50 0.010 285)' }}>{t('carregando')}</span>
              ) : error ? (
                <span className="text-[11px]" style={{ color: 'oklch(0.48 0.22 25)' }}>N/A</span>
              ) : (
                <span className="text-[11px]" style={{ color: 'oklch(0.50 0.010 285)' }}>--</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cotação compacta quando colapsado */}
      {collapsed && cotacao && (
        <div className="px-2 py-2 border-b text-center" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
          <span className="text-[8px] uppercase block" style={{ color: 'oklch(0.40 0.010 285)' }}>USD</span>
          <span className="text-[11px] font-rajdhani font-bold block" style={{ color: 'oklch(0.48 0.22 25)' }}>
            {formatCotacao(cotacao.cotacaoVenda).slice(0, 6)}
          </span>
        </div>
      )}

      {/* Menu Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const alerta = alertas[item.id];
          const temCriticos = alerta && alerta.criticos > 0;
          const temAtencao = alerta && alerta.atencao > 0;

          return (
            <Link key={item.id} href={item.href}>
              <div
                className="flex items-center gap-3 rounded-lg transition-all duration-200 relative"
                style={{
                  padding: collapsed ? '10px' : '10px 14px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: isActive ? 'oklch(0.48 0.22 25)' : 'transparent',
                  color: isActive ? 'white' : 'oklch(0.65 0.010 285)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'oklch(0.18 0.005 285)';
                    e.currentTarget.style.color = 'oklch(0.90 0.005 65)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'oklch(0.65 0.010 285)';
                  }
                }}
              >
                <div className="relative flex-shrink-0">
                  <Icon className="w-5 h-5" />
                  {collapsed && temCriticos && (
                    <span
                      className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold px-1 animate-pulse"
                      style={{
                        background: 'oklch(0.55 0.25 30)',
                        color: 'white',
                        boxShadow: '0 0 6px oklch(0.55 0.25 30 / 0.6)',
                      }}
                    >
                      {alerta.criticos}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <div className="overflow-hidden flex-1">
                    <div className="font-medium text-sm truncate flex items-center gap-2">
                      {item.label}
                      {temCriticos && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold animate-pulse"
                          style={{
                            background: 'oklch(0.55 0.25 30)',
                            color: 'white',
                            boxShadow: '0 0 6px oklch(0.55 0.25 30 / 0.5)',
                          }}
                        >
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {alerta.criticos}
                        </span>
                      )}
                      {!temCriticos && temAtencao && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                          style={{
                            background: 'oklch(0.65 0.18 85)',
                            color: 'oklch(0.15 0.005 285)',
                          }}
                        >
                          {alerta.atencao}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] truncate" style={{ opacity: 0.6 }}>
                      {temCriticos ? (
                        <span style={{ color: 'oklch(0.70 0.20 30)', opacity: 1 }}>
                          {alerta.criticos} {t('critico')}{alerta.criticos > 1 ? 's' : ''}
                          {temAtencao ? ` · ${alerta.atencao} ${t('atencao').toLowerCase()}` : ''}
                        </span>
                      ) : temAtencao ? (
                        <span style={{ color: 'oklch(0.70 0.15 85)', opacity: 1 }}>
                          {alerta.atencao} {t('emAtencao')}
                        </span>
                      ) : (
                        item.description
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Resumo de alertas quando expandido */}
      {!collapsed && (kpisSarom.skusCriticos > 0 || kpisAlexandre.skusCriticos > 0) && (
        <div className="mx-3 mb-2 px-3 py-2.5 rounded-lg border" style={{
          background: 'oklch(0.14 0.06 30 / 0.3)',
          borderColor: 'oklch(0.40 0.18 30 / 0.5)',
        }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'oklch(0.75 0.20 30)' }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'oklch(0.75 0.20 30)' }}>
              {t('estoqueCritico')}
            </span>
          </div>
          <div className="space-y-1">
            {kpisSarom.skusCriticos > 0 && (
              <Link href="/central-sarom">
                <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded transition-colors hover:bg-white/5 cursor-pointer">
                  <span style={{ color: 'oklch(0.80 0.005 65)' }}>Sarom</span>
                  <span className="font-rajdhani font-bold" style={{ color: 'oklch(0.65 0.22 30)' }}>
                    {kpisSarom.skusCriticos} SKU{kpisSarom.skusCriticos > 1 ? 's' : ''}
                  </span>
                </div>
              </Link>
            )}
            {kpisAlexandre.skusCriticos > 0 && (
              <Link href="/central-alexandre">
                <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded transition-colors hover:bg-white/5 cursor-pointer">
                  <span style={{ color: 'oklch(0.80 0.005 65)' }}>Alexandre</span>
                  <span className="font-rajdhani font-bold" style={{ color: 'oklch(0.65 0.22 30)' }}>
                    {kpisAlexandre.skusCriticos} SKU{kpisAlexandre.skusCriticos > 1 ? 's' : ''}
                  </span>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Cards de Porcentagem Total - Cobertura de Estoque */}
      {!collapsed && (
        <div className="mx-3 mb-2 px-3 py-2.5 rounded-lg border space-y-2" style={{
          background: 'oklch(0.14 0.005 285)',
          borderColor: 'oklch(0.26 0.005 285)',
        }}>
          <div>
            <span className="text-[9px] uppercase" style={{ color: 'oklch(0.40 0.010 285)' }}>Pedido Sarom</span>
            <p className="text-[13px] font-rajdhani font-bold" style={{ color: 'oklch(0.72 0.17 145)' }}>
              {kpisSarom && kpisSarom.totalSkus > 0 ? Math.round((kpisSarom.skusOk / kpisSarom.totalSkus) * 100) : 0}%
            </p>
          </div>
          <div>
            <span className="text-[9px] uppercase" style={{ color: 'oklch(0.40 0.010 285)' }}>Pedido Alexandre</span>
            <p className="text-[13px] font-rajdhani font-bold" style={{ color: 'oklch(0.55 0.15 270)' }}>
              {kpisAlexandre && kpisAlexandre.totalSkus > 0 ? Math.round((kpisAlexandre.skusOk / kpisAlexandre.totalSkus) * 100) : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Logout Button */}
      <LogoutButton collapsed={collapsed} />

      {/* Collapse Toggle */}
      <div className="p-3 border-t" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg transition-colors"
          style={{
            background: 'oklch(0.16 0.005 285)',
            color: 'oklch(0.55 0.010 285)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'oklch(0.80 0.005 65)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'oklch(0.55 0.010 285)';
          }}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 pb-4 text-[10px]" style={{ color: 'oklch(0.40 0.010 285)' }}>
          <p>ASX Iluminação & Acessórios</p>
          <p className="mt-0.5">Dashboard v2.0</p>
        </div>
      )}
    </aside>
  );
}

function LogoutButton({ collapsed }: { collapsed: boolean }) {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useIdioma();

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  return (
    <div className="p-3 border-t" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-2 rounded-lg transition-colors"
        style={{
          background: 'oklch(0.16 0.005 285)',
          color: 'oklch(0.55 0.010 285)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'oklch(0.65 0.22 25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'oklch(0.55 0.010 285)';
        }}
        title={t('sair')}
      >
        <LogOut className="w-4 h-4" />
        {!collapsed && <span className="text-xs font-medium">{t('sair')}</span>}
      </button>
    </div>
  );
}
