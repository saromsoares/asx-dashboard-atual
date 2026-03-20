import { relations } from "drizzle-orm";
import {
  users,
  pedidos,
  itens_pedidos,
  containers,
  container_pedidos,
  processos_sr,
  itens_processo,
  auditLogs,
} from "./schema";

// Users
export const usersRelations = relations(users, ({ many }) => ({
  auditLogs: many(auditLogs),
}));

// Pedidos
export const pedidosRelations = relations(pedidos, ({ many }) => ({
  itensPedidos: many(itens_pedidos),
  containerPedidos: many(container_pedidos),
}));

// Itens Pedidos
export const itensPedidosRelations = relations(itens_pedidos, ({ one }) => ({
  pedido: one(pedidos, {
    fields: [itens_pedidos.pedidoId],
    references: [pedidos.id],
  }),
}));

// Containers
export const containersRelations = relations(containers, ({ many }) => ({
  containerPedidos: many(container_pedidos),
}));

// Container Pedidos (join table)
export const containerPedidosRelations = relations(container_pedidos, ({ one }) => ({
  container: one(containers, {
    fields: [container_pedidos.containerId],
    references: [containers.id],
  }),
  pedido: one(pedidos, {
    fields: [container_pedidos.pedidoId],
    references: [pedidos.id],
  }),
}));

// Processos SR
export const processosSrRelations = relations(processos_sr, ({ many }) => ({
  itensProcesso: many(itens_processo),
}));

// Itens Processo
export const itensProcessoRelations = relations(itens_processo, ({ one }) => ({
  processo: one(processos_sr, {
    fields: [itens_processo.processoId],
    references: [processos_sr.id],
  }),
}));

// Audit Logs
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));
