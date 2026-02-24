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
