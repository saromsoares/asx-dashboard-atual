import { drizzle } from 'drizzle-orm/mysql2';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { InsertUser, users, estoques, precos, pedidos, itens_pedidos, containers, container_pedidos, produtos, type InsertEstoque, type InsertPreco, type InsertPedido, type InsertItensPedido, type InsertProduto } from "../drizzle/schema";
import { ENV } from './_core/env';
import { eq, desc } from 'drizzle-orm';

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
    // Retornar o pedido criado
    const pedidoCriado = await db.select().from(pedidos).where(eq(pedidos.nome, nome)).orderBy(desc(pedidos.dataCreacao)).limit(1);
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
    await db.delete(pedidos).where(eq(pedidos.id, pedidoId));
    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to delete pedido:", error);
    throw error;
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
    // Primeiro, remover todos os pedidos vinculados
    await db.delete(container_pedidos).where(eq(container_pedidos.containerId, containerId));
    // Depois, deletar o container
    await db.delete(containers).where(eq(containers.id, containerId));
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
    return await db.select().from(container_pedidos).where(eq(container_pedidos.containerId, containerId));
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
    // Retorna todos os containers com contagem de pedidos
    const allContainers = await db.select().from(containers);
    const result = [];
    
    for (const container of allContainers) {
      const pedidosCount = await db.select().from(container_pedidos).where(eq(container_pedidos.containerId, container.id));
      result.push({
        ...container,
        pedidosCount: pedidosCount.length,
      });
    }
    
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
    // Usar require dinâmico para evitar problemas de TypeScript
    const produtosData = require('../client/src/data/produtos');
    const produtos = produtosData.produtos || [];

    if (!Array.isArray(produtos) || produtos.length === 0) {
      console.error("[Database] No produtos found in data file");
      return { sucesso: 0, erro: 0 };
    }

    // Limpar tabela de produtos
    await db.delete(produtos as any);

    // Inserir produtos
    let sucessoCount = 0;
    let erroCount = 0;

    for (const p of produtos) {
      try {
        await db.insert(produtos as any).values({
          codigo: p.codigo,
          descricao: p.descricao,
          categoria: p.categoria,
          unidade: p.unid || 'UND',
          caixa: p.caixa || 'PAR',
          voltagem: p.volt || 'BIVOLT',
          codigoBarras: p.cod_barras || null,
          ncm: p.ncm || null,
          custoUsd: parseFloat(p.custo_usd) || 0,
          precoVendaBrl: parseFloat(p.preco_venda) || 0,
          ativo: 'true',
        });
        sucessoCount++;
      } catch (error) {
        console.error(`[Database] Failed to insert produto ${p.codigo}:`, error);
        erroCount++;
      }
    }

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
    // Retornar o produto criado
    const produtoCriado = await db.select().from(produtos).where(eq(produtos.codigo, data.codigo)).limit(1);
    return produtoCriado[0];
  } catch (error) {
    console.error("[Database] Failed to create produto:", error);
    throw error;
  }
}
