import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, estoques, precos, pedidos, itens_pedidos, type InsertEstoque, type InsertPreco, type InsertPedido, type InsertItensPedido } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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
    return result;
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

export async function atualizarStatusPedido(pedidoId: number, novoStatus: "Pendente" | "Enviado" | "Recebido") {
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
