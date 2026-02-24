CREATE TABLE `container_pedidos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`containerId` int NOT NULL,
	`pedidoId` int NOT NULL,
	`sequencia` int NOT NULL DEFAULT 0,
	`dataVinculacao` timestamp NOT NULL DEFAULT (now()),
	`dataAtualizacao` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `container_pedidos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `containers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` varchar(64) NOT NULL,
	`status` enum('Vazio','Preenchendo','Cheio','Enviado','Entregue') NOT NULL DEFAULT 'Vazio',
	`capacidadeMaxima` int NOT NULL DEFAULT 1000,
	`pesoMaximo` decimal(10,2) NOT NULL DEFAULT '0',
	`dataCreacao` timestamp NOT NULL DEFAULT (now()),
	`dataAtualizacao` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `containers_id` PRIMARY KEY(`id`),
	CONSTRAINT `containers_numero_unique` UNIQUE(`numero`)
);
