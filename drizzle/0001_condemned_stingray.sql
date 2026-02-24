CREATE TABLE `estoques` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produtoId` varchar(64) NOT NULL,
	`quantidade` int NOT NULL DEFAULT 0,
	`dataAtualizacao` timestamp NOT NULL DEFAULT (now()),
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `estoques_id` PRIMARY KEY(`id`),
	CONSTRAINT `estoques_produtoId_unique` UNIQUE(`produtoId`)
);
--> statement-breakpoint
CREATE TABLE `precos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produtoId` varchar(64) NOT NULL,
	`custoUsd` decimal(10,2) NOT NULL DEFAULT '0',
	`precoVendaBrl` decimal(10,2) NOT NULL DEFAULT '0',
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `precos_id` PRIMARY KEY(`id`),
	CONSTRAINT `precos_produtoId_unique` UNIQUE(`produtoId`)
);
