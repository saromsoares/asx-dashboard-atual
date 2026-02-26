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
- **Testes**: ✅ 27 testes passando
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
- [x] Criar ProductCard, OrderCard, ContainerCard
- [x] Integrar ProductCard em Home.tsx (md:hidden)
- [x] Integrar OrderCard em Compras.tsx (md:hidden)
- [x] Integrar ContainerCard em Containers.tsx (md:hidden)
- [x] Todos os cards compilando sem erros
- [ ] Testar em 3 larguras (375px, 390px, 430px) - Próxima sessão

### Sessão 3: Formulários + Inputs Mobile
- [ ] Inputs 100% width, 44px height
- [ ] Labels acima dos inputs
- [ ] Teclados numéricos (inputMode)
- [ ] Botões 48px height
- [ ] Testar em 3 larguras
- [ ] Revisar e validar antes de passar para Sessão 4

### Sessão 4: Refinamento + Testes Completos
- [ ] Integrar FormInput em Home.tsx (search input)
- [ ] Integrar FormInput em Compras.tsx (novo pedido)
- [ ] Integrar FormInput em Containers.tsx (novo container)
- [ ] Integrar FormInput em Desenvolvimento.tsx (search + novo produto)
- [ ] Pull-to-refresh
- [ ] Infinite scroll
- [ ] Toasts de feedback
- [ ] Testes completos em 375px, 390px, 430px
- [ ] Validação final

## 🎨 Ajustes Visuais

- [x] Remover logo "ASX" do header mobile


## 📊 Central de Compras - Campos Editáveis

- [ ] Abrir campo Estoque Atual para preenchimento/edição
- [ ] Abrir campo Duração (6 meses / 3 meses) para preenchimento/edição
- [ ] Abrir campo Compras para preenchimento/edição
- [ ] Testar edição em CentralSarom.tsx
- [ ] Testar edição em CentralAlexandre.tsx


## 🚨 BUGS CRÍTICOS (Sessão Atual)

- [x] BUG: Compras.tsx - Ao criar pedido ou clicar em pedido, NÃO abre painel de detalhes para adicionar itens
- [x] BUG: Compras.tsx - Falta toda a UI de detalhes do pedido (adicionar itens, mudar status, ver itens)
- [x] BUG: Compras.tsx - Itens de pedido salvos apenas em memória local, não persistem no banco
- [x] BUG: Containers.tsx - Pedidos vinculados não aparecem quando expande container (seção vazia)
- [x] BUG: Containers.tsx - Falta mostrar nomes dos pedidos vinculados com opção de desvincular

## 🚨 BUGS CRÍTICOS (Sessão 2)

- [x] BUG: Compras.tsx - Quantidades Sarom/Alexandre compartilhadas entre todos os produtos da busca (mudar um muda todos)
- [x] REVISÃO: Revisar usabilidade completa de todas as páginas do site
- [x] Rastreamento.tsx migrado de localStorage para tRPC (dados persistentes)
- [x] Rota duplicada /conteiner removida (mantida apenas /containers com tRPC)

## 🆕 Novo Fluxo de Pedido (Sessão 3)

- [x] Redesenhar tela de detalhes do pedido: seletor de categoria em vez de busca por código
- [x] Ao selecionar categoria, mostrar TODOS os produtos da categoria com campos Sarom/Alexandre
- [x] Permitir preencher quantidades e adicionar múltiplos produtos de uma vez (batch save)
- [x] Manter busca por código como opção secundária

## 🔄 Importação v4 (Modificações do Usuário via Claude)

- [x] Substituir 11 arquivos do ZIP v4
- [x] Deletar usePedidosSync.ts (código morto)
- [x] Executar migration 0007_indexes_and_processos_sr.sql
- [x] Verificar compilação TypeScript sem erros
- [x] Testar /conteiner carrega sem 404
- [x] Testar Central de Compras campos editáveis
- [x] Testar Contêiner SR importar de pedido
- [x] Push para GitHub
- [x] Salvar checkpoint

## 🔄 Importação v6 (Correções do Usuário via Claude)

- [x] Extrair ZIP v6 e substituir 12 arquivos
- [x] Deletar usePedidosSync.ts (código morto)
- [x] Executar migration 0007 (tabelas já existiam da v4 - pulado)
- [x] Verificar compilação TypeScript sem erros
- [x] Testar /rastreamento carrega com pedidos confirmados e % embarque
- [x] Testar /conteiner carrega sem 404
- [x] Testar Central Sarom/Alexandre campos editáveis
- [x] Console do browser sem erros
- [x] Push para GitHub
- [x] Salvar checkpoint

## 🆕 Alerta de Pedidos Pendentes no Cabeçalho

- [x] Criar alerta visual no cabeçalho da página inicial com quantidade de pedidos com saldo pendente
- [x] Testar compilação e funcionalidade
- [x] Salvar checkpoint

## 🆕 Alerta de Saldo Pendente no Menu Principal

- [x] Adicionar alerta de saldo pendente no menu principal (tela de navegação)
- [x] Mostrar quantidade de pedidos pendentes, unidades e valor USD
- [x] Clicável para redirecionar ao Rastreamento
- [x] Testar compilação e funcionalidade
- [x] Salvar checkpoint

## 🔄 Importação v7 (Usuários + Pagamentos)

- [x] Extrair ZIP v7 e substituir 5 arquivos
- [x] Verificar compilação TypeScript sem erros (0 erros, 27 testes passando)
- [x] Testar login alexandre@asx.com.br
- [ ] Testar login frederico@asx.com.br (mesmo código de auth)
- [ ] Testar login michaelfeng89@hotmail.com (mesmo código de auth)
- [x] Testar login sarom@asxstore.com (original)
- [x] Testar /pagamentos carrega com KPIs e tabelas
- [x] Console sem erros
- [ ] Push para GitHub
- [ ] Salvar checkpoint

