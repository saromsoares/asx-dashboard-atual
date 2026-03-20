import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, bigserial, text, timestamp } from 'drizzle-orm/pg-core';
import { estoques, precos, pedidos, itens_pedidos, containers, container_pedidos, produtos, processos_sr, itens_processo, debitos, pagamentos, type InsertEstoque, type InsertPreco, type InsertPedido, type InsertItensPedido, type InsertProduto, type InsertProcessoSR, type InsertItemProcesso, type InsertDebito, type InsertPagamento } from "../drizzle/schema";
import { ENV } from './_core/env';
import { eq, desc, sql } from 'drizzle-orm';

// Users table defined locally (not in Supabase-mirrored schema)
export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role").default("user"),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }),
  criadoEm: timestamp("criadoEm", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

let _db: PostgresJsDatabase | null = null;
let _client: ReturnType<typeof postgres> | null = null;

/** The type Drizzle passes to .transaction() callbacks. */
export type Transaction = Parameters<Parameters<PostgresJsDatabase['transaction']>[0]>[0];

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL, { ssl: 'require' });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/** Obtain the DB instance or throw if unavailable. Eliminates repeated null checks. */
async function withDb(): Promise<PostgresJsDatabase> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

// Helper para executar operações em transação
export async function executeInTransaction<T>(
  callback: (tx: Transaction) => Promise<T>
): Promise<T> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(callback);
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await withDb();

  const values: InsertUser = {
    openId: user.openId,
  };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];

  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };

  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = 'admin';
    updateSet.role = 'admin';
  }

  if (!values.lastSignedIn) {
    values.lastSignedIn = new Date();
  }

  if (Object.keys(updateSet).length === 0) {
    updateSet.lastSignedIn = new Date();
  }

  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: updateSet,
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await withDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

// Estoque queries
export async function upsertEstoque(produtoId: string, quantidade: number, dataAtualizacao?: Date) {
  const db = await withDb();

  const values: InsertEstoque = {
    produtoId,
    quantidade,
    dataAtualizacao: dataAtualizacao || new Date(),
  };

  await db.insert(estoques).values(values).onConflictDoUpdate({
    target: estoques.produtoId,
    set: {
      quantidade,
      dataAtualizacao: dataAtualizacao || new Date(),
    },
  });
}

