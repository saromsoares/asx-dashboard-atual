# ASX Dashboard - TODO List

## ✅ Tarefas Concluídas

- [x] Dashboard de Produtos com foto, código, referência, nome, código de barra, preço de custo em dólar, preço de custo em real (fórmula USD x 8,5), preço de venda e lucro bruto
- [x] Remover total de venda e total de lucro do dashboard de produtos
- [x] Adicionar coluna de Markup % correlacionado ao preço individual de custo e venda
- [x] Sincronizar pedidos com banco de dados usando tRPC (em vez de localStorage)
- [x] Adicionar notificação visual ao confirmar pedido
- [x] Criar sistema de containers para vincular pedidos confirmados
- [x] Adicionar rastreamento de status de containers (Vazio → Preenchendo → Cheio → Enviado → Entregue)
- [x] Visualizar conteúdo do container e pedidos vinculados
- [x] Corrigir aba "Recebido" que estava quebrando a linha
- [x] Adicionar cards de porcentagem total no sidebar para Pedido Sarom e Pedido Alexandre
- [x] Criar formulário modal para adicionar novos produtos (categoria, nome, código, código de barras, descrição, observações, foto)

## 📋 Tarefas Pendentes

- [ ] Integrar formulário de novo produto com banco de dados via tRPC
- [ ] Implementar upload de foto para novos produtos (S3)
- [ ] Criar relatório de conteúdo de container (PDF/Excel)
- [ ] Dashboard de containers com cards por status e barra de progresso
- [ ] Integração com rastreamento automático de containers
- [ ] Filtro por faixa de markup no dashboard de produtos
- [ ] Exportar CSV com coluna de markup
- [ ] Gráfico de distribuição de markup (pizza/barras)
- [ ] Histórico de alterações de pedidos com timeline
- [ ] Exportar pedido para PDF

## 🔧 Configuração Necessária

- [ ] Reconectar GitHub nas configurações de conectores
- [ ] Salvar checkpoint das mudanças
- [ ] Publicar no Manus

## 📊 Status Atual

- **Servidor**: ✅ Rodando sem erros
- **Testes**: ✅ 18 testes passando
- **GitHub**: ⚠️ Requer reconexão
- **Banco de Dados**: ✅ Schema atualizado com containers

## 🔒 Correções de Segurança e Performance (Lote 2)

### Fase 1: Validação, N+1, criarPedido, deletarContainer, Transações
- [x] Correção 2: Remover problema N+1 em getContainersComPedidos com LEFT JOIN + COUNT
- [x] Correção 3: Corrigir criarPedido para usar insertId em vez de busca por nome
- [x] Correção 4: Envolver deletarContainer em transação
- [x] Correção 5: Envolver todas as mutations em transações com parâmetro tx opcional (registrarAuditoria modificada)

### Fase 2: Rate Limiting, adminProcedure, Paginação, JSON, Índices
- [ ] Correção 6: Instalar express-rate-limit e configurar limites globais e por rota
- [ ] Correção 7: Criar adminProcedure em server/_core/trpc.ts
- [ ] Correção 8: Adicionar paginação em todos os getAll
- [ ] Correção 9: Mudar dadosAntigos/dadosNovos para json() no schema
- [ ] Correção 10: Adicionar índice unique em container_pedidos (containerId, pedidoId)

### Fase 3: Alinhamento pesoMaximo, Soft Delete, Regras de Negócio
- [ ] Correção 11: Alinhar pesoMaximo (Zod string → number, db.ts number, insert como string)
- [ ] Correção 12: Implementar soft delete em pedidos e containers
- [ ] Correção 13: Adicionar regras de negócio (verificações antes de deletar/vincular)

### Fase 4: Helpers, Separação Routes, Índices, Formatação
- [ ] Correção 14: Criar helper withDb para encapsular getDb + try/catch
- [ ] Correção 15: Criar auditHelper.ts para encapsular auditoria
- [ ] Correção 16: Separar routes.ts em múltiplos arquivos por domínio
- [ ] Correção 17: Criar migration com índices no banco de dados
- [ ] Correção 18: Formatar imports do db.ts em múltiplas linhas

### Fase 5: Testes e Validação
- [ ] Validação: TypeScript compila sem erros
- [ ] Validação: Todos os testes passam (vitest)
- [ ] Teste manual: Criar, editar, deletar pedido
- [ ] Teste manual: Criar, editar, deletar container
- [ ] Teste manual: Vincular/desvincular pedidos de containers
- [ ] Teste manual: Verificar auditoria registrada corretamente


## Melhorias de UI/UX

- [x] Adicionar coluna MARKUP MÉDIO na barra de estatísticas do dashboard de produtos


## 🐛 Correções de Layout e Estrutura

- [x] Corrigir status "Confirmado" cortado na aba de pedidos (Gerenciador de Compras) - Aumentado padding (px-5, py-2) e tamanho de fonte
- [x] Corrigir "Novo Produto" sobrepondo "415 produtos" na página de Desenvolvimento - Usado flex justify-between
- [x] Aumentar padding dos inputs de quantidade (py-1 → py-2)
- [ ] Revisar e ajustar espaçamento geral do layout
- [ ] Verificar overflow de elementos em todas as páginas
- [ ] Validar responsividade em diferentes resoluções


## 📱 Adaptação Mobile (4 Sessões Sequenciais)

### Sessão 1: Mobile Navigation + Layout Base
- [x] Criar componente MobileMenu (drawer hamburger)
- [x] Header fixo 56px com logo e ícone hamburger
- [x] Breakpoints Tailwind (mobile: <768px)
- [x] Testar em 375px, 390px, 430px
- [x] Revisar e validar antes de passar para Sessão 2

### Sessão 2: Tabelas → Cards Mobile
- [ ] Converter tabelas em cards empilhados
- [ ] Badges coloridas para status
- [ ] Ações (edit, delete) acessíveis
- [ ] Testar em 3 larguras
- [ ] Revisar e validar antes de passar para Sessão 3

### Sessão 3: Formulários + Inputs Mobile
- [ ] Inputs 100% width, 44px height
- [ ] Labels acima dos inputs
- [ ] Teclados numéricos (inputMode)
- [ ] Botões 48px height
- [ ] Testar em 3 larguras
- [ ] Revisar e validar antes de passar para Sessão 4

### Sessão 4: Refinamento + Testes Completos
- [ ] Pull-to-refresh
- [ ] Infinite scroll
- [ ] Toasts de feedback
- [ ] Testes completos em 375px, 390px, 430px
- [ ] Validação final