## 🆕 Dados Iniciais de Pagamentos

- [x] Inserir débito: "Saldo da planilha anterior" - data hoje - $56.069,63
- [x] Inserir pagamento: "Prosper ASX" - data hoje - $48.444,30
- [ ] Testar e salvar checkpoint

## 🔄 Migração localStorage → TiDB (Banco de Dados)

- [x] Criar tabelas custos_produto, estoques_usuario, preferencias_usuario no banco
- [x] Criar rotas tRPC para CRUD de custos, estoques e preferências
- [x] Criar hooks useCustosDB, useEstoqueDB, useIdiomaDB
- [x] Migrar IDs numéricos para códigos ASX no banco (51 custos migrados)
- [x] Atualizar Home.tsx para usar useCustosDB
- [x] Atualizar Configuracoes.tsx para usar useCustosDB + useIdiomaDB
- [x] Atualizar CentralCompra.tsx para usar useEstoqueDB
- [x] Atualizar CentralCompraAvancada.tsx para usar useEstoqueDB + useIdiomaDB
- [x] Atualizar Sidebar.tsx para usar useEstoqueDB + useIdiomaDB
- [x] Atualizar Conteiner.tsx para usar useIdiomaDB + useEstoqueDB
- [x] Atualizar Desenvolvimento.tsx para usar useIdiomaDB
- [x] Atualizar useAnaliseEstoque.ts e useAnaliseEstoqueSimples.ts para useCustosDB
- [x] Atualizar useEstoque.ts para importar eventos de useCustosDB
- [x] Criar hook useMigrateFromLocalStorage para migração automática
- [x] Corrigir bug: custos com IDs numéricos não apareciam (migrados para códigos ASX)
- [x] Zero erros TypeScript, 114 testes passando

## 🔄 Migração 100% localStorage → Banco de Dados

- [x] Criar tabelas para vendas/compras da CentralCompraAvancada
- [x] Migrar CentralCompraAvancada.tsx para tRPC
- [x] Criar tabela para cotação PTAX (cache)
- [x] Migrar Sidebar.tsx cotação PTAX para tRPC
- [x] Migrar DashboardLayout.tsx largura sidebar (estado local, não crítico)
- [x] Migrar useAnaliseEstoque.ts processos SR para tRPC
- [x] Migrar useAnaliseEstoqueSimples.ts processos SR para tRPC
- [x] Migrar ThemeContext.tsx tema fixo dark (sem persistência necessária)
- [x] Migrar Login.tsx "lembrar-me" (removido, sessão apenas)
- [x] Criar tabelas debitos/pagamentos para Pagamentos.tsx
- [x] Migrar Pagamentos.tsx para tRPC
- [x] Migrar Rastreamento.tsx saldo/processos para tRPC
- [x] Remover hooks antigos (useCustos.ts, useEstoque.ts, useIdioma.ts)
- [x] Remover useMigrateFromLocalStorage.ts
- [x] Verificar ZERO referências a localStorage no código (apenas auth core)
- [x] Testes passando (113/114, 1 timeout de API externa)
- [x] Implementar ordenação por código e por produto nas tabelas do dashboard

## 🔄 Migração CentralCompraAvancada → Banco de Dados
- [x] Analisar uso de localStorage na CentralCompraAvancada (vendas, compras, processos SR)
- [x] Criar tabelas no banco para vendas e compras por produto
- [x] Criar rotas tRPC para CRUD de vendas e compras
- [x] Refatorar CentralCompraAvancada para usar tRPC em vez de localStorage
- [x] Remover referências a localStorage restantes
- [x] Testar compilação e funcionalidade
- [x] Salvar checkpoint

## 💱 Cotação do Dólar - Horários Fixos
- [x] Configurar atualização da cotação do dólar apenas às 10h e 15h
- [x] Testar e validar (23 testes passando)
- [x] Salvar checkpoint

## 🐛 BUG: Total Embarcado não atualiza ao confirmar contêiner
- [x] Analisar fluxo de confirmação de contêiner
- [x] Verificar cálculo de "Total Embarcado" na Central de Compras
- [x] Sincronizar dados entre Contêiner e Central de Compras (handleConfirmarProcesso agora atualiza banco)
- [x] Testar e validar (145 testes passando)
- [x] Salvar checkpoint

## 📋 Melhoria: Visualização de Itens no Contêiner
- [x] Criar tabela clara de itens lançados no contêiner (já existia, agora com indicador visual)
- [x] Adicionar funcionalidades de edição/remoção de itens (já existem na tabela)
- [x] Melhorar layout para visualizar todos os itens antes de confirmar (altura mínima 300px)
- [x] Testar e validar (145 testes passando)
- [x] Salvar checkpoint

## 🐛 BUG: Botão Confirmar Contêiner não funciona
- [x] Investigar por que o botão "Confirmar Processo" não funciona (faltava estado de loading)
- [x] Adicionar toast de confirmação ao confirmar contêiner
- [x] Testar e validar (144/145 testes passando)

## 🔔 Feature: Toast de Confirmação
- [x] Adicionar toast ao salvar/confirmar pedidos (vendas e compras)
- [x] Adicionar toast ao confirmar contêiner
- [x] Testar e validar (144/145 testes passando)

## 🐛 BUG: Processos confirmados desaparecem da tela do Contêiner
- [x] Analisar filtro de status na tela de Contêiner
- [x] Processos confirmados devem permanecer visíveis
- [x] Corrigir lógica de filtro para mostrar todos os status (campo confirmado agora é atualizado quando status = Finalizado)
- [x] Testar e validar (149 testes passando, 4 novos testes de processoSR)
