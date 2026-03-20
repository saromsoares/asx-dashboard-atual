# AUDITORIA UX COMPLETA & PLANO DE MODERNIZACAO "PREMIUM 2026"
# ASX Iluminacao — Dashboard de Gestao de Importacao
# Data: 20/03/2026 | Auditor: UX Designer

---

## SUMARIO EXECUTIVO

O ASX Dashboard e um painel de gestao de importacao automotiva com 10+ telas,
construido em React + Tailwind CSS + tRPC. O design atual segue um conceito
"Dark Command Center" com acento vermelho (oklch 0.48 0.22 25). A base e solida,
mas apresenta inconsistencias significativas de estilo, acessibilidade limitada,
e oportunidades claras de elevar o produto para um nivel "premium".

**Nota geral atual: 6.5/10**
**Meta pos-modernizacao: 9.2/10**

---

## 1. PALETA DE CORES

### ESTADO ATUAL

A paleta usa o espaco de cor OKLCH, o que e moderno e correto. O design e
predominantemente escuro com acento vermelho ASX.

Cores principais definidas em `index.css`:
- Background: `oklch(0.18 0.005 285)` — cinza azulado muito escuro
- Surface: `oklch(0.16 0.005 285)` a `oklch(0.22 0.005 285)` — camadas
- Acento: `oklch(0.48 0.22 25)` — vermelho ASX (#D42B2B)
- Texto: `oklch(0.98 0.005 65)` — branco levemente quente
- Muted: `oklch(0.70 0.010 285)` — cinza medio
- Positivo: `oklch(0.72 0.17 145)` — verde
- Negativo: `oklch(0.65 0.22 25)` — vermelho

**PROBLEMAS IDENTIFICADOS:**

1. **Cores inline duplicadas por todo o codigo.** Em vez de usar as variaveis CSS
   do design system, os componentes repetem valores oklch diretamente nos atributos
   `style={{}}`. Ex: `style={{ color: 'oklch(0.65 0.010 285)' }}` aparece centenas
   de vezes. Isso torna manutencao praticamente impossivel.

2. **Ausencia de camadas semanticas.** Nao ha tokens como `--surface-elevated`,
   `--surface-sunken`, `--text-tertiary`. Cada componente "inventa" seus proprios
   valores de luminosidade.

3. **Vermelho ASX usado para destructive E primary.** O mesmo hue 25 serve tanto
   para acoes principais quanto para alertas/erros, gerando ambiguidade visual.

4. **Falta de cores semanticas para status.** Containers e pedidos definem cores
   de status localmente (ex: `statusColors` em Containers.tsx), sem tokens globais.

### PROPOSTA "PREMIUM 2026"

```css
/* === NOVA PALETA ASX PREMIUM === */

/* Fundos — 5 niveis de profundidade */
--asx-bg-base:     oklch(0.10 0.008 280);    /* fundo absoluto */
--asx-bg-surface:  oklch(0.14 0.008 280);    /* cards, paineis */
--asx-bg-elevated: oklch(0.18 0.008 280);    /* cards hover, modais */
--asx-bg-overlay:  oklch(0.22 0.008 280);    /* dropdowns, popovers */
--asx-bg-subtle:   oklch(0.26 0.008 280);    /* inputs, selects */

/* Bordas — 3 niveis */
--asx-border-subtle:  oklch(0.22 0.006 280);
--asx-border-default: oklch(0.28 0.006 280);
--asx-border-strong:  oklch(0.35 0.006 280);

/* Texto — hierarquia clara */
--asx-text-primary:   oklch(0.95 0.005 80);   /* titulos, valores */
--asx-text-secondary: oklch(0.75 0.008 280);  /* descricoes */
--asx-text-tertiary:  oklch(0.55 0.008 280);  /* labels, captions */
--asx-text-disabled:  oklch(0.40 0.006 280);  /* desativado */

/* Brand — Vermelho ASX refinado */
--asx-brand:       oklch(0.52 0.22 25);       /* mais vibrante, +4% luminosidade */
--asx-brand-hover: oklch(0.58 0.22 25);
--asx-brand-muted: oklch(0.52 0.22 25 / 0.15);
--asx-brand-ring:  oklch(0.52 0.22 25 / 0.40);

/* Semanticas — Status */
--asx-success:       oklch(0.72 0.17 155);    /* verde esmeralda */
--asx-success-muted: oklch(0.72 0.17 155 / 0.15);
--asx-warning:       oklch(0.78 0.16 85);     /* ambar dourado */
--asx-warning-muted: oklch(0.78 0.16 85 / 0.15);
--asx-error:         oklch(0.62 0.24 25);     /* vermelho distinto do brand */
--asx-error-muted:   oklch(0.62 0.24 25 / 0.15);
--asx-info:          oklch(0.68 0.14 250);    /* azul sereno */
--asx-info-muted:    oklch(0.68 0.14 250 / 0.15);

/* Status de Processos (Containers/Pedidos) */
--asx-status-empty:    oklch(0.55 0.01 280);
--asx-status-filling:  oklch(0.78 0.16 85);
--asx-status-full:     oklch(0.68 0.14 250);
--asx-status-shipped:  oklch(0.62 0.16 290);
--asx-status-delivered: oklch(0.72 0.17 155);
--asx-status-pending:  oklch(0.78 0.16 85);
--asx-status-confirmed: oklch(0.68 0.14 250);
--asx-status-received: oklch(0.72 0.17 155);

/* Charts — paleta harmonica */
--asx-chart-1: oklch(0.52 0.22 25);   /* vermelho ASX */
--asx-chart-2: oklch(0.72 0.17 155);  /* verde */
--asx-chart-3: oklch(0.78 0.16 85);   /* ambar */
--asx-chart-4: oklch(0.68 0.14 250);  /* azul */
--asx-chart-5: oklch(0.62 0.16 290);  /* roxo */
--asx-chart-6: oklch(0.70 0.14 180);  /* teal */
```

**PRIORIDADE: CRITICA**
Sem uma paleta semantica centralizada, qualquer mudanca visual exige editar
dezenas de arquivos.

---

## 2. TIPOGRAFIA

### ESTADO ATUAL

- **Titulos:** Rajdhani (font-weight 700), definida em `<h1>` a `<h6>` no CSS
- **Corpo:** Segoe UI / system font stack, 14px, line-height 1.6
- **Hierarquia definida:** h1=2rem, h2=1.5rem, h3=1.25rem, h4=1.1rem

**PROBLEMAS IDENTIFICADOS:**

1. **Rajdhani nao e carregada via Google Fonts no HTML.** Se o usuario nao tem a
   fonte instalada, cai para Segoe UI em titulos, destruindo a identidade visual.
   Nenhum `@import` ou `<link>` para Google Fonts foi encontrado.

2. **Classe `.font-rajdhani` usada inline em dezenas de lugares** em vez de ser
   herdada dos headings. Ex: `<span className="font-rajdhani font-bold">` quando
   um `<h3>` ja teria esse estilo.

3. **Tamanhos de texto inconsistentes.** Usa-se `text-[10px]`, `text-[11px]`,
   `text-[9px]`, `text-[8px]` etc. arbitrariamente. Nao ha escala tipografica.

4. **Sem `Inter` importada.** O comentario no CSS diz "Inter (dados/labels)" mas
   a fonte real e Segoe UI.

5. **Letter-spacing e line-height variam** sem padrao. Valores como `tracking-wider`,
   `tracking-widest` sao usados sem logica consistente.

### PROPOSTA "PREMIUM 2026"

```css
/* Importar fontes */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Rajdhani:wght@500;600;700&display=swap');

/* Escala tipografica — 8 niveis */
--asx-text-xs:   0.6875rem;  /* 11px — captions, timestamps */
--asx-text-sm:   0.8125rem;  /* 13px — labels, metadata */
--asx-text-base: 0.875rem;   /* 14px — corpo principal */
--asx-text-md:   1rem;       /* 16px — subtitulos pequenos */
--asx-text-lg:   1.125rem;   /* 18px — titulos de card */
--asx-text-xl:   1.375rem;   /* 22px — titulos de secao */
--asx-text-2xl:  1.75rem;    /* 28px — titulos de pagina */
--asx-text-3xl:  2.25rem;    /* 36px — KPIs hero */

/* Body */
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: var(--asx-text-base);
  line-height: 1.5;
  letter-spacing: -0.006em;  /* micro-otimizacao Inter */
  -webkit-font-smoothing: antialiased;
}

/* Headings */
h1, h2, h3, h4 {
  font-family: 'Rajdhani', 'Inter', sans-serif;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

/* KPI Values */
.asx-kpi-value {
  font-family: 'Rajdhani', sans-serif;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

/* Dados monetarios */
.asx-currency {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
```

**Regra de ouro:** Rajdhani APENAS para titulos, codigos de produto e valores KPI.
Inter para TUDO mais (labels, descricoes, paragrafos, botoes).

**PRIORIDADE: ALTA**

---

## 3. ESPACAMENTO & LAYOUT

### ESTADO ATUAL

- **Grid system:** Nao usa CSS Grid como sistema. Usa flexbox extensivamente.
- **Container:** Definido em `@layer components`, com `max-width: 1440px` em telas >= 1024px.
- **Padding de pagina:** Varia entre `px-6 py-3`, `p-8`, `p-4`, `px-4` sem padrao.
- **Gaps entre cards:** Variam de `gap-2` a `gap-4` a `gap-6` sem regra.
- **Sidebar:** Largura fixa de 256px (ou 72px colapsado), com padding interno `p-3`.

**PROBLEMAS IDENTIFICADOS:**

1. **Sem escala de espacamento consistente.** Cada pagina define seu proprio padding.
   Home usa `px-6`, Configuracoes usa `p-8`, Pagamentos nao tem padding padrao.

2. **Stats bars com grid-cols-4 fixo** sem responsividade — quebra em telas menores.

3. **Sidebar de categorias (Home) e a sidebar principal** nao compartilham
   metricas de espacamento.

4. **Cards sem altura minima consistente.** Cards de produto, container e pedido
   tem `p-4` mas tamanhos visuais diferentes.

5. **Header duplo em algumas paginas.** Ex: Home tem um "botao voltar" em uma
   barra + header principal logo abaixo, desperdicando espaco vertical.

### PROPOSTA "PREMIUM 2026"

```css
/* Escala de espacamento — base 4px */
--asx-space-1:  0.25rem;  /* 4px */
--asx-space-2:  0.5rem;   /* 8px */
--asx-space-3:  0.75rem;  /* 12px */
--asx-space-4:  1rem;     /* 16px */
--asx-space-5:  1.25rem;  /* 20px */
--asx-space-6:  1.5rem;   /* 24px */
--asx-space-8:  2rem;     /* 32px */
--asx-space-10: 2.5rem;   /* 40px */
--asx-space-12: 3rem;     /* 48px */

/* Layout tokens */
--asx-page-padding: var(--asx-space-6);        /* padding lateral de pagina */
--asx-section-gap: var(--asx-space-6);         /* entre secoes */
--asx-card-padding: var(--asx-space-5);        /* padding interno de cards */
--asx-card-gap: var(--asx-space-4);            /* entre cards */
--asx-header-height: 3.5rem;                   /* 56px */
--asx-sidebar-width: 260px;
--asx-sidebar-collapsed: 72px;
```

**Diretrizes de layout:**
- Paginas devem ter `px-[--asx-page-padding] py-[--asx-section-gap]`
- Cards usam `p-[--asx-card-padding]`
- Grids de KPI: `grid grid-cols-2 md:grid-cols-4 gap-[--asx-card-gap]`
- Eliminar headers duplos — usar breadcrumb integrado ao header unico

**PRIORIDADE: ALTA**

---

## 4. DESIGN DE COMPONENTES

### 4.1 CARDS

**Estado atual:** Dois sistemas coexistem — o `Card` do shadcn/ui (bg-card, rounded-xl,
py-6, shadow-sm) e o `.asx-card` custom (asx-surface, rounded 0.75rem, red gradient top).
Alem disso, componentes como ContainerCard e OrderCard criam seus proprios cards inline.

**Problemas:**
- 3 padroes de card diferentes
- `.asx-card` tem animacao de hover (translateY -1px) mas os outros nao
- Cards shadcn tem `gap-6` interno que e excessivo para dados densos

**Proposta:**
```
Card padrao ASX Premium:
- background: var(--asx-bg-surface)
- border: 1px solid var(--asx-border-subtle)
- border-radius: 12px (0.75rem)
- padding: 20px
- Hover: border-color var(--asx-border-default), box-shadow 0 4px 16px oklch(0 0 0 / 0.2)
- Transicao: 200ms ease
- SEM gradient vermelho no topo (poluicao visual quando ha muitos cards)
- Gradient vermelho APENAS para cards "featured" ou KPIs hero
```

**PRIORIDADE: ALTA**

### 4.2 TABELAS

**Estado atual:** Componente `Table` do shadcn basico. Cabeçalhos com `h-10 px-2`,
celulas com `p-2`. Hover em `hover:bg-muted/50`.

**Problemas:**
- Sem zebra striping em modo escuro
- Header nao e sticky
- Sem indicador visual de coluna sortavel
- Celulas de valor monetario nao tem alinhamento tabular-nums

**Proposta:**
```
Tabela ASX Premium:
- Header: background var(--asx-bg-base), font-weight 600, sticky top-0
- Zebra: rows impares com bg var(--asx-bg-surface), pares com transparent
- Hover: bg var(--asx-bg-elevated) com transicao 150ms
- Sort icons: sempre visiveis (opacity 0.3), ativos em var(--asx-brand)
- Valores monetarios: font-variant-numeric tabular-nums, text-align right
- Celulas de status: usar badges semanticos globais
- Border horizontal sutil entre rows
```

**PRIORIDADE: ALTA**

### 4.3 BOTOES

**Estado atual:** O componente `Button` do shadcn tem 6 variantes (default, destructive,
outline, secondary, ghost, link). Porem, a maioria dos botoes no app sao `<button>`
nativos com `style={{}}` inline.

**Problemas:**
- Botoes inline ignoram o design system
- Ex: Sidebar tem `onMouseEnter` / `onMouseLeave` para hover em JS em vez de CSS
- Botoes de acao em OrderCard/ContainerCard nao usam o componente Button
- Nao ha variante "danger-outline" para acoes destructivas com confirmacao

**Proposta:**
```
Adicionar variantes:
- "brand": bg var(--asx-brand), text white — para CTAs principais
- "brand-outline": border var(--asx-brand), text var(--asx-brand)
- "danger-ghost": text var(--asx-error), hover bg var(--asx-error-muted)
- "success": bg var(--asx-success) — para confirmacoes

Tamanhos adicionais:
- "xs": h-7 px-2 text-xs — para acoes em tabelas
- "compact": h-8 px-3 text-xs — para toolbars
```

**PRIORIDADE: MEDIA**

### 4.4 FORMULARIOS / INPUTS

**Estado atual:** O `Input` do shadcn existe mas e pouquissimo usado. A maioria dos
inputs sao `<input>` nativos com estilos inline. O `.asx-input-usd` customizado e
bem feito, com focus ring.

**Problemas:**
- Inputs nativos sem focus ring acessivel (usam `outline: none` sem substituto)
- Selects (`<select>`) sem styling consistente — herdam aparencia do browser
- Labels nao estao associados a inputs via `htmlFor`/`id`
- Mensagens de erro nao seguem padrao
- Nao ha campo de busca padrao reutilizavel (cada pagina reinventa)

**Proposta:**
```
Input ASX Premium:
- height: 40px (h-10)
- bg: var(--asx-bg-subtle)
- border: 1px solid var(--asx-border-default)
- border-radius: 8px
- Focus: ring 3px var(--asx-brand-ring), border var(--asx-brand)
- Placeholder: var(--asx-text-disabled)
- Erro: border var(--asx-error), ring var(--asx-error / 0.2)
- Labels: var(--asx-text-secondary), text-sm, font-weight 500, mb-1.5

SearchInput padrao:
- icone Search a esquerda
- botao X para limpar
- Reutilizado em Home, Compras, CentralCompra, Desenvolvimento
```

**PRIORIDADE: ALTA**

### 4.5 BADGES / STATUS

**Estado atual:** Badges custom definidos em CSS (`.asx-badge-profit-pos/neg/zero`)
mais badges inline em cada componente. Status de containers e pedidos definem
cores localmente.

**Problemas:**
- Cada componente reinventa cores de status
- Sem badges semanticos globais
- Badges de alerta na sidebar usam `animate-pulse` que e distrativo

**Proposta:**
```
Criar sistema unificado de Status Badge:
<StatusBadge variant="success|warning|error|info|neutral" size="sm|md">
  Texto
</StatusBadge>

Mapeamento:
- Pedido Pendente -> variant="warning"
- Pedido Confirmado -> variant="info"
- Pedido Recebido -> variant="success"
- Container Vazio -> variant="neutral"
- Container Preenchendo -> variant="warning"
- Container Cheio -> variant="info"
- Container Enviado -> variant="info" (com icone Ship)
- Container Entregue -> variant="success"
- Lucro positivo -> variant="success"
- Lucro negativo -> variant="error"
- Estoque critico -> variant="error" (sem pulse, apenas cor)
- Estoque atencao -> variant="warning"
```

**PRIORIDADE: ALTA**

---

## 5. MICRO-INTERACOES & ANIMACOES

### ESTADO ATUAL

- **Transicoes existentes:** `transition-all 0.2s ease` nos cards, `transition-colors`
  em botoes
- **Animate pulse:** Usado em badges de alerta critico (sidebar)
- **Animate spin:** Loading do RefreshCw na cotacao
- **tw-animate-css:** Importado mas pouco utilizado
- **Hover em JS:** Sidebar usa `onMouseEnter`/`onMouseLeave` com `style` manipulation

**PROBLEMAS IDENTIFICADOS:**

1. **Hover via JS e um anti-padrao.** Toda a sidebar usa event handlers para mudar
   cores de hover. Isso impede `:hover` CSS puro, quebra em touch screens, e
   adiciona complexidade desnecessaria.

2. **Sem animacao de entrada de pagina.** Transicoes entre paginas sao instantaneas.

3. **Sem skeleton loading.** O componente `DashboardLayoutSkeleton` existe mas nao
   e usado no fluxo principal (que usa o Sidebar custom).

4. **Sem animacao de tabelas.** Dados aparecem instantaneamente.

5. **animate-pulse em alertas e agressivo.** Faz o badge "piscar" indefinidamente,
   causando fadiga visual.

### PROPOSTA "PREMIUM 2026"

```css
/* === Animacoes Premium === */

/* Entrada de pagina */
@keyframes asx-page-enter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.asx-page-enter {
  animation: asx-page-enter 0.3s ease-out;
}

/* Entrada de card (staggered) */
@keyframes asx-card-enter {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

/* Hover de card refinado */
.asx-card:hover {
  border-color: var(--asx-border-strong);
  box-shadow: 0 8px 32px oklch(0 0 0 / 0.25),
              0 0 0 1px var(--asx-border-default);
  transform: translateY(-2px);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover de linha de tabela */
tr:hover {
  background: var(--asx-bg-elevated);
  transition: background 0.15s ease;
}

/* Focus ring premium */
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--asx-brand-ring);
  border-color: var(--asx-brand);
  transition: box-shadow 0.2s ease;
}

/* Loading skeleton shimmer */
@keyframes asx-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.asx-skeleton {
  background: linear-gradient(
    90deg,
    var(--asx-bg-surface) 25%,
    var(--asx-bg-elevated) 50%,
    var(--asx-bg-surface) 75%
  );
  background-size: 200% 100%;
  animation: asx-shimmer 1.5s ease-in-out infinite;
  border-radius: 6px;
}

/* Alerta critico — glow sutil em vez de pulse */
.asx-alert-critical {
  box-shadow: 0 0 8px var(--asx-error / 0.3);
  /* SEM animate-pulse */
}

/* Numero animado (CountUp) */
.asx-count-up {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Diretrizes de animacao:**
- Duracao maxima: 300ms para hover/focus, 500ms para entrada de pagina
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (Material ease-out)
- NUNCA `animate-pulse` para elementos persistentes
- Preferir `transform` e `opacity` (GPU-accelerated)
- `prefers-reduced-motion`: respeitar, desativar todas as animacoes

**PRIORIDADE: MEDIA**

---

## 6. VISUALIZACAO DE DADOS (KPIs & Charts)

### ESTADO ATUAL

- **KPIs:** Exibidos como blocos de texto com `font-rajdhani font-bold text-xl`
  em barras horizontais (grid-cols-4). Simples e funcional.
- **Charts:** Nao foram encontrados graficos Recharts/Chart.js nas paginas
  principais. O componente `chart.tsx` existe mas parece pouco utilizado.
- **Dados de progresso:** Pagina de Rastreamento mostra porcentagens em texto.
  CentralCompra mostra duracoes de estoque com cores condicionais.

**PROBLEMAS IDENTIFICADOS:**

1. **KPIs sem sparklines ou tendencia.** Um gestor quer ver se o saldo esta
   subindo ou caindo, nao apenas o valor atual.

2. **Sem graficos na Home.** A pagina principal e uma tabela de produtos. Um
   dashboard executivo precisa de graficos de resumo.

3. **Porcentagens de embarque so em texto.** Deveria usar barras de progresso
   visuais.

4. **Pagamentos sem grafico de fluxo de caixa.** Debitos vs. pagamentos ao
   longo do tempo seria muito mais claro.

5. **Duracao de estoque sem visualizacao.** Na CentralCompra, a duracao em
   meses e mostrada como numero. Um gauge ou barra horizontal indicando
   "seguranca do estoque" seria muito mais intuitivo.

### PROPOSTA "PREMIUM 2026"

```
KPI Card Premium:
+--------------------------------------------------+
|  [icone]  LABEL PEQUENO (text-tertiary)           |
|  R$ 56.069,63  (Rajdhani, 2xl, text-primary)     |
|  ▲ 12.3% vs mes anterior (text-success, text-xs) |
|  [sparkline 60x24px, ultimos 30 dias]            |
+--------------------------------------------------+

Estrutura Tailwind:
<div class="asx-card p-5">
  <div class="flex items-center gap-2 mb-1">
    <DollarSign class="w-4 h-4 text-tertiary" />
    <span class="text-xs font-medium uppercase tracking-wider text-tertiary">
      Total Debitos
    </span>
  </div>
  <p class="asx-kpi-value text-2xl font-bold text-primary">
    R$ 56.069,63
  </p>
  <div class="flex items-center gap-1 mt-1">
    <TrendingUp class="w-3 h-3 text-success" />
    <span class="text-xs text-success">+12.3%</span>
    <span class="text-xs text-tertiary">vs mes anterior</span>
  </div>
</div>

Graficos recomendados:
1. Home -> Pie chart de categorias + bar chart de markup medio
2. Pagamentos -> Line chart de fluxo de caixa acumulado
3. Rastreamento -> Barras de progresso visuais por pedido
4. CentralCompra -> Gauge de duracao de estoque (semaforo)
5. Containers -> Timeline visual de status
```

**PRIORIDADE: MEDIA-ALTA**

---

## 7. DARK MODE

### ESTADO ATUAL

O ThemeProvider existe com suporte a "light" e "dark", MAS:
- `defaultTheme` e "light" e `switchable` e `false`
- O CSS define APENAS variaveis `:root` (dark). Nao ha `@custom-variant dark`.
  Espera... ha `@custom-variant dark (&:is(.dark *))` mas as variaveis nunca
  mudam para light.
- TODO o app e forcadamente dark — as cores oklch sao todas escuras.
- O ThemeProvider adiciona/remove classe `dark`, mas nao existe modo light.

**AVALIACAO:**
O app e dark-only. Isso esta OK para o caso de uso (painel de comando, gerentes
usando em escritorio). Porem, nao ha opcao de modo light, o que prejudica
usabilidade em ambientes muito iluminados.

**Proposta:**

Manter dark como padrao, mas preparar a arquitetura para light mode:

```css
:root {
  /* Light mode */
  --background: oklch(0.97 0.005 280);
  --foreground: oklch(0.15 0.005 280);
  --card: oklch(1.0 0 0);
  --card-foreground: oklch(0.15 0.005 280);
  /* ... etc */
}

.dark {
  /* Dark mode (atual) */
  --background: oklch(0.10 0.008 280);
  --foreground: oklch(0.95 0.005 80);
  --card: oklch(0.14 0.008 280);
  --card-foreground: oklch(0.95 0.005 80);
  /* ... etc */
}
```

E habilitar `switchable: true` no ThemeProvider.

**PRIORIDADE: BAIXA** (dark-only e aceitavel para o publico-alvo)

---

## 8. RESPONSIVIDADE (MOBILE)

### ESTADO ATUAL

- **Layout principal:** `flex flex-col md:flex-row` — sidebar some em mobile
- **Mobile header:** Fixo no topo, h-14, com MobileMenu hamburger
- **MobileMenu:** Drawer lateral animado com `transform translate`, bem implementado
- **Home page:** Tem search mobile separado, sidebar de categorias fixa
- **ProductCardMobile:** Componente dedicado para mobile (bom!)

**PROBLEMAS IDENTIFICADOS:**

1. **Sidebar de categorias (Home) nao funciona em mobile.** Ela e uma coluna
   lateral com `w-52 flex-shrink-0` que nao colapsa em telas pequenas. Em mobile,
   provavelmente fica comprimida ou invisivel.

2. **Header com filtros (Home) overflow em mobile.** Multiplos selects + botoes
   em `flex gap-4` sem wrap — transborda horizontalmente.

3. **Tabelas de dados nao tem versao mobile.** A CentralCompra com 13+ colunas
   sera ilegivel em celular.

4. **Pagamentos com layout side-by-side** (debitos | pagamentos) que provavelmente
   nao empilha em mobile.

5. **MobileMenu usa classes hardcoded** como `bg-red-600` e `text-gray-300` que
   nao seguem o design system oklch do resto do app.

6. **Touch targets.** Botoes na sidebar tem padding `10px` — pode ser pequeno
   para touch. Minimo recomendado: 44x44px.

### PROPOSTA "PREMIUM 2026"

```
Mobile-first breakpoints:
- < 640px: Stack everything, tabs para navegacao entre secoes
- 640-1024px: 2 colunas onde possivel
- > 1024px: Layout desktop completo

Mudancas especificas:

1. Home mobile:
   - Categorias viram tabs horizontais deslizaveis (scroll snap)
   - Filtros dentro de Sheet/Drawer (botao "Filtros" com badge de count)
   - Tabela vira lista de ProductCardMobile
   - Stats bar vira 2x2 grid

2. CentralCompra mobile:
   - Tabela vira lista de cards colapsaveis
   - Cada card mostra: codigo, descricao, semaforo de duracao
   - Expandir mostra detalhes completos

3. Pagamentos mobile:
   - Tabs "Debitos" / "Pagamentos" / "Resumo"
   - Cada tab ocupa tela inteira
   - KPIs empilham verticalmente

4. MobileMenu:
   - Corrigir classes para usar tokens oklch
   - Adicionar icones nos itens
   - Touch targets minimo 48px de altura

5. Touch targets globais:
   - Botoes: min-height 44px
   - Links em listas: min-height 48px
   - Inputs: height 44px em mobile
```

**PRIORIDADE: ALTA**

---

## 9. ACESSIBILIDADE (WCAG 2.1 AA)

### ESTADO ATUAL

**Pontos positivos:**
- Toast usa `role="alert"` e `aria-live="polite"` (correto!)
- MobileMenu tem `aria-label="Toggle menu"` e `aria-hidden="true"` no overlay
- Focus ring definido nos componentes shadcn (focus-visible:ring)
- Cursor pointer em elementos interativos

**PROBLEMAS CRITICOS IDENTIFICADOS:**

1. **Contraste de texto insuficiente.** Textos com `oklch(0.40 0.010 285)` sobre
   fundo `oklch(0.14 0.005 285)` provavelmente FALHAM no ratio 4.5:1.
   Estimativa: ~2.8:1 (FALHA).
   Pior exemplo: timestamps `oklch(0.30 0.010 285)` — praticamente invisivel.

2. **Inputs com `outline: none` sem alternativa.** Na Home page, inputs usam
   `style={{ outline: 'none' }}` inline, removendo o focus indicator nativo
   sem substituir por um custom. Violacao WCAG 2.4.7 (Focus Visible).

3. **Labels nao associados a inputs.** Na Login, labels sao `<label>` sem
   `htmlFor`, e inputs nao tem `id`. Em Configuracoes e Pagamentos, idem.

4. **Nenhum skip link.** Nao ha mecanismo para pular navegacao.

5. **Icones sem texto alternativo.** Botoes icon-only (export CSV, settings,
   tag) dependem apenas de `title` que nao e lido por todos screen readers.
   Devem usar `aria-label`.

6. **Sidebar hover via JS** nao funciona via teclado. Um usuario navegando
   por Tab nao vera o estado hover/focus dos itens.

7. **Cores como unico indicador.** Badges de status dependem apenas de cor.
   Um usuario daltonico nao distingue "Pendente" (ambar) de "Confirmado" (azul).
   Faltam icones ou padroes adicionais.

8. **Tabelas sem scope nos headers.** `<th>` sem `scope="col"` dificulta
   navegacao por screen reader.

9. **Formularios sem mensagens de erro associadas.** Quando ha erro, e exibido
   visualmente mas sem `aria-describedby` ligando ao input.

10. **Animacoes sem `prefers-reduced-motion`.** `animate-pulse` e transicoes
    nao respeitam a preferencia do usuario.

### PROPOSTA "PREMIUM 2026"

```
CORRECOES OBRIGATORIAS (WCAG 2.1 AA):

1. Contraste minimo:
   - Texto normal: ratio >= 4.5:1
   - Texto grande (>= 18px bold ou >= 24px): ratio >= 3:1
   - Textos "tertiary": ajustar para oklch(0.55 ...) minimo
   - BANIR oklch < 0.45 para qualquer texto legivel

2. Focus indicators:
   - REMOVER todo `outline: none` inline
   - Usar ring padrao: `focus-visible:ring-2 focus-visible:ring-asx-brand
     focus-visible:ring-offset-2 focus-visible:ring-offset-asx-bg-base`

3. Labels e ARIA:
   - Todo input precisa de `id` + label com `htmlFor`
   - Botoes icon-only: `aria-label="descricao da acao"`
   - Mensagens de erro: `aria-describedby` linkado ao input

4. Skip link:
   <a href="#main-content" class="sr-only focus:not-sr-only ...">
     Pular para conteudo principal
   </a>

5. Status alem de cor:
   - Pendente: icone Clock + cor ambar
   - Confirmado: icone CheckCircle + cor azul
   - Recebido: icone CheckCheck + cor verde
   - Critico: icone AlertTriangle + cor vermelha

6. Reduced motion:
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }

