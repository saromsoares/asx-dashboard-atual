import { drizzle } from 'drizzle-orm/mysql2';
import * as garantias_schema from '../drizzle/schema';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { InsertUser, users, estoques, precos, pedidos, itens_pedidos, containers, container_pedidos, produtos, processos_sr, itens_processo, preferencias_usuario, estoques_usuario, custos_produto, garantias_processo, garantias_item, type InsertEstoque, type InsertPreco, type InsertPedido, type InsertItensPedido, type InsertProduto, type InsertProcessoSR, type InsertItemProcesso, type InsertPreferenciaUsuario, type InsertEstoqueUsuario, type InsertCustoProduto } from "../drizzle/schema";
import { ENV } from './_core/env';
import { eq, desc, sql } from 'drizzle-orm';

let _db: MySql2Database | null = null;

export type Transaction = any; // TODO: Tipagem correta de transação Drizzle

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
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

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
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

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

// Estoque queries
export async function upsertEstoque(produtoId: string, quantidade: number, dataAtualizacao?: Date) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert estoque: database not available");
    return;
  }

  try {
    const values: InsertEstoque = {
      produtoId,
      quantidade,
      dataAtualizacao: dataAtualizacao || new Date(),
    };

    await db.insert(estoques).values(values).onDuplicateKeyUpdate({
      set: {
        quantidade,
        dataAtualizacao: dataAtualizacao || new Date(),
      },
    });
  } catch (error) {
    console.error("[Database] Failed to upsert estoque:", error);
    throw error;
  }
}

export async function getEstoque(produtoId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get estoque: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(estoques).where(eq(estoques.produtoId, produtoId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get estoque:", error);
    return undefined;
  }
}

export async function getAllEstoques() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get estoques: database not available");
    return [];
  }

  try {
    return await db.select().from(estoques);
  } catch (error) {
    console.error("[Database] Failed to get estoques:", error);
    return [];
  }
}

// Precos queries
export async function upsertPreco(produtoId: string, custoUsd: number, precoVendaBrl: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert preco: database not available");
    return;
  }

  try {
    const values: InsertPreco = {
      produtoId,
      custoUsd: custoUsd.toString(),
      precoVendaBrl: precoVendaBrl.toString(),
    };

    await db.insert(precos).values(values).onDuplicateKeyUpdate({
      set: {
        custoUsd: custoUsd.toString(),
        precoVendaBrl: precoVendaBrl.toString(),
      },
    });
  } catch (error) {
    console.error("[Database] Failed to upsert preco:", error);
    throw error;
  }
}

export async function getPreco(produtoId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get preco: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(precos).where(eq(precos.produtoId, produtoId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get preco:", error);
    return undefined;
  }
}

export async function getAllPrecos() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get precos: database not available");
    return [];
  }

  try {
    return await db.select().from(precos);
  } catch (error) {
    console.error("[Database] Failed to get precos:", error);
    return [];
  }
}


// Pedidos queries
export async function criarPedido(nome: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create pedido: database not available");
    return undefined;
  }

  try {
    const values: InsertPedido = {
      nome,
      status: "Pendente",
    };

    const result = await db.insert(pedidos).values(values);
    // Usar insertId em vez de buscar por nome (evita duplicatas)
    const insertId = result[0].insertId;
    const pedidoCriado = await db.select().from(pedidos).where(eq(pedidos.id, insertId)).limit(1);
    return pedidoCriado[0];
  } catch (error) {
    console.error("[Database] Failed to create pedido:", error);
    throw error;
  }
}

export async function getPedido(pedidoId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get pedido: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(pedidos).where(eq(pedidos.id, pedidoId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get pedido:", error);
    return undefined;
  }
}

export async function getAllPedidos() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get pedidos: database not available");
    return [];
  }

  try {
    return await db.select().from(pedidos);
  } catch (error) {
    console.error("[Database] Failed to get pedidos:", error);
    return [];
  }
}

export async function atualizarStatusPedido(pedidoId: number, novoStatus: "Pendente" | "Confirmado" | "Recebido") {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update pedido status: database not available");
    return;
  }

  try {
    await db.update(pedidos).set({ status: novoStatus }).where(eq(pedidos.id, pedidoId));
    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to update pedido status:", error);
    throw error;
  }
}

export async function deletarPedido(pedidoId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete pedido: database not available");
    return;
  }

  try {
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
  } catch (error) {
    console.error("[Database] Failed to delete pedido:", error);
    throw error;
  }
}


