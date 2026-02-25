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
--> statement-breakpoint
CREATE TABLE `processos_sr` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroProcesso` varchar(64) NOT NULL,
	`nomeInvoice` varchar(255) NOT NULL DEFAULT '',
	`dataProcesso` varchar(32) NOT NULL DEFAULT '',
	`observacoes` text,
	`ncm` varchar(20) DEFAULT '',
	`status` enum('Em andamento','Finalizado','Cancelado') NOT NULL DEFAULT 'Em andamento',
	`confirmado` int NOT NULL DEFAULT 0,
	`caixasPapelao` int NOT NULL DEFAULT 0,
	`pesoBrutoKg` decimal(10,2) NOT NULL DEFAULT '0',
	`pesoLiquidoKg` decimal(10,2) NOT NULL DEFAULT '0',
	`cbm` decimal(10,4) NOT NULL DEFAULT '0',
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `processos_sr_id` PRIMARY KEY(`id`),
	CONSTRAINT `processos_sr_numeroProcesso_unique` UNIQUE(`numeroProcesso`)
);
