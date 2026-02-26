import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de estoque de produtos
 * Armazena quantidade de estoque por produto e data de atualização
 */
export const estoques = mysqlTable("estoques", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: varchar("produtoId", { length: 64 }).notNull().unique(), // Referência ao código do produto
  quantidade: int("quantidade").default(0).notNull(),
  dataAtualizacao: timestamp("dataAtualizacao").defaultNow().notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type Estoque = typeof estoques.$inferSelect;
export type InsertEstoque = typeof estoques.$inferInsert;

/**
 * Tabela de preços de produtos
 * Armazena custo em USD e preço de venda em BRL
 */
export const precos = mysqlTable("precos", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: varchar("produtoId", { length: 64 }).notNull().unique(), // Referência ao código do produto
  custoUsd: decimal("custoUsd", { precision: 10, scale: 2 }).default("0").notNull(),
  precoVendaBrl: decimal("precoVendaBrl", { precision: 10, scale: 2 }).default("0").notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type Preco = typeof precos.$inferSelect;
export type InsertPreco = typeof precos.$inferInsert;

/**
 * Tabela de produtos
 * Armazena informações completas de todos os produtos
 */
export const produtos = mysqlTable("produtos", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 64 }).notNull().unique(), // Ex: ASX1001
  descricao: text("descricao").notNull(),
  categoria: varchar("categoria", { length: 128 }).notNull(),
  unidade: varchar("unidade", { length: 32 }).default("UND").notNull(),
  caixa: varchar("caixa", { length: 32 }).default("PAR").notNull(),
  voltagem: varchar("voltagem", { length: 32 }).default("BIVOLT"),
  codigoBarras: varchar("codigoBarras", { length: 64 }).unique(),
  ncm: varchar("ncm", { length: 12 }),
  custoUsd: decimal("custoUsd", { precision: 10, scale: 2 }).default("0").notNull(),
  precoVendaBrl: decimal("precoVendaBrl", { precision: 10, scale: 2 }).default("0").notNull(),
  descricaoCompleta: text("descricaoCompleta"),
  observacoes: text("observacoes"),
  fotoUrl: varchar("fotoUrl", { length: 512 }),
  ativo: varchar("ativo", { length: 10 }).default("true").notNull(), // true or false
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = typeof produtos.$inferInsert;

/**
 * Tabela de pedidos de compra
 * Armazena informações dos pedidos com status de progresso
 */
export const pedidos = mysqlTable("pedidos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["Pendente", "Confirmado", "Recebido"]).default("Pendente").notNull(),
  dataCreacao: timestamp("dataCreacao").defaultNow().notNull(),
  dataAtualizacao: timestamp("dataAtualizacao").defaultNow().onUpdateNow().notNull(),
});

export type Pedido = typeof pedidos.$inferSelect;
export type InsertPedido = typeof pedidos.$inferInsert;

/**
 * Tabela de itens de pedidos
 * Armazena os produtos incluídos em cada pedido
 */
export const itens_pedidos = mysqlTable("itens_pedidos", {
  id: int("id").autoincrement().primaryKey(),
  pedidoId: int("pedidoId").notNull(),
  produtoId: varchar("produtoId", { length: 64 }).notNull(),
  quantidadeSarom: int("quantidadeSarom").default(0).notNull(),
  quantidadeAlexandre: int("quantidadeAlexandre").default(0).notNull(),
  precoUnitario: decimal("precoUnitario", { precision: 10, scale: 2 }).default("0").notNull(),
  dataAdicao: timestamp("dataAdicao").defaultNow().notNull(),
});

export type ItensPedido = typeof itens_pedidos.$inferSelect;
export type InsertItensPedido = typeof itens_pedidos.$inferInsert;