7. Tabelas:
   - <th scope="col"> em todos os headers
   - <caption> descrevendo o conteudo da tabela (pode ser sr-only)

8. Sidebar:
   - Remover hover JS, usar `:hover` e `:focus-visible` CSS
   - `<nav aria-label="Navegacao principal">`
   - Items como `<a>` com role implicito (ja sao Link)
```

**PRIORIDADE: CRITICA**
Acessibilidade nao e opcional. Diversas violacoes WCAG 2.1 AA foram encontradas.

---

## 10. SIDEBAR — ANALISE DETALHADA

### ESTADO ATUAL

A Sidebar e o componente mais complexo do app. Ela contem:
- Cotacao USD/BRL em tempo real (API BCB)
- 9 itens de menu com icones
- Badges de alerta (estoque critico)
- Resumo de alertas (estoque critico)
- Cobertura de estoque (porcentagens)
- Botao de logout
- Toggle colapsar/expandir
- Footer com versao

**PROBLEMAS IDENTIFICADOS:**

1. **Overcrowded.** A sidebar tenta fazer muita coisa. Cotacao, alertas, KPIs,
   menu, logout — tudo no mesmo espaco vertical. Em telas menores que 900px
   de altura, provavelmente exige scroll.

2. **Hover em JS.** Todos os itens usam `onMouseEnter`/`onMouseLeave` para
   manipular `style.background` e `style.color`. Anti-padrao que:
   - Nao funciona com teclado
   - Cria re-renders React desnecessarios
   - E mais verboso que CSS

3. **Dois componentes Sidebar coexistem.** O `Sidebar.tsx` custom E o
   `DashboardLayout.tsx` (que usa shadcn Sidebar). O DashboardLayout parece
   nao ser usado no fluxo principal (App.tsx usa Sidebar.tsx direto).

4. **Colapsado perde muita informacao.** Quando colapsado (72px), so mostra
   icones, cotacao truncada, e badges. Nao mostra labels nos tooltips.

### PROPOSTA "PREMIUM 2026"

```
Sidebar redesenhada:

