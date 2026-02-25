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
