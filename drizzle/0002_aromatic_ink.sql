CREATE TABLE `itens_pedidos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pedidoId` int NOT NULL,
	`produtoId` varchar(64) NOT NULL,
	`quantidadeSarom` int NOT NULL DEFAULT 0,
	`quantidadeAlexandre` int NOT NULL DEFAULT 0,
	`precoUnitario` decimal(10,2) NOT NULL DEFAULT '0',
	`dataAdicao` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itens_pedidos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pedidos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`status` enum('Pendente','Enviado','Recebido') NOT NULL DEFAULT 'Pendente',
	`dataCreacao` timestamp NOT NULL DEFAULT (now()),
	`dataAtualizacao` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pedidos_id` PRIMARY KEY(`id`)
);
