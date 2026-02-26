CREATE TABLE `garantias_item` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processoId` int NOT NULL,
	`codigoProduto` varchar(50) NOT NULL,
	`quantidade` int NOT NULL DEFAULT 1,
	`precoUnitarioDolar` decimal(10,2) NOT NULL DEFAULT '0',
	`precoTotalDolar` decimal(12,2) NOT NULL DEFAULT '0',
	`observacao` text,
	`status` varchar(50) NOT NULL DEFAULT 'Em Análise',
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `garantias_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `garantias_processo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuarioId` varchar(255) NOT NULL,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `garantias_processo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `garantias_item` ADD CONSTRAINT `garantias_item_processoId_garantias_processo_id_fk` FOREIGN KEY (`processoId`) REFERENCES `garantias_processo`(`id`) ON DELETE cascade ON UPDATE no action;