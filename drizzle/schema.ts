import { bigserial, integer, pgTable, text, timestamp, numeric, varchar } from "drizzle-orm/pg-core";

/**
 * Tabela de usuários (Supabase Auth + campos customizados)
 */
export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de produtos
 */
export const produtos = pgTable("produtos", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  codigo: text("codigo").notNull().unique(),
  descricao: text("descricao").notNull(),
  categoria: text("categoria").notNull(),
  unidade: text("unidade").notNull(),
  caixa: text("caixa").notNull(),
  voltagem: text("voltagem").notNull(),
  codigoBarras: text("codigoBarras").unique(),
  ncm: text("ncm"),
  custoUsd: numeric("custoUsd").default("0").notNull(),
  precoVendaBrl: numeric("precoVendaBrl").default("0").notNull(),
  descricaoCompleta: text("descricaoCompleta"),
  observacoes: text("observacoes"),
  fotoUrl: text("fotoUrl"),
  ativo: text("ativo").notNull(),
  criadoEm: timestamp("criadoEm", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm", { withTimezone: true }).defaultNow().notNull(),
});

export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = typeof produtos.$inferInsert;

/**
 * Tabela de pedidos de compra
 */
export const pedidos = pgTable("pedidos", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  nome: text("nome").notNull(),
  status: text("status").notNull(), // Pendente, Confirmado, Recebido
  dataCreacao: timestamp("dataCreacao", { withTimezone: true }).defaultNow().notNull(),
  dataAtualizacao: timestamp("dataAtualizacao", { withTimezone: true }).defaultNow().notNull(),
});

export type Pedido = typeof pedidos.$inferSelect;
export type InsertPedido = typeof pedidos.$inferInsert;

/**
 * Tabela de itens de pedidos
 */
export const itens_pedidos = pgTable("itens_pedidos", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  pedidoId: integer("pedidoId").notNull().references(() => pedidos.id, { onDelete: "cascade" }),
  produtoId: text("produtoId").notNull(),
  quantidadeSarom: integer("quantidadeSarom").notNull(),
  quantidadeAlexandre: integer("quantidadeAlexandre").notNull(),
  precoUnitario: numeric("precoUnitario").notNull(),
  dataAdicao: timestamp("dataAdicao", { withTimezone: true }).defaultNow().notNull(),
});

export type ItensPedido = typeof itens_pedidos.$inferSelect;
export type InsertItensPedido = typeof itens_pedidos.$inferInsert;

/**
 * Tabela de processos de importacao SR
 */
export const processos_sr = pgTable("processos_sr", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  numero: text("numero").notNull().unique(),
  status: text("status").notNull(), // Em andamento, Finalizado, Cancelado
  confirmado: integer("confirmado").notNull(), // 0 or 1
  dataAbertura: timestamp("dataAbertura", { withTimezone: true }).defaultNow().notNull(),
  dataFechamento: timestamp("dataFechamento", { withTimezone: true }),
  observacoes: text("observacoes"),
  criadoEm: timestamp("criadoEm", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm", { withTimezone: true }).defaultNow().notNull(),
});

export type ProcessoSR = typeof processos_sr.$inferSelect;
export type InsertProcessoSR = typeof processos_sr.$inferInsert;

/**
 * Tabela de itens de processos de importacao
 */
export const itens_processo = pgTable("itens_processo", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  processoId: integer("processoId").notNull().references(() => processos_sr.id, { onDelete: "cascade" }),
  codigoProduto: text("codigoProduto").notNull(),
  descricao: text("descricao").notNull(),
  quantidade: integer("quantidade").notNull(),
  precoUnitarioUsd: numeric("precoUnitarioUsd").notNull(),
  precoTotalUsd: numeric("precoTotalUsd").notNull(),
  criadoEm: timestamp("criadoEm", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm", { withTimezone: true }).defaultNow().notNull(),
});

export type ItemProcesso = typeof itens_processo.$inferSelect;
export type InsertItemProcesso = typeof itens_processo.$inferInsert;