/**
 * Tabela de logs de auditoria
 * Registra todas as ações realizadas no sistema para rastreabilidade
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  acao: varchar("acao", { length: 255 }).notNull(), // Ex: "criou_pedido", "atualizou_status", "deletou_item"
  entidade: varchar("entidade", { length: 64 }).notNull(), // Ex: "pedido", "item_pedido", "estoque"
  entidadeId: varchar("entidadeId", { length: 64 }).notNull(), // ID do registro afetado
  dadosAntigos: text("dadosAntigos"), // JSON com dados anteriores (para comparação)
  dadosNovos: text("dadosNovos"), // JSON com novos dados
  descricao: text("descricao"), // Descrição legível da ação
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 ou IPv6
  userAgent: text("userAgent"), // Navegador/cliente
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Tabela de containers
 * Armazena informações de containers que recebem pedidos
 */
export const containers = mysqlTable("containers", {
  id: int("id").autoincrement().primaryKey(),
  numero: varchar("numero", { length: 64 }).notNull().unique(), // Ex: "CONT-001", "CONT-002"
  status: mysqlEnum("status", ["Vazio", "Preenchendo", "Cheio", "Enviado", "Entregue"]).default("Vazio").notNull(),
  capacidadeMaxima: int("capacidadeMaxima").default(1000).notNull(), // Capacidade em unidades
  pesoMaximo: decimal("pesoMaximo", { precision: 10, scale: 2 }).default("0").notNull(), // Peso máximo em kg
  dataCreacao: timestamp("dataCreacao").defaultNow().notNull(),
  dataAtualizacao: timestamp("dataAtualizacao").defaultNow().onUpdateNow().notNull(),
});

export type Container = typeof containers.$inferSelect;
export type InsertContainer = typeof containers.$inferInsert;

/**
 * Tabela de relacionamento entre containers e pedidos
 * Armazena quais pedidos estão vinculados a cada container
 */
export const container_pedidos = mysqlTable("container_pedidos", {
  id: int("id").autoincrement().primaryKey(),
  containerId: int("containerId").notNull(), // Referência ao container
  pedidoId: int("pedidoId").notNull(), // Referência ao pedido
  sequencia: int("sequencia").default(0).notNull(), // Ordem de inclusão no container
  dataVinculacao: timestamp("dataVinculacao").defaultNow().notNull(),
  dataAtualizacao: timestamp("dataAtualizacao").defaultNow().onUpdateNow().notNull(),
});

export type ContainerPedido = typeof container_pedidos.$inferSelect;
export type InsertContainerPedido = typeof container_pedidos.$inferInsert;

/**
 * Tabela de processos de importação SR
 * Armazena processos com invoice, NCM e dados de embarque
 * (Migração de localStorage para banco de dados)
 */
