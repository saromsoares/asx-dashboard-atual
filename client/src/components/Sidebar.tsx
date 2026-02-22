/*
  ASX Dark Command Center — Sidebar
  Design: Painel lateral escuro com navegação por ícones e labels
  Cores: fundo oklch(0.14), acento vermelho ASX oklch(0.48 0.22 25)
*/

import { Link } from "wouter";
import { BarChart3, ShoppingCart, Settings, Lightbulb, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const LOGO_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663371351265/eZWmpvJzWGYwKZuO.png';

interface SidebarProps {
  currentPage: string;
}

export default function Sidebar({ currentPage }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

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
              <span className="text-[10px] font-rajdhani font-semibold" style={{ color: 'oklch(0.48 0.22 25)' }}>USD: R$ 5,20</span>
            </div>
          </div>
        )}
      </div>

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
