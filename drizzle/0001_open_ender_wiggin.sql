CREATE TABLE `custos_produto` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produtoId` varchar(64) NOT NULL,
	`custoUsd` decimal(10,2) NOT NULL DEFAULT '0',
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custos_produto_id` PRIMARY KEY(`id`),
	CONSTRAINT `custos_produto_produtoId_unique` UNIQUE(`produtoId`)
);
--> statement-breakpoint
CREATE TABLE `estoques_usuario` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`produtoId` varchar(64) NOT NULL,
	`quantidade` int NOT NULL DEFAULT 0,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `estoques_usuario_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `preferencias_usuario` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taxaCambioCustomizada` decimal(10,4) NOT NULL DEFAULT '8.50',
	`usarTaxaCustomizada` int NOT NULL DEFAULT 0,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `preferencias_usuario_id` PRIMARY KEY(`id`)
);