/**
 * Tabela de containers
 */
export const containers = pgTable("containers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  numero: text("numero").notNull().unique(),
  status: text("status").notNull(), // Vazio, Preenchendo, Cheio, Enviado, Entregue
  capacidadeMaxima: integer("capacidadeMaxima").notNull(),
  pesoMaximo: numeric("pesoMaximo").notNull(),
  dataCreacao: timestamp("dataCreacao", { withTimezone: true }).defaultNow().notNull(),
  dataAtualizacao: timestamp("dataAtualizacao", { withTimezone: true }).defaultNow().notNull(),
});

export type Container = typeof containers.$inferSelect;
export type InsertContainer = typeof containers.$inferInsert;

/**
 * Tabela de relacionamento entre containers e pedidos
 */
export const container_pedidos = pgTable("container_pedidos", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  containerId: integer("containerId").notNull().references(() => containers.id, { onDelete: "cascade" }),
  pedidoId: integer("pedidoId").notNull().references(() => pedidos.id, { onDelete: "cascade" }),
  criadoEm: timestamp("criadoEm", { withTimezone: true }).defaultNow().notNull(),
});

export type ContainerPedido = typeof container_pedidos.$inferSelect;
export type InsertContainerPedido = typeof container_pedidos.$inferInsert;

/**
 * Tabela de logs de auditoria
 */
export const auditLogs = pgTable("auditLogs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: integer("userId").notNull(),
  acao: text("acao").notNull(),
  entidade: text("entidade").notNull(),
  entidadeId: text("entidadeId").notNull(),
  dadosAntigos: text("dadosAntigos"),
  dadosNovos: text("dadosNovos"),
  descricao: text("descricao"),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  criadoEm: timestamp("criadoEm", { withTimezone: true }).defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Tabela de debitos financeiros
 */
export const debitos = pgTable("debitos", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  descricao: text("descricao").notNull(),
  valor: numeric("valor").notNull(),
  moeda: text("moeda").default("USD").notNull(),
  dataVencimento: timestamp("dataVencimento", { withTimezone: true }).notNull(),
  pago: integer("pago").notNull(), // 0 or 1
  criadoEm: timestamp("criadoEm", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm", { withTimezone: true }).defaultNow().notNull(),
});

export type Debito = typeof debitos.$inferSelect;
export type InsertDebito = typeof debitos.$inferInsert;

/**
 * Tabela de pagamentos
 */
export const pagamentos = pgTable("pagamentos", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  debitoId: integer("debitoId").references(() => debitos.id),
  valor: numeric("valor").notNull(),
  dataPagamento: timestamp("dataPagamento", { withTimezone: true }).notNull(),
  observacoes: text("observacoes"),
  criadoEm: timestamp("criadoEm", { withTimezone: true }).defaultNow().notNull(),
});

export type Pagamento = typeof pagamentos.$inferSelect;
export type InsertPagamento = typeof pagamentos.$inferInsert;

/**
 * Tabela de estoque de produtos
 */
export const estoques = pgTable("estoques", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  produtoId: text("produtoId").notNull().unique(),
  quantidade: integer("quantidade").notNull(),
  dataAtualizacao: timestamp("dataAtualizacao", { withTimezone: true }).defaultNow().notNull(),
  criadoEm: timestamp("criadoEm", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm", { withTimezone: true }).defaultNow().notNull(),
});

export type Estoque = typeof estoques.$inferSelect;
export type InsertEstoque = typeof estoques.$inferInsert;

/**
 * Tabela de precos de produtos
 */
export const precos = pgTable("precos", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  produtoId: text("produtoId").notNull().unique(),
  custoUsd: numeric("custoUsd").notNull(),
  precoVendaBrl: numeric("precoVendaBrl").notNull(),
  criadoEm: timestamp("criadoEm", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm", { withTimezone: true }).defaultNow().notNull(),
});

export type Preco = typeof precos.$inferSelect;
export type InsertPreco = typeof precos.$inferInsert;
