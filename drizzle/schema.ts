import { serial, integer, pgEnum, pgTable, text, timestamp, varchar, numeric, uniqueIndex } from "drizzle-orm/pg-core";

// Enum definitions
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const statusPedidoEnum = pgEnum("status_pedido", ["Pendente", "Confirmado", "Recebido"]);
export const statusContainerEnum = pgEnum("status_container", ["Vazio", "Preenchendo", "Cheio", "Enviado", "Entregue"]);
export const statusProcessoEnum = pgEnum("status_processo", ["Em andamento", "Finalizado", "Cancelado"]);
export const tipoPagamentoEnum = pgEnum("tipo_pagamento", ["MIC", "NAITE", "TT", "LC", "OUTRO"]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de estoque de produtos
 * Armazena quantidade de estoque por produto e data de atualização
 */
export const estoques = pgTable("estoques", {
  id: serial("id").primaryKey(),
  produtoId: varchar("produtoId", { length: 64 }).notNull().unique(), // Referência ao código do produto
  quantidade: integer("quantidade").default(0).notNull(),
  dataAtualizacao: timestamp("dataAtualizacao").defaultNow().notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().notNull(),
});

export type Estoque = typeof estoques.$inferSelect;
export type InsertEstoque = typeof estoques.$inferInsert;

/**
 * Tabela de preços de produtos
 * Armazena custo em USD e preço de venda em BRL
 */
export const precos = pgTable("precos", {
  id: serial("id").primaryKey(),
  produtoId: varchar("produtoId", { length: 64 }).notNull().unique(), // Referência ao código do produto
  custoUsd: numeric("custoUsd", { precision: 10, scale: 2 }).default("0").notNull(),
  precoVendaBrl: numeric("precoVendaBrl", { precision: 10, scale: 2 }).default("0").notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().notNull(),
});

export type Preco = typeof precos.$inferSelect;
export type InsertPreco = typeof precos.$inferInsert;

/**
 * Tabela de produtos
 * Armazena informações completas de todos os produtos
 */
export const produtos = pgTable("produtos", {
  id: serial("id").primaryKey(),
  codigo: varchar("codigo", { length: 64 }).notNull().unique(), // Ex: ASX1001
  descricao: text("descricao").notNull(),
  categoria: varchar("categoria", { length: 128 }).notNull(),
  unidade: varchar("unidade", { length: 32 }).default("UND").notNull(),
  caixa: varchar("caixa", { length: 32 }).default("PAR").notNull(),
  voltagem: varchar("voltagem", { length: 32 }).default("BIVOLT"),
  codigoBarras: varchar("codigoBarras", { length: 64 }).unique(),
  ncm: varchar("ncm", { length: 12 }),
  custoUsd: numeric("custoUsd", { precision: 10, scale: 2 }).default("0").notNull(),
  precoVendaBrl: numeric("precoVendaBrl", { precision: 10, scale: 2 }).default("0").notNull(),
  descricaoCompleta: text("descricaoCompleta"),
  observacoes: text("observacoes"),
  fotoUrl: varchar("fotoUrl", { length: 512 }),
  ativo: varchar("ativo", { length: 10 }).default("true").notNull(), // true or false
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().notNull(),
});

export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = typeof produtos.$inferInsert;

/**
 * Tabela de pedidos de compra
 * Armazena informações dos pedidos com status de progresso
 */
export const pedidos = pgTable("pedidos", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  status: statusPedidoEnum("status").default("Pendente").notNull(),
  dataCreacao: timestamp("dataCreacao").defaultNow().notNull(),
  dataAtualizacao: timestamp("dataAtualizacao").defaultNow().notNull(),
});

export type Pedido = typeof pedidos.$inferSelect;
export type InsertPedido = typeof pedidos.$inferInsert;

/**
 * Tabela de itens de pedidos
 * Armazena os produtos incluídos em cada pedido
 */
export const itens_pedidos = pgTable("itens_pedidos", {
  id: serial("id").primaryKey(),
  pedidoId: integer("pedidoId").notNull().references(() => pedidos.id, { onDelete: "cascade" }),
  produtoId: varchar("produtoId", { length: 64 }).notNull(),
  quantidadeSarom: integer("quantidadeSarom").default(0).notNull(),
  quantidadeAlexandre: integer("quantidadeAlexandre").default(0).notNull(),
  precoUnitario: numeric("precoUnitario", { precision: 10, scale: 2 }).default("0").notNull(),
  dataAdicao: timestamp("dataAdicao").defaultNow().notNull(),
});

export type ItensPedido = typeof itens_pedidos.$inferSelect;
export type InsertItensPedido = typeof itens_pedidos.$inferInsert;

/**
 * Tabela de logs de auditoria
 * Registra todas as ações realizadas no sistema para rastreabilidade
 */