export async function getEstoque(produtoId: string) {
  const db = await withDb();
  const result = await db.select().from(estoques).where(eq(estoques.produtoId, produtoId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllEstoques() {
  const db = await withDb();
  return await db.select().from(estoques);
}

// Precos queries
export async function upsertPreco(produtoId: string, custoUsd: number, precoVendaBrl: number) {
  const db = await withDb();

  const values: InsertPreco = {
    produtoId,
    custoUsd: custoUsd.toString(),
    precoVendaBrl: precoVendaBrl.toString(),
  };

  await db.insert(precos).values(values).onConflictDoUpdate({
    target: precos.produtoId,
    set: {
      custoUsd: custoUsd.toString(),
      precoVendaBrl: precoVendaBrl.toString(),
    },
  });
}

export async function getPreco(produtoId: string) {
  const db = await withDb();
  const result = await db.select().from(precos).where(eq(precos.produtoId, produtoId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllPrecos() {
  const db = await withDb();
  return await db.select().from(precos);
}


// Pedidos queries
export async function criarPedido(nome: string) {
  const db = await withDb();

  const values: InsertPedido = {
    nome,
    status: "Pendente",
  };

  const [inserted] = await db.insert(pedidos).values(values).returning();
  return inserted;
}

export async function getPedido(pedidoId: number) {
  const db = await withDb();
  const result = await db.select().from(pedidos).where(eq(pedidos.id, pedidoId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllPedidos() {
  const db = await withDb();
  return await db.select().from(pedidos);
}

export async function atualizarStatusPedido(pedidoId: number, novoStatus: "Pendente" | "Confirmado" | "Recebido") {
  const db = await withDb();
  await db.update(pedidos).set({ status: novoStatus }).where(eq(pedidos.id, pedidoId));
  return { success: true };
}

export async function deletarPedido(pedidoId: number) {
  const db = await withDb();

  // Envolver em transação para garantir atomicidade (igual deletarContainer)
  await db.transaction(async (tx) => {
    // 1. Remover vínculos com containers
    await tx.delete(container_pedidos).where(eq(container_pedidos.pedidoId, pedidoId));
    // 2. Remover itens do pedido
    await tx.delete(itens_pedidos).where(eq(itens_pedidos.pedidoId, pedidoId));
    // 3. Remover o pedido
    await tx.delete(pedidos).where(eq(pedidos.id, pedidoId));
  });
  return { success: true };
}


// ============= ITENS DE PEDIDO =============

export async function adicionarItemPedido(pedidoId: number, produtoId: string, quantidadeSarom: number, quantidadeAlexandre: number, precoUnitario: number) {
  const db = await withDb();

  // Verificar se o item já existe no pedido
  const existente = await db.select().from(itens_pedidos)
    .where(sql`${itens_pedidos.pedidoId} = ${pedidoId} AND ${itens_pedidos.produtoId} = ${produtoId}`)
    .limit(1);

  if (existente.length > 0) {
    // Atualizar quantidades
    await db.update(itens_pedidos).set({
      quantidadeSarom,
      quantidadeAlexandre,
      precoUnitario: String(precoUnitario),
    }).where(eq(itens_pedidos.id, existente[0].id));
    return { id: existente[0].id, updated: true };
  } else {
    // Inserir novo item
    const [inserted] = await db.insert(itens_pedidos).values({
      pedidoId,
      produtoId,
      quantidadeSarom,
      quantidadeAlexandre,
      precoUnitario: String(precoUnitario),
    }).returning();
    return { id: inserted.id, updated: false };
  }
}

export async function removerItemPedido(itemId: number) {
  const db = await withDb();
  await db.delete(itens_pedidos).where(eq(itens_pedidos.id, itemId));
  return { success: true };
}

export async function getItensDoPedido(pedidoId: number) {
  const db = await withDb();
  return await db.select().from(itens_pedidos).where(eq(itens_pedidos.pedidoId, pedidoId));
}

export async function getAllItensPedidos() {
  const db = await withDb();
  return await db.select().from(itens_pedidos);
}

// ============= CONTAINERS =============

export async function criarContainer(numero: string, capacidadeMaxima: number = 0, pesoMaximo?: number) {
  const db = await withDb();

  const [inserted] = await db.insert(containers).values({
    numero,
    capacidadeMaxima,
    pesoMaximo: pesoMaximo ? String(pesoMaximo) : "0",
    status: "Vazio",
  }).returning();
  return inserted;
}

export async function getContainer(containerId: number) {
  const db = await withDb();
  const result = await db.select().from(containers).where(eq(containers.id, containerId));
  return result[0] || null;
}

export async function getAllContainers() {
  const db = await withDb();
  return await db.select().from(containers).orderBy(desc(containers.dataCreacao));
}

export async function atualizarStatusContainer(containerId: number, novoStatus: "Vazio" | "Preenchendo" | "Cheio" | "Enviado" | "Entregue") {
  const db = await withDb();
  await db.update(containers).set({ status: novoStatus }).where(eq(containers.id, containerId));
  return { success: true };
}

export async function deletarContainer(containerId: number) {
  const db = await withDb();

  // Envolver em transação para garantir atomicidade
  await db.transaction(async (tx) => {
    // Primeiro, remover todos os pedidos vinculados
    await tx.delete(container_pedidos).where(eq(container_pedidos.containerId, containerId));
    // Depois, deletar o container
    await tx.delete(containers).where(eq(containers.id, containerId));
  });
  return { success: true };
}

// ============= CONTAINER-PEDIDOS =============

export async function vincularPedidoAContainer(containerId: number, pedidoId: number) {
  const db = await withDb();

  const [inserted] = await db.insert(container_pedidos).values({
    containerId,
    pedidoId,
  }).returning();
  return { success: true, id: inserted.id };
}

export async function desvincularPedidoDoContainer(containerPedidoId: number) {
  const db = await withDb();
  await db.delete(container_pedidos).where(eq(container_pedidos.id, containerPedidoId));
  return { success: true };
}

export async function getPedidosDoContainer(containerId: number) {
  const db = await withDb();

  // JOIN com pedidos para retornar nome e status do pedido
  const result = await db
    .select({
      id: container_pedidos.id,
      containerId: container_pedidos.containerId,
      pedidoId: container_pedidos.pedidoId,
      criadoEm: container_pedidos.criadoEm,
      pedidoNome: pedidos.nome,
      pedidoStatus: pedidos.status,
    })
    .from(container_pedidos)
    .innerJoin(pedidos, eq(container_pedidos.pedidoId, pedidos.id))
    .where(eq(container_pedidos.containerId, containerId));
  return result;
}

export async function getContainersComPedidos() {
  const db = await withDb();

  // Usar LEFT JOIN + COUNT agrupado em vez de loop N+1
  const result = await db
    .select({
      id: containers.id,
      numero: containers.numero,
      status: containers.status,
      capacidadeMaxima: containers.capacidadeMaxima,
      pesoMaximo: containers.pesoMaximo,
      dataCreacao: containers.dataCreacao,
      dataAtualizacao: containers.dataAtualizacao,
      pedidosCount: sql<number>`COUNT(${container_pedidos.containerId})`,
    })
    .from(containers)
    .leftJoin(container_pedidos, eq(containers.id, container_pedidos.containerId))
    .groupBy(containers.id)
    .orderBy(desc(containers.dataCreacao));

  return result;
}


// Produtos queries
export async function importarProdutosDoArquivo() {
  const db = await withDb();

  // Importar dados de produtos do arquivo local
  const produtosData = require('../client/src/data/produtos');
  const produtosList = produtosData.produtos || [];

  if (!Array.isArray(produtosList) || produtosList.length === 0) {
    console.error("[Database] No produtos found in data file");
    return { sucesso: 0, erro: 0 };
  }

  let sucessoCount = 0;
  let erroCount = 0;

  // Envolver em transação para garantir atomicidade
  await db.transaction(async (tx) => {
    // Limpar tabela de produtos
    await tx.delete(produtos);

    // Inserir produtos
    for (const p of produtosList) {
      try {
        await tx.insert(produtos).values({
          codigo: p.codigo,
          descricao: p.descricao,
          categoria: p.categoria,
          unidade: p.unid || 'UND',
          caixa: p.caixa || 'PAR',
          voltagem: p.volt || 'BIVOLT',
          codigoBarras: p.cod_barras || null,
          ncm: p.ncm || '',
          custoUsd: String(parseFloat(p.custo_usd) || 0),
          precoVendaBrl: String(parseFloat(p.preco_venda) || 0),
          descricaoCompleta: p.descricao_completa || '',
          observacoes: p.observacoes || '',
          fotoUrl: p.foto_url || '',
          ativo: 'true',
        });
        sucessoCount++;
      } catch (error) {
        console.error(`[Database] Failed to insert produto ${p.codigo}:`, error);
        erroCount++;
      }
    }
  });

  console.log(`[Database] Importação concluída: ${sucessoCount} sucesso, ${erroCount} erro`);
  return { sucesso: sucessoCount, erro: erroCount };
}

export async function listarProdutos() {
  const db = await withDb();
  return await db.select().from(produtos);
}

export async function getProduto(produtoId: number) {
  const db = await withDb();
  const result = await db.select().from(produtos).where(eq(produtos.id, produtoId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function criarProduto(data: InsertProduto) {
  const db = await withDb();

  const [inserted] = await db.insert(produtos).values(data).returning();
  return inserted;
}

// ============= PROCESSOS SR (Importação) =============

export async function criarProcessoSR(data: InsertProcessoSR) {
  const db = await withDb();

  const [inserted] = await db.insert(processos_sr).values(data).returning();
  return inserted;
}

export async function getProcessoSR(processoId: number) {
  const db = await withDb();
  const result = await db.select().from(processos_sr).where(eq(processos_sr.id, processoId)).limit(1);
  return result[0] || null;
}

export async function getAllProcessosSR() {
  const db = await withDb();
  return await db.select().from(processos_sr).orderBy(desc(processos_sr.criadoEm));
}

export async function atualizarProcessoSR(processoId: number, data: Partial<InsertProcessoSR>) {
  const db = await withDb();
  await db.update(processos_sr).set(data).where(eq(processos_sr.id, processoId));
  return { success: true };
}

export async function atualizarStatusProcessoSR(processoId: number, novoStatus: "Em andamento" | "Finalizado" | "Cancelado") {
  const db = await withDb();
  await db.update(processos_sr).set({ status: novoStatus }).where(eq(processos_sr.id, processoId));
  return { success: true };
}

export async function deletarProcessoSR(processoId: number) {
  const db = await withDb();

  await db.transaction(async (tx) => {
    // 1. Remover itens do processo
    await tx.delete(itens_processo).where(eq(itens_processo.processoId, processoId));
    // 2. Remover o processo
    await tx.delete(processos_sr).where(eq(processos_sr.id, processoId));
  });
  return { success: true };
}

// ============= ITENS DE PROCESSO SR =============

export async function adicionarItemProcesso(processoId: number, data: Omit<InsertItemProcesso, 'processoId'>) {
  const db = await withDb();
  const [inserted] = await db.insert(itens_processo).values({ ...data, processoId }).returning();
  return { id: inserted.id, success: true };
}

export async function getItensDoProcesso(processoId: number) {
  const db = await withDb();
  return await db.select().from(itens_processo).where(eq(itens_processo.processoId, processoId));
}

export async function atualizarItemProcesso(itemId: number, data: Partial<InsertItemProcesso>) {
  const db = await withDb();
  await db.update(itens_processo).set(data).where(eq(itens_processo.id, itemId));
  return { success: true };
}

export async function removerItemProcesso(itemId: number) {
  const db = await withDb();
  await db.delete(itens_processo).where(eq(itens_processo.id, itemId));
  return { success: true };
}

// ============= DÉBITOS FINANCEIROS =============

export async function getAllDebitos() {
  const db = await withDb();
  return await db.select().from(debitos).orderBy(desc(debitos.dataVencimento));
}

export async function criarDebito(data: Omit<InsertDebito, 'id' | 'criadoEm' | 'atualizadoEm'>) {
  const db = await withDb();
  const [inserted] = await db.insert(debitos).values({
    descricao: data.descricao,
    valor: String(data.valor),
    moeda: data.moeda || 'USD',
    dataVencimento: data.dataVencimento,
    pago: data.pago,
  }).returning();
  return inserted;
}

export async function atualizarDebito(id: number, data: Partial<Omit<InsertDebito, 'id' | 'criadoEm' | 'atualizadoEm'>>) {
  const db = await withDb();
  const updateData: Record<string, unknown> = {};
  if (data.descricao !== undefined) updateData.descricao = data.descricao;
  if (data.valor !== undefined) updateData.valor = String(data.valor);
  if (data.moeda !== undefined) updateData.moeda = data.moeda;
  if (data.dataVencimento !== undefined) updateData.dataVencimento = data.dataVencimento;
  if (data.pago !== undefined) updateData.pago = data.pago;
  await db.update(debitos).set(updateData).where(eq(debitos.id, id));
  return { success: true };
}

export async function deletarDebito(id: number) {
  const db = await withDb();
  await db.delete(debitos).where(eq(debitos.id, id));
  return { success: true };
}

// ============= PAGAMENTOS =============

export async function getAllPagamentos() {
  const db = await withDb();
  return await db.select().from(pagamentos).orderBy(desc(pagamentos.dataPagamento));
}

export async function criarPagamento(data: Omit<InsertPagamento, 'id' | 'criadoEm'>) {
  const db = await withDb();
  const [inserted] = await db.insert(pagamentos).values({
    debitoId: data.debitoId,
    valor: String(data.valor),
    dataPagamento: data.dataPagamento,
    observacoes: data.observacoes || null,
  }).returning();
  return inserted;
}

export async function atualizarPagamento(id: number, data: Partial<Omit<InsertPagamento, 'id' | 'criadoEm'>>) {
  const db = await withDb();
  const updateData: Record<string, unknown> = {};
  if (data.debitoId !== undefined) updateData.debitoId = data.debitoId;
  if (data.valor !== undefined) updateData.valor = String(data.valor);
  if (data.dataPagamento !== undefined) updateData.dataPagamento = data.dataPagamento;
  if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;
  await db.update(pagamentos).set(updateData).where(eq(pagamentos.id, id));
  return { success: true };
}

export async function deletarPagamento(id: number) {
  const db = await withDb();
  await db.delete(pagamentos).where(eq(pagamentos.id, id));
  return { success: true };
}