+-- Sidebar Expandida (260px) --+
|                               |
|  [Logo ASX]  ASX Dashboard    |
|  ─────────────────────────    |
|  USD/BRL  R$ 5,7340  [↻]     |
|  Compra: 5,7280 | PTAX 20/03 |
|  ─────────────────────────    |
|                               |
|  NAVEGACAO                    |
|  ● Dashboard                  |
|  ○ Pedidos                    |
|  ○ Central Sarom     [!3]     |
|  ○ Central Alexandre [!1]     |
|  ○ Conteiner SR               |
|  ○ Rastreamento               |
|  ○ Pagamentos                 |
|  ○ Desenvolvimento            |
|  ○ Configuracoes              |
|                               |
|  ─────────────────────────    |
|  ESTOQUE                      |
|  Sarom:     87%  [========-]  |
|  Alexandre: 64%  [======---]  |
|  ─────────────────────────    |
|  [Sair]           [◀ Colapsar]|
|  ASX v2.1                     |
+-------------------------------+

Mudancas tecnicas:
- Hover via CSS classes (data-active, group-hover)
- Tooltips no modo colapsado (usando Tooltip component)
- Cotacao com micro-grafico de variacao semanal
- Barras de progresso para cobertura (em vez de %)
- Scrollable nav area com scroll-shadows
- aria-current="page" no item ativo
```

**PRIORIDADE: ALTA**

---

## 11. INCONSISTENCIAS ENTRE ESTILOS INLINE vs DESIGN SYSTEM

### DIAGNOSTICO

Este e o problema arquitetural mais grave do frontend.

**Contagem aproximada de ocorrencias `style={{`:**
- Sidebar.tsx: ~30 ocorrencias
- Home.tsx: ~50+ ocorrencias
- Compras.tsx: ~30+ ocorrencias
- Containers.tsx: ~20+ ocorrencias
- Pagamentos.tsx: ~40+ ocorrencias
- CentralCompraAvancada.tsx: ~40+ ocorrencias
- Login.tsx: ~15 ocorrencias
- Rastreamento.tsx: ~30+ ocorrencias
- ContainerCard.tsx: ~10 ocorrencias
- OrderCard.tsx: ~10 ocorrencias
- MobileMenu.tsx: ~5 ocorrencias

**TOTAL: ~280+ atributos style inline**

Isso significa que o design system (variaveis CSS no index.css) e ignorado pela
maioria dos componentes. Cada componente define suas proprias cores, tornando
impossivel qualquer mudanca global de tema ou ajuste de paleta.

### PROPOSTA DE MIGRACAO

```
Fase 1: Criar tokens Tailwind customizados
- Mapear todos os oklch usados inline para tokens semanticos
- Definir no tailwind config: colors.asx.bg.base, colors.asx.text.primary, etc.
- OU usar CSS variables com classes utilitarias: bg-[var(--asx-bg-surface)]

Fase 2: Migrar pagina por pagina
- Prioridade: Sidebar (mais usada) -> Home -> Compras -> CentralCompra
- Substituir style={{ background: 'oklch(...)' }} por className="bg-asx-surface"
- Substituir style={{ color: 'oklch(...)' }} por className="text-asx-secondary"

Fase 3: Eliminar hover JS
- Substituir onMouseEnter/Leave por hover: classes Tailwind
- Adicionar focus-visible: para acessibilidade

Fase 4: Unificar componentes
- Deletar DashboardLayout.tsx (nao usado)
- Consolidar cards em 1 componente base
- Consolidar badges em 1 componente StatusBadge
- Criar SearchInput reutilizavel
```

**PRIORIDADE: CRITICA** (bloqueante para todas as outras melhorias)

---

## 12. LOGIN PAGE

### ESTADO ATUAL

Bem projetada. Logo ASX em vermelho, formulario centrado, estilo coerente com
o dashboard.

**Problemas menores:**
- Email pre-preenchido (`sarom@asxstore.com`) — potencial risco de seguranca
- Labels sem `htmlFor`
- Sem indicador de forca de senha
- Sem opcao "esqueci a senha"
- Botao sem hover state definido

### PROPOSTA

- Adicionar background com gradient sutil ou pattern automotivo
- Animacao de entrada suave no card (scale 0.95 -> 1.0, opacity)
- Focus states nos inputs
- Remover email pre-preenchido em producao
- Adicionar `htmlFor`/`id` nos labels/inputs

**PRIORIDADE: BAIXA**

---

## 13. PLANO DE IMPLEMENTACAO PRIORIZADO

### FASE 1 — FUNDACAO (Semana 1-2) [CRITICA]

| # | Tarefa | Impacto |
|---|--------|---------|
| 1 | Criar paleta de tokens CSS semantica completa em index.css | Tudo depende disso |
| 2 | Importar Inter + Rajdhani via Google Fonts | Tipografia funcional |
| 3 | Definir escala tipografica e de espacamento | Consistencia |
| 4 | Corrigir violacoes de acessibilidade criticas (contraste, focus, labels) | Legal/etico |
| 5 | Eliminar hover JS na Sidebar — migrar para CSS | Performance + A11y |

### FASE 2 — COMPONENTES (Semana 3-4) [ALTA]

| # | Tarefa | Impacto |
|---|--------|---------|
| 6 | Criar StatusBadge unificado | Consistencia visual |
| 7 | Criar SearchInput reutilizavel | Eliminar duplicacao |
| 8 | Redesenhar Card padrao ASX | Base para todas as paginas |
| 9 | Melhorar componente Table (sticky header, zebra, sort) | Legibilidade |
| 10 | Adicionar variantes ao Button | Design system completo |

### FASE 3 — PAGINAS (Semana 5-8) [ALTA]

| # | Tarefa | Impacto |
|---|--------|---------|
| 11 | Migrar Home (eliminar styles inline, mobile responsive) | Pagina principal |
| 12 | Migrar Sidebar (tokens, tooltips, CSS hover) | Navegacao |
| 13 | Migrar CentralCompra (tokens, mobile cards) | Funcao core |
| 14 | Migrar Pagamentos (tokens, grafico fluxo de caixa) | Financeiro |
| 15 | Migrar Compras + Containers + Rastreamento | Restante |

### FASE 4 — PREMIUM (Semana 9-10) [MEDIA]

| # | Tarefa | Impacto |
|---|--------|---------|
| 16 | Animacoes de entrada de pagina | Sensacao premium |
| 17 | KPI cards com sparklines e tendencia | Data viz |
| 18 | Skeleton loading em todas as paginas | UX percebida |
| 19 | Graficos (Recharts) nas paginas chave | Insight do gestor |
| 20 | Preparar light mode (se desejado) | Versatilidade |

---

## 14. RESUMO DE TOKENS PROPOSTOS (REFERENCIA RAPIDA)

```
CORES DE FUNDO:
bg-asx-base       oklch(0.10 0.008 280)
bg-asx-surface     oklch(0.14 0.008 280)
bg-asx-elevated    oklch(0.18 0.008 280)
bg-asx-overlay     oklch(0.22 0.008 280)
bg-asx-subtle      oklch(0.26 0.008 280)

CORES DE TEXTO:
text-asx-primary   oklch(0.95 0.005 80)
text-asx-secondary oklch(0.75 0.008 280)
text-asx-tertiary  oklch(0.55 0.008 280)
text-asx-disabled  oklch(0.40 0.006 280)

BORDAS:
border-asx-subtle  oklch(0.22 0.006 280)
border-asx-default oklch(0.28 0.006 280)
border-asx-strong  oklch(0.35 0.006 280)

BRAND:
bg-asx-brand       oklch(0.52 0.22 25)
text-asx-brand     oklch(0.52 0.22 25)
ring-asx-brand     oklch(0.52 0.22 25 / 0.4)

SEMANTICAS:
text-asx-success   oklch(0.72 0.17 155)
text-asx-warning   oklch(0.78 0.16 85)
text-asx-error     oklch(0.62 0.24 25)
text-asx-info      oklch(0.68 0.14 250)
```

---

## 15. CONCLUSAO

O ASX Dashboard tem uma base funcional solida com boa escolha de tecnologias
(React, Tailwind, tRPC, OKLCH). O conceito "Dark Command Center" e apropriado
para o publico-alvo (gestores de importacao automotiva). Porem, a execucao
visual sofre de tres problemas fundamentais:

1. **Debt tecnico de estilos inline** (~280+ ocorrencias de style={{}}) que
   torna o design system inutilizavel.

2. **Acessibilidade deficiente** com violacoes WCAG em contraste, focus,
   labels e semantica.

3. **Inconsistencia visual** entre componentes que deveriam ser identicos
   (cards, badges, inputs, hover states).

A modernizacao proposta eleva o produto de "funcional" para "premium" sem
mudar a identidade visual — o DNA dark + vermelho ASX permanece, mas com
execucao Apple-level: consistente, acessivel, animado com subtileza, e
mantivel.

**Investimento estimado: 8-10 semanas (1 dev frontend dedicado)**
**ROI: Design system mantivel, acessibilidade legal, UX profissional**

---

Documento gerado pelo UX Designer — ASX Iluminacao Dashboard Audit 2026