// ============= ITENS DE PEDIDO =============

export async function adicionarItemPedido(pedidoId: number, produtoId: string, quantidadeSarom: number, quantidadeAlexandre: number, precoUnitario: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add item to pedido: database not available");
    return null;
  }

  try {
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
      const result = await db.insert(itens_pedidos).values({
        pedidoId,
        produtoId,
        quantidadeSarom,
        quantidadeAlexandre,
        precoUnitario: String(precoUnitario),
      });
      return { id: result[0].insertId, updated: false };
    }
  } catch (error) {
    console.error("[Database] Failed to add item to pedido:", error);
    throw error;
  }
}

export async function removerItemPedido(itemId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot remove item from pedido: database not available");
    return;
  }

  try {
    await db.delete(itens_pedidos).where(eq(itens_pedidos.id, itemId));
    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to remove item from pedido:", error);
    throw error;
  }
}

export async function getItensDoPedido(pedidoId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get items of pedido: database not available");
    return [];
  }

  try {
    return await db.select().from(itens_pedidos).where(eq(itens_pedidos.pedidoId, pedidoId));
  } catch (error) {
    console.error("[Database] Failed to get items of pedido:", error);
    return [];
  }
}

export async function getAllItensPedidos() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get all itens pedidos: database not available");
    return [];
  }

  try {
    return await db.select().from(itens_pedidos);
  } catch (error) {
    console.error("[Database] Failed to get all itens pedidos:", error);
    return [];
  }
}

// ============= CONTAINERS =============

export async function criarContainer(numero: string, capacidadeMaxima?: number, pesoMaximo?: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create container: database not available");
    return null;
  }

  try {
    const result = await db.insert(containers).values({
      numero,
      capacidadeMaxima,
      pesoMaximo: pesoMaximo ? String(pesoMaximo) : "0",
      status: "Vazio",
    });
    return { id: result[0].insertId, numero, status: "Vazio" };
  } catch (error) {
    console.error("[Database] Failed to create container:", error);
    throw error;
  }
}

export async function getContainer(containerId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get container: database not available");
    return null;
  }

  try {
    const result = await db.select().from(containers).where(eq(containers.id, containerId));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get container:", error);
    return null;
  }
}

export async function getAllContainers() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get containers: database not available");
    return [];
  }

  try {
    return await db.select().from(containers).orderBy(desc(containers.dataCreacao));
  } catch (error) {
    console.error("[Database] Failed to get containers:", error);
    return [];
  }
}

export async function atualizarStatusContainer(containerId: number, novoStatus: "Vazio" | "Preenchendo" | "Cheio" | "Enviado" | "Entregue") {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update container status: database not available");
    return;
  }

  try {
    await db.update(containers).set({ status: novoStatus }).where(eq(containers.id, containerId));
    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to update container status:", error);
    throw error;
  }
}

export async function deletarContainer(containerId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete container: database not available");
    return;
  }

  try {
    // Envolver em transação para garantir atomicidade
    await db.transaction(async (tx) => {
      // Primeiro, remover todos os pedidos vinculados
      await tx.delete(container_pedidos).where(eq(container_pedidos.containerId, containerId));
      // Depois, deletar o container
      await tx.delete(containers).where(eq(containers.id, containerId));
    });
    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to delete container:", error);
    throw error;
  }
}

// ============= CONTAINER-PEDIDOS =============

export async function vincularPedidoAContainer(containerId: number, pedidoId: number, sequencia: number = 0) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot link pedido to container: database not available");
    return null;
  }

  try {
    const result = await db.insert(container_pedidos).values({
      containerId,
      pedidoId,
      sequencia,
    });
    return { success: true, id: result[0].insertId };
  } catch (error) {
    console.error("[Database] Failed to link pedido to container:", error);
    throw error;
  }
}

export async function desvincularPedidoDoContainer(containerPedidoId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot unlink pedido from container: database not available");
    return;
  }

  try {
    await db.delete(container_pedidos).where(eq(container_pedidos.id, containerPedidoId));
    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to unlink pedido from container:", error);
    throw error;
  }
}