export const processos_sr = mysqlTable("processos_sr", {
  id: int("id").autoincrement().primaryKey(),
  numeroProcesso: varchar("numeroProcesso", { length: 64 }).notNull().unique(),
  nomeInvoice: varchar("nomeInvoice", { length: 255 }).default("").notNull(),
  dataProcesso: varchar("dataProcesso", { length: 32 }).default("").notNull(),
  observacoes: text("observacoes"),
  ncm: varchar("ncm", { length: 20 }).default(""),
  status: mysqlEnum("status", ["Em andamento", "Finalizado", "Cancelado"]).default("Em andamento").notNull(),
  confirmado: int("confirmado").default(0).notNull(), // 0 = false, 1 = true
  caixasPapelao: int("caixasPapelao").default(0).notNull(),
  pesoBrutoKg: decimal("pesoBrutoKg", { precision: 10, scale: 2 }).default("0").notNull(),
  pesoLiquidoKg: decimal("pesoLiquidoKg", { precision: 10, scale: 2 }).default("0").notNull(),
  cbm: decimal("cbm", { precision: 10, scale: 4 }).default("0").notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type ProcessoSR = typeof processos_sr.$inferSelect;
export type InsertProcessoSR = typeof processos_sr.$inferInsert;

/**
 * Tabela de itens de processos de importação
 * Armazena os produtos incluídos em cada processo SR
 */
export const itens_processo = mysqlTable("itens_processo", {
  id: int("id").autoincrement().primaryKey(),
  processoId: int("processoId").notNull(), // Referência ao processo SR
  codigo: varchar("codigo", { length: 64 }).notNull(),
  descricao: text("descricao").notNull(),
  unidade: varchar("unidade", { length: 32 }).default("UND").notNull(),
  quantidade: int("quantidade").default(0).notNull(),
  precoUnitarioDolar: decimal("precoUnitarioDolar", { precision: 10, scale: 2 }).default("0").notNull(),
  precoTotalDolar: decimal("precoTotalDolar", { precision: 10, scale: 2 }).default("0").notNull(),
  pedidoSarom: int("pedidoSarom").default(0).notNull(),
  pedidoAlexandre: int("pedidoAlexandre").default(0).notNull(),
  ordemCompra: varchar("ordemCompra", { length: 64 }).default("").notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type ItemProcesso = typeof itens_processo.$inferSelect;
export type InsertItemProcesso = typeof itens_processo.$inferInsert;

/**
 * Tabela de preferências do usuário
 * Armazena taxa de câmbio customizada e outras preferências por usuário
 */
export const preferencias_usuario = mysqlTable("preferencias_usuario", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  taxaCambioCustomizada: decimal("taxaCambioCustomizada", { precision: 10, scale: 4 }).default("8.50").notNull(), // Taxa USD/BRL customizada
  usarTaxaCustomizada: int("usarTaxaCustomizada").default(0).notNull(), // 0 = usar API, 1 = usar customizada
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type PreferenciaUsuario = typeof preferencias_usuario.$inferSelect;
export type InsertPreferenciaUsuario = typeof preferencias_usuario.$inferInsert;

/**
 * Tabela de estoques por usuário
 * Armazena quantidade de estoque específica para cada usuário (Sarom, Alexandre, etc)
 */
export const estoques_usuario = mysqlTable("estoques_usuario", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  produtoId: varchar("produtoId", { length: 64 }).notNull(),
  quantidade: int("quantidade").default(0).notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type EstoqueUsuario = typeof estoques_usuario.$inferSelect;
export type InsertEstoqueUsuario = typeof estoques_usuario.$inferInsert;

/**
 * Tabela de custos em USD por produto
 * Armazena o custo em dólar de cada produto (migrado do localStorage)
 */
export const custos_produto = mysqlTable("custos_produto", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: varchar("produtoId", { length: 64 }).notNull().unique(),
  custoUsd: decimal("custoUsd", { precision: 10, scale: 2 }).default("0").notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type CustoProduto = typeof custos_produto.$inferSelect;
export type InsertCustoProduto = typeof custos_produto.$inferInsert;

/**
 * Tabela de débitos financeiros
 * Armazena débitos da operação (faturas, saldos anteriores, etc)
 */
export const debitos = mysqlTable("debitos", {
  id: int("id").autoincrement().primaryKey(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  valor: decimal("valor", { precision: 12, scale: 2 }).default("0").notNull(),
  data: varchar("data", { length: 32 }).notNull(), // YYYY-MM-DD
  observacoes: text("observacoes"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type Debito = typeof debitos.$inferSelect;
export type InsertDebito = typeof debitos.$inferInsert;

/**
 * Tabela de pagamentos
 * Armazena pagamentos realizados
 */
export const pagamentos = mysqlTable("pagamentos", {
  id: int("id").autoincrement().primaryKey(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  valor: decimal("valor", { precision: 12, scale: 2 }).default("0").notNull(),
  data: varchar("data", { length: 32 }).notNull(), // YYYY-MM-DD
  observacoes: text("observacoes"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type Pagamento = typeof pagamentos.$inferSelect;
export type InsertPagamento = typeof pagamentos.$inferInsert;

/**
 * Tabela de vendas por produto (Central de Compras Avançada)
 * Armazena dados de venda trimestral por produto
 */
export const vendas_produto = mysqlTable("vendas_produto", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: varchar("produtoId", { length: 64 }).notNull().unique(),
  vendaTrimestre: int("vendaTrimestre").default(0).notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type VendaProduto = typeof vendas_produto.$inferSelect;
export type InsertVendaProduto = typeof vendas_produto.$inferInsert;

/**
 * Tabela de compras por produto (Central de Compras Avançada)
 * Armazena dados de compra por produto
 */
export const compras_produto = mysqlTable("compras_produto", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: varchar("produtoId", { length: 64 }).notNull().unique(),
  quantidadeCompra: int("quantidadeCompra").default(0).notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type CompraProduto = typeof compras_produto.$inferSelect;
export type InsertCompraProduto = typeof compras_produto.$inferInsert;

/**
 * Tabela de cotação PTAX (cache)
 * Armazena última cotação do dólar PTAX para evitar chamadas excessivas à API
 */
export const cotacao_ptax = mysqlTable("cotacao_ptax", {
  id: int("id").autoincrement().primaryKey(),
  compra: decimal("compra", { precision: 10, scale: 4 }).default("0").notNull(),
  venda: decimal("venda", { precision: 10, scale: 4 }).default("0").notNull(),
  dataHoraCotacao: varchar("dataHoraCotacao", { length: 64 }).default("").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type CotacaoPtax = typeof cotacao_ptax.$inferSelect;
export type InsertCotacaoPtax = typeof cotacao_ptax.$inferInsert;

/**
 * Tabela de saldo de embarque por processo
 * Armazena saldo pendente de cada processo SR
 */
export const saldo_embarque = mysqlTable("saldo_embarque", {
  id: int("id").autoincrement().primaryKey(),
  processoId: varchar("processoId", { length: 64 }).notNull().unique(), // número do processo
  saldoUnidades: int("saldoUnidades").default(0).notNull(),
  saldoValorUsd: decimal("saldoValorUsd", { precision: 12, scale: 2 }).default("0").notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type SaldoEmbarque = typeof saldo_embarque.$inferSelect;
export type InsertSaldoEmbarque = typeof saldo_embarque.$inferInsert;

/**
 * Tabela de configuração JSON genérica
 * Armazena dados JSON arbitrários por chave (ex: saldo_embarques, configurações)
 */
export const config_json = mysqlTable("config_json", {
  id: int("id").autoincrement().primaryKey(),
  chave: varchar("chave", { length: 128 }).notNull().unique(),
  dados: text("dados").notNull(), // JSON stringified
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type ConfigJson = typeof config_json.$inferSelect;
export type InsertConfigJson = typeof config_json.$inferInsert;


/**
 * Tabela de processos de garantia
 * Armazena processos de garantia por empresa (Sarom/Alexandre)
 */
export const garantias_processo = mysqlTable("garantias_processo", {
  id: int("id").autoincrement().primaryKey(),
  usuarioId: varchar("usuarioId", { length: 255 }).notNull(), // sarom@asxstore.com ou alexandre@asx.com.br
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type GarantiaProcesso = typeof garantias_processo.$inferSelect;
export type InsertGarantiaProcesso = typeof garantias_processo.$inferInsert;

/**
 * Tabela de itens de garantia
 * Armazena produtos em garantia com quantidade, valor unitário, observação e status
 */
export const garantias_item = mysqlTable("garantias_item", {
  id: int("id").autoincrement().primaryKey(),
  processoId: int("processoId").notNull().references(() => garantias_processo.id, { onDelete: "cascade" }),
  codigoProduto: varchar("codigoProduto", { length: 50 }).notNull(), // Código ASX do produto
  quantidade: int("quantidade").notNull().default(1),
  precoUnitarioDolar: decimal("precoUnitarioDolar", { precision: 10, scale: 2 }).notNull().default("0"),
  precoTotalDolar: decimal("precoTotalDolar", { precision: 12, scale: 2 }).notNull().default("0"),
  observacao: text("observacao"), // Descrição do defeito e lote
  status: varchar("status", { length: 50 }).notNull().default("Em Análise"), // Ok, Em Análise, Pendente, Cancelado
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
});

export type GarantiaItem = typeof garantias_item.$inferSelect;
export type InsertGarantiaItem = typeof garantias_item.$inferInsert;
