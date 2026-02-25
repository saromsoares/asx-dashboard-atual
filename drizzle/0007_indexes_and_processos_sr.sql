-- Migration 0007: Índices faltantes + Tabela processos_sr (preparação para migrar Conteiner.tsx)

-- =============================================
-- ÍNDICES FALTANTES (Performance + Integridade)
-- =============================================

-- Índice em itens_pedidos.pedidoId para acelerar queries de itens por pedido
CREATE INDEX `idx_itens_pedidos_pedidoId` ON `itens_pedidos` (`pedidoId`);

-- Índice em itens_pedidos.produtoId para acelerar buscas por produto
CREATE INDEX `idx_itens_pedidos_produtoId` ON `itens_pedidos` (`produtoId`);

-- Índice UNIQUE em container_pedidos para evitar vinculação duplicada
ALTER TABLE `container_pedidos` ADD CONSTRAINT `container_pedidos_unique` UNIQUE (`containerId`, `pedidoId`);

-- Índice em container_pedidos.pedidoId para acelerar cascade delete
CREATE INDEX `idx_container_pedidos_pedidoId` ON `container_pedidos` (`pedidoId`);

-- Índice em auditLogs para consultas por entidade
CREATE INDEX `idx_auditLogs_entidade` ON `auditLogs` (`entidade`, `entidadeId`);

-- Índice em auditLogs por data para consultas recentes
CREATE INDEX `idx_auditLogs_criadoEm` ON `auditLogs` (`criadoEm`);

-- =============================================
-- TABELA processos_sr (Processos de Importação)
-- Migração futura do Conteiner.tsx (localStorage → banco)
-- =============================================

CREATE TABLE `processos_sr` (
  `id` int AUTO_INCREMENT NOT NULL,
  `numeroProcesso` varchar(64) NOT NULL,
  `nomeInvoice` varchar(255) NOT NULL DEFAULT '',
  `dataProcesso` varchar(32) NOT NULL DEFAULT '',
  `observacoes` text,
  `ncm` varchar(20) DEFAULT '',
  `status` enum('Em andamento','Finalizado','Cancelado') NOT NULL DEFAULT 'Em andamento',
  `confirmado` tinyint(1) NOT NULL DEFAULT 0,
  `caixasPapelao` int NOT NULL DEFAULT 0,
  `pesoBrutoKg` decimal(10,2) NOT NULL DEFAULT '0',
  `pesoLiquidoKg` decimal(10,2) NOT NULL DEFAULT '0',
  `cbm` decimal(10,4) NOT NULL DEFAULT '0',
  `criadoEm` timestamp NOT NULL DEFAULT (now()),
  `atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `processos_sr_id` PRIMARY KEY(`id`),
  CONSTRAINT `processos_sr_numero_unique` UNIQUE(`numeroProcesso`)
);

-- =============================================
-- TABELA itens_processo (Itens de cada Processo SR)
-- =============================================

CREATE TABLE `itens_processo` (
  `id` int AUTO_INCREMENT NOT NULL,
  `processoId` int NOT NULL,
  `codigo` varchar(64) NOT NULL,
  `descricao` text NOT NULL,
  `unidade` varchar(32) NOT NULL DEFAULT 'UND',
  `quantidade` int NOT NULL DEFAULT 0,
  `precoUnitarioDolar` decimal(10,2) NOT NULL DEFAULT '0',
  `precoTotalDolar` decimal(10,2) NOT NULL DEFAULT '0',
  `pedidoSarom` int NOT NULL DEFAULT 0,
  `pedidoAlexandre` int NOT NULL DEFAULT 0,
  `ordemCompra` varchar(64) NOT NULL DEFAULT '',
  `criadoEm` timestamp NOT NULL DEFAULT (now()),
  `atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `itens_processo_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_itens_processo_processoId` ON `itens_processo` (`processoId`);
CREATE INDEX `idx_itens_processo_codigo` ON `itens_processo` (`codigo`);