export async function getPedidosDoContainer(containerId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get container pedidos: database not available");
    return [];
  }

  try {
    // JOIN com pedidos para retornar nome e status do pedido
    const result = await db
      .select({
        id: container_pedidos.id,
        containerId: container_pedidos.containerId,
        pedidoId: container_pedidos.pedidoId,
        sequencia: container_pedidos.sequencia,
        dataVinculacao: container_pedidos.dataVinculacao,
        pedidoNome: pedidos.nome,
        pedidoStatus: pedidos.status,
      })
      .from(container_pedidos)
      .innerJoin(pedidos, eq(container_pedidos.pedidoId, pedidos.id))
      .where(eq(container_pedidos.containerId, containerId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get container pedidos:", error);
    return [];
  }
}

export async function getContainersComPedidos() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get containers with pedidos: database not available");
    return [];
  }

  try {
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
  } catch (error) {
    console.error("[Database] Failed to get containers with pedidos:", error);
    return [];
  }
}


// Produtos queries
export async function importarProdutosDoArquivo() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot import produtos: database not available");
    return { sucesso: 0, erro: 0 };
  }

  try {
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
            ncm: p.ncm || null,
            custoUsd: String(parseFloat(p.custo_usd) || 0),
            precoVendaBrl: String(parseFloat(p.preco_venda) || 0),
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
  } catch (error) {
    console.error("[Database] Failed to import produtos:", error);
    return { sucesso: 0, erro: 0 };
  }
}

export async function listarProdutos() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot list produtos: database not available");
    return [];
  }

  try {
    return await db.select().from(produtos);
  } catch (error) {
    console.error("[Database] Failed to list produtos:", error);
    return [];
  }
}

export async function getProduto(produtoId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get produto: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(produtos).where(eq(produtos.id, produtoId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get produto:", error);
    return undefined;
  }
}

export async function criarProduto(data: InsertProduto) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create produto: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(produtos).values(data);
    // Usar insertId em vez de buscar por código (evita race condition)
    const insertId = result[0].insertId;
    const produtoCriado = await db.select().from(produtos).where(eq(produtos.id, insertId)).limit(1);
    return produtoCriado[0];
  } catch (error) {
    console.error("[Database] Failed to create produto:", error);
    throw error;
  }
}

// ============= PROCESSOS SR (Importação) =============

export async function criarProcessoSR(data: InsertProcessoSR) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create processo SR: database not available");
    return null;
  }

  try {
    const result = await db.insert(processos_sr).values(data);
    const insertId = result[0].insertId;
    const processoCriado = await db.select().from(processos_sr).where(eq(processos_sr.id, insertId)).limit(1);
    return processoCriado[0];
  } catch (error) {
    console.error("[Database] Failed to create processo SR:", error);
    throw error;
  }
}

export async function getProcessoSR(processoId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select().from(processos_sr).where(eq(processos_sr.id, processoId)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get processo SR:", error);
    return null;
  }
}

export async function getAllProcessosSR() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(processos_sr).orderBy(desc(processos_sr.criadoEm));
  } catch (error) {
    console.error("[Database] Failed to get processos SR:", error);
    return [];
  }
}

export async function atualizarProcessoSR(processoId: number, data: Partial<InsertProcessoSR>) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.update(processos_sr).set(data).where(eq(processos_sr.id, processoId));
    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to update processo SR:", error);
    throw error;
  }
}

export async function atualizarStatusProcessoSR(processoId: number, novoStatus: "Em andamento" | "Finalizado" | "Cancelado") {
  const db = await getDb();
  if (!db) return null;

  try {
    // Quando o status muda para "Finalizado", marcar como confirmado
    const confirmado = novoStatus === "Finalizado" ? 1 : 0;
    await db.update(processos_sr).set({ status: novoStatus, confirmado }).where(eq(processos_sr.id, processoId));
    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to update processo SR status:", error);
    throw error;
  }
}

export async function deletarProcessoSR(processoId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.transaction(async (tx) => {
      // 1. Remover itens do processo
      await tx.delete(itens_processo).where(eq(itens_processo.processoId, processoId));
      // 2. Remover o processo
      await tx.delete(processos_sr).where(eq(processos_sr.id, processoId));
    });
    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to delete processo SR:", error);
    throw error;
  }
}

// ============= ITENS DE PROCESSO SR =============

export async function adicionarItemProcesso(processoId: number, data: Omit<InsertItemProcesso, 'processoId'>) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(itens_processo).values({ ...data, processoId });
    return { id: result[0].insertId, success: true };
  } catch (error) {
    console.error("[Database] Failed to add item to processo:", error);
    throw error;
  }
}

export async function getItensDoProcesso(processoId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(itens_processo).where(eq(itens_processo.processoId, processoId));
  } catch (error) {
    console.error("[Database] Failed to get items of processo:", error);
    return [];
  }
}

