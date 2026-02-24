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