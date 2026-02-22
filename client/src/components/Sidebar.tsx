/*
  ASX Dark Command Center — Sidebar
  Design: Painel lateral escuro com navegação por ícones e labels
  Cores: fundo oklch(0.14), acento vermelho ASX oklch(0.48 0.22 25)
  Cotação USD/BRL: API oficial do Banco Central do Brasil (PTAX)
*/

import { Link } from "wouter";
import { BarChart3, ShoppingCart, Settings, Lightbulb, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

const LOGO_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663371351265/eZWmpvJzWGYwKZuO.png';

interface SidebarProps {
  currentPage: string;
}

interface CotacaoPTAX {
  cotacaoCompra: number;
  cotacaoVenda: number;
  dataHoraCotacao: string;
}

function getDateForAPI(): string {
  // Retorna a data no formato MM-DD-YYYY para a API do BCB
  // Tenta hoje primeiro, se não houver cotação (fim de semana), tenta dias anteriores
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

function getRecentDates(): string[] {
  // Retorna as últimas 5 datas úteis para tentar buscar cotação
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
          // Salvar no localStorage para uso offline
          localStorage.setItem('asx_cotacao_ptax', JSON.stringify(ptax));
          localStorage.setItem('asx_cotacao_timestamp', new Date().toISOString());
          setLoading(false);
          return;
        }
      } catch (err) {
        // Tentar próxima data
        continue;
      }
    }
    
    // Se nenhuma data funcionou, tentar cache
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
    // Atualizar a cada 10 minutos
    const interval = setInterval(fetchCotacao, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchCotacao]);

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard de Produtos",
      icon: BarChart3,
      href: "/",
      description: "Produtos, categorias e custos",
    },
    {
      id: "compras",
      label: "Gerenciador de Compras",
      icon: ShoppingCart,
      href: "/compras",
      description: "Pedidos de compra",
    },
    {
      id: "conteiner",
      label: "Conteiner",
      icon: ShoppingCart,
      href: "/conteiner",
      description: "Processos de importacao SR",
    },
    {
      id: "rastreamento",
      label: "Rastreamento",
      icon: ShoppingCart,
      href: "/rastreamento",
      description: "Vincular contêineres aos pedidos",
    },
    {
      id: "desenvolvimento",
      label: "Desenvolvimento",
      icon: Lightbulb,
      href: "/desenvolvimento",
      description: "Produtos em desenvolvimento",
    },
    {
      id: "configuracoes",
      label: "Configurações",
      icon: Settings,
      href: "/configuracoes",
      description: "Câmbio e preferências",
    },
  ];

  const formatCotacao = (valor: number) => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  };

  const formatDataCotacao = (dataHora: string) => {
    // dataHoraCotacao vem no formato "2026-02-20 13:02:26.431"
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
      {/* Logo */}
      <div className="p-4 border-b flex items-center gap-4" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        <img
          src={LOGO_URL}
          alt="ASX Logo"
          className={collapsed ? "w-16 h-16 object-contain flex-shrink-0" : "w-20 h-20 object-contain flex-shrink-0"}
          style={{ filter: 'brightness(1.1)' }}
        />
        {!collapsed && (
          <div className="overflow-hidden flex-1">
            <h1 className="font-rajdhani font-bold text-2xl tracking-wide" style={{ color: 'oklch(0.48 0.22 25)' }}>
              ASX
            </h1>
            <p className="text-[11px] uppercase tracking-widest" style={{ color: 'oklch(0.50 0.010 285)' }}>
              Iluminação
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-lg">🇧🇷</span>
              <span className="text-lg">🇨🇳</span>
            </div>
          </div>
        )}
      </div>

      {/* Cotação USD em tempo real - Banco Central do Brasil */}
      {!collapsed && (
        <div className="px-4 py-3 border-b" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.50 0.010 285)' }}>
              USD / BRL (PTAX)
            </span>
            <button
              onClick={fetchCotacao}
              disabled={loading}
              className="p-1 rounded transition-colors"
              style={{ color: loading ? 'oklch(0.35 0.010 285)' : 'oklch(0.55 0.010 285)' }}
              title="Atualizar cotação"
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
                  PTAX: {formatDataCotacao(cotacao.dataHoraCotacao)}
                </span>
              </div>
              {lastUpdate && (
                <p className="text-[9px] mt-0.5" style={{ color: 'oklch(0.30 0.010 285)' }}>
                  Atualizado: {lastUpdate}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {loading ? (
                <span className="text-[11px]" style={{ color: 'oklch(0.50 0.010 285)' }}>Carregando...</span>
              ) : error ? (
                <span className="text-[11px]" style={{ color: 'oklch(0.48 0.22 25)' }}>Sem cotação disponível</span>
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
            {cotacao.cotacaoVenda.toFixed(2)}
          </span>
        </div>
      )}

      {/* Menu Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <Link key={item.id} href={item.href}>
              <div
                className="flex items-center gap-3 rounded-lg transition-all duration-200"
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
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <div className="overflow-hidden">
                    <div className="font-medium text-sm truncate">{item.label}</div>
                    <div className="text-[11px] truncate" style={{ opacity: 0.6 }}>
                      {item.description}
                    </div>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

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