export async function atualizarItemProcesso(itemId: number, data: Partial<InsertItemProcesso>) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.update(itens_processo).set(data).where(eq(itens_processo.id, itemId));
    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to update item processo:", error);
    throw error;
  }
}

/** Buscar um item de processo pelo ID */
export async function getItemProcessoById(itemId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select().from(itens_processo).where(eq(itens_processo.id, itemId)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get item processo:", error);
    return null;
  }
}

/** Listar todos os itens de todos os processos */
export async function getAllItensProcesso() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(itens_processo);
  } catch (error) {
    console.error("[Database] Failed to get all items processo:", error);
    return [];
  }
}

export async function removerItemProcesso(itemId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.delete(itens_processo).where(eq(itens_processo.id, itemId));
    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to remove item from processo:", error);
    throw error;
  }
}


// ============================================
// FUNÇÕES PARA MIGRAÇÃO DE LOCALSTORAGE
// ============================================

/**
 * Obter preferências do usuário (taxa de câmbio customizada, etc)
 */
export async function getPreferenciaUsuario(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select().from(preferencias_usuario).where(eq(preferencias_usuario.userId, userId)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get user preferences:", error);
    return null;
  }
}

/**
 * Atualizar ou criar preferências do usuário
 */
export async function upsertPreferenciaUsuario(userId: number, data: Partial<InsertPreferenciaUsuario>) {
  const db = await getDb();
  if (!db) return null;

  try {
    const existing = await getPreferenciaUsuario(userId);
    
    if (existing) {
      await db.update(preferencias_usuario)
        .set({ ...data, atualizadoEm: new Date() })
        .where(eq(preferencias_usuario.userId, userId));
    } else {
      await db.insert(preferencias_usuario).values({
        userId,
        ...data,
      });
    }
    
    return await getPreferenciaUsuario(userId);
  } catch (error) {
    console.error("[Database] Failed to upsert user preferences:", error);
    throw error;
  }
}

/**
 * Obter estoque de um produto para um usuário específico
 */
export async function getEstoqueUsuario(userId: number, produtoId: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select().from(estoques_usuario)
      .where(sql`${estoques_usuario.userId} = ${userId} AND ${estoques_usuario.produtoId} = ${produtoId}`)
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get user estoque:", error);
    return null;
  }
}

/**
 * Listar todos os estoques de um usuário
 */
export async function listEstoquesUsuario(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(estoques_usuario).where(eq(estoques_usuario.userId, userId));
  } catch (error) {
    console.error("[Database] Failed to list user estoques:", error);
    return [];
  }
}

/**
 * Atualizar ou criar estoque de um produto para um usuário
 */
export async function upsertEstoqueUsuario(userId: number, produtoId: string, quantidade: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const existing = await getEstoqueUsuario(userId, produtoId);
    
    if (existing) {
      await db.update(estoques_usuario)
        .set({ quantidade, atualizadoEm: new Date() })
        .where(sql`${estoques_usuario.userId} = ${userId} AND ${estoques_usuario.produtoId} = ${produtoId}`);
    } else {
      await db.insert(estoques_usuario).values({
        userId,
        produtoId,
        quantidade,
      });
    }
    
    return await getEstoqueUsuario(userId, produtoId);
  } catch (error) {
    console.error("[Database] Failed to upsert user estoque:", error);
    throw error;
  }
}

/**
 * Obter custo em USD de um produto
 */
export async function getCustoProduto(produtoId: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select().from(custos_produto).where(eq(custos_produto.produtoId, produtoId)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get product cost:", error);
    return null;
  }
}

/**
 * Atualizar ou criar custo em USD de um produto
 */
export async function upsertCustoProduto(produtoId: string, custoUsd: string | number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const existing = await getCustoProduto(produtoId);
    
    if (existing) {
      await db.update(custos_produto)
        .set({ custoUsd: custoUsd.toString(), atualizadoEm: new Date() })
        .where(eq(custos_produto.produtoId, produtoId));
    } else {
      await db.insert(custos_produto).values({
        produtoId,
        custoUsd: custoUsd.toString(),
      });
    }
    
    return await getCustoProduto(produtoId);
  } catch (error) {
    console.error("[Database] Failed to upsert product cost:", error);
    throw error;
  }
}

/**
 * Listar todos os custos de produtos
 */
export async function listCustosProdutos() {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(custos_produto);
  } catch (error) {
    console.error("[Database] Failed to list product costs:", error);
    return [];
  }
}