export const auditLogs = pgTable("auditLogs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
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
export const containers = pgTable("containers", {
  id: serial("id").primaryKey(),
  numero: varchar("numero", { length: 64 }).notNull().unique(), // Ex: "CONT-001", "CONT-002"
  status: statusContainerEnum("status").default("Vazio").notNull(),
  capacidadeMaxima: integer("capacidadeMaxima").default(1000).notNull(), // Capacidade em unidades
  pesoMaximo: numeric("pesoMaximo", { precision: 10, scale: 2 }).default("0").notNull(), // Peso máximo em kg
  dataCreacao: timestamp("dataCreacao").defaultNow().notNull(),
  dataAtualizacao: timestamp("dataAtualizacao").defaultNow().notNull(),
});

export type Container = typeof containers.$inferSelect;
export type InsertContainer = typeof containers.$inferInsert;

/**
 * Tabela de relacionamento entre containers e pedidos
 * Armazena quais pedidos estão vinculados a cada container
 */
export const container_pedidos = pgTable("container_pedidos", {
  id: serial("id").primaryKey(),
  containerId: integer("containerId").notNull().references(() => containers.id, { onDelete: "cascade" }), // Referência ao container
  pedidoId: integer("pedidoId").notNull().references(() => pedidos.id, { onDelete: "cascade" }), // Referência ao pedido
  sequencia: integer("sequencia").default(0).notNull(), // Ordem de inclusão no container
  dataVinculacao: timestamp("dataVinculacao").defaultNow().notNull(),
  dataAtualizacao: timestamp("dataAtualizacao").defaultNow().notNull(),
}, (table) => ({
  containerPedidoUnique: uniqueIndex("container_pedido_unique").on(table.containerId, table.pedidoId),
}));

export type ContainerPedido = typeof container_pedidos.$inferSelect;
export type InsertContainerPedido = typeof container_pedidos.$inferInsert;

/**
 * Tabela de processos de importação SR
 * Armazena processos com invoice, NCM e dados de embarque
 * (Migração de localStorage para banco de dados)
 */
export const processos_sr = pgTable("processos_sr", {
  id: serial("id").primaryKey(),
  numeroProcesso: varchar("numeroProcesso", { length: 64 }).notNull().unique(),
  nomeInvoice: varchar("nomeInvoice", { length: 255 }).default("").notNull(),
  dataProcesso: varchar("dataProcesso", { length: 32 }).default("").notNull(),
  observacoes: text("observacoes"),
  ncm: varchar("ncm", { length: 20 }).default(""),
  status: statusProcessoEnum("status").default("Em andamento").notNull(),
  confirmado: integer("confirmado").default(0).notNull(), // 0 = false, 1 = true
  caixasPapelao: integer("caixasPapelao").default(0).notNull(),
  pesoBrutoKg: numeric("pesoBrutoKg", { precision: 10, scale: 2 }).default("0").notNull(),
  pesoLiquidoKg: numeric("pesoLiquidoKg", { precision: 10, scale: 2 }).default("0").notNull(),
  cbm: numeric("cbm", { precision: 10, scale: 4 }).default("0").notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().notNull(),
});

export type ProcessoSR = typeof processos_sr.$inferSelect;
export type InsertProcessoSR = typeof processos_sr.$inferInsert;

/**
 * Tabela de itens de processos de importação
 * Armazena os produtos incluídos em cada processo SR
 */
export const itens_processo = pgTable("itens_processo", {
  id: serial("id").primaryKey(),
  processoId: integer("processoId").notNull().references(() => processos_sr.id, { onDelete: "cascade" }), // Referência ao processo SR
  codigo: varchar("codigo", { length: 64 }).notNull(),
  descricao: text("descricao").notNull(),
  unidade: varchar("unidade", { length: 32 }).default("UND").notNull(),
  quantidade: integer("quantidade").default(0).notNull(),
  precoUnitarioDolar: numeric("precoUnitarioDolar", { precision: 10, scale: 2 }).default("0").notNull(),
  precoTotalDolar: numeric("precoTotalDolar", { precision: 10, scale: 2 }).default("0").notNull(),
  pedidoSarom: integer("pedidoSarom").default(0).notNull(),
  pedidoAlexandre: integer("pedidoAlexandre").default(0).notNull(),
  ordemCompra: varchar("ordemCompra", { length: 64 }).default("").notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().notNull(),
});

export type ItemProcesso = typeof itens_processo.$inferSelect;
export type InsertItemProcesso = typeof itens_processo.$inferInsert;

/**
 * Tabela de débitos financeiros
 */
export const debitos = pgTable("debitos", {
  id: serial("id").primaryKey(),
  data: varchar("data", { length: 10 }).notNull(), // YYYY-MM-DD
  ordem: varchar("ordem", { length: 255 }).notNull(),
  valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().notNull(),
});

export type Debito = typeof debitos.$inferSelect;
export type InsertDebito = typeof debitos.$inferInsert;

/**
 * Tabela de pagamentos recebidos
 */
export const pagamentos_registros = pgTable("pagamentos_registros", {
  id: serial("id").primaryKey(),
  data: varchar("data", { length: 10 }).notNull(), // YYYY-MM-DD
  remetente: varchar("remetente", { length: 255 }).notNull(),
  valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
  tipo: tipoPagamentoEnum("tipo").default("TT").notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().notNull(),
});

export type PagamentoRegistro = typeof pagamentos_registros.$inferSelect;
export type InsertPagamentoRegistro = typeof pagamentos_registros.$inferInsert;