// ============================================================================
// GARANTIAS - CRUD Operations
// ============================================================================

/**
 * Criar novo processo de garantia
 */
export async function criarGarantiaProcesso(usuarioId: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(garantias_processo).values({
      usuarioId,
    });
    return { id: result[0].insertId, usuarioId };
  } catch (error) {
    console.error("[Database] Failed to create warranty process:", error);
    throw error;
  }
}

/**
 * Obter processo de garantia por ID
 */
export async function getGarantiaProcesso(processoId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select().from(garantias_processo).where(eq(garantias_processo.id, processoId));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get warranty process:", error);
    return null;
  }
}

/**
 * Listar todos os processos de garantia de um usuário
 */
export async function getAllGarantiaProcessosByUser(usuarioId: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(garantias_processo).where(eq(garantias_processo.usuarioId, usuarioId));
  } catch (error) {
    console.error("[Database] Failed to list warranty processes:", error);
    return [];
  }
}

/**
 * Deletar processo de garantia (cascata remove itens)
 */
export async function deletarGarantiaProcesso(processoId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.delete(garantias_processo).where(eq(garantias_processo.id, processoId));
    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to delete warranty process:", error);
    throw error;
  }
}

/**
 * Adicionar item a um processo de garantia
 */
export async function adicionarGarantiaItem(processoId: number, data: {
  codigoProduto: string;
  quantidade: number;
  precoUnitarioDolar: number;
  observacao?: string;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const precoTotalDolar = data.quantidade * data.precoUnitarioDolar;
    const result = await db.insert(garantias_item).values({
      processoId,
      codigoProduto: data.codigoProduto,
      quantidade: data.quantidade,
      precoUnitarioDolar: String(data.precoUnitarioDolar),
      precoTotalDolar: String(precoTotalDolar),
      observacao: data.observacao || null,
      status: data.status || 'Em Análise',
    });
    return { id: result[0].insertId, ...data, precoTotalDolar };
  } catch (error) {
    console.error("[Database] Failed to add warranty item:", error);
    throw error;
  }
}

/**
 * Obter itens de um processo de garantia
 */
export async function getGarantiaItens(processoId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(garantias_item).where(eq(garantias_item.processoId, processoId));
  } catch (error) {
    console.error("[Database] Failed to get warranty items:", error);
    return [];
  }
}

/**
 * Atualizar item de garantia
 */
export async function atualizarGarantiaItem(itemId: number, data: {
  quantidade?: number;
  precoUnitarioDolar?: number;
  observacao?: string;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const item = await db.select().from(garantias_item).where(eq(garantias_item.id, itemId));
    if (!item[0]) throw new Error("Item not found");

    const quantidade = data.quantidade ?? item[0].quantidade;
    const precoUnitarioDolar = data.precoUnitarioDolar ?? parseFloat(String(item[0].precoUnitarioDolar));
    const precoTotalDolar = quantidade * precoUnitarioDolar;

    await db.update(garantias_item).set({
      quantidade,
      precoUnitarioDolar: String(precoUnitarioDolar),
      precoTotalDolar: String(precoTotalDolar),
      observacao: data.observacao ?? item[0].observacao,
      status: data.status ?? item[0].status,
    }).where(eq(garantias_item.id, itemId));

    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to update warranty item:", error);
    throw error;
  }
}

/**
 * Remover item de garantia
 */
export async function removerGarantiaItem(itemId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.delete(garantias_item).where(eq(garantias_item.id, itemId));
    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to remove warranty item:", error);
    throw error;
  }
}

/**
 * Obter total em garantia por usuário
 */
export async function getTotalGarantiaByUser(usuarioId: string) {
  const db = await getDb();
  if (!db) return { total: 0, quantidade: 0 };

  try {
    const processos = await db.select().from(garantias_processo).where(eq(garantias_processo.usuarioId, usuarioId));
    const processoIds = processos.map(p => p.id);

    if (processoIds.length === 0) return { total: 0, quantidade: 0 };

    const itens = await db.select().from(garantias_item).where(
      sql`${garantias_item.processoId} IN (${sql.raw(processoIds.join(','))})`
    );

    const total = itens.reduce((sum, item) => sum + parseFloat(String(item.precoTotalDolar)), 0);
    const quantidade = itens.length;

    return { total, quantidade };
  } catch (error) {
    console.error("[Database] Failed to get warranty total:", error);
    return { total: 0, quantidade: 0 };
  }
}
