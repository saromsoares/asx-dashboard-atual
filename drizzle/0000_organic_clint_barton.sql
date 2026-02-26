CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`acao` varchar(255) NOT NULL,
	`entidade` varchar(64) NOT NULL,
	`entidadeId` varchar(64) NOT NULL,
	`dadosAntigos` text,
	`dadosNovos` text,
	`descricao` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compras_produto` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produtoId` varchar(64) NOT NULL,
	`quantidadeCompra` int NOT NULL DEFAULT 0,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `compras_produto_id` PRIMARY KEY(`id`),
	CONSTRAINT `compras_produto_produtoId_unique` UNIQUE(`produtoId`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `cotacao_ptax` (
	`id` int AUTO_INCREMENT NOT NULL,
	`compra` decimal(10,4) NOT NULL DEFAULT '0',
	`venda` decimal(10,4) NOT NULL DEFAULT '0',
	`dataHoraCotacao` varchar(64) NOT NULL DEFAULT '',
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cotacao_ptax_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `debitos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`valor` decimal(12,2) NOT NULL DEFAULT '0',
	`data` varchar(32) NOT NULL,
	`observacoes` text,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `debitos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `pagamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`valor` decimal(12,2) NOT NULL DEFAULT '0',
	`data` varchar(32) NOT NULL,
	`observacoes` text,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pagamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pedidos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`status` enum('Pendente','Confirmado','Recebido') NOT NULL DEFAULT 'Pendente',
	`dataCreacao` timestamp NOT NULL DEFAULT (now()),
	`dataAtualizacao` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pedidos_id` PRIMARY KEY(`id`)
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
--> statement-breakpoint
CREATE TABLE `produtos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(64) NOT NULL,
	`descricao` text NOT NULL,
	`categoria` varchar(128) NOT NULL,
	`unidade` varchar(32) NOT NULL DEFAULT 'UND',
	`caixa` varchar(32) NOT NULL DEFAULT 'PAR',
	`voltagem` varchar(32) DEFAULT 'BIVOLT',
	`codigoBarras` varchar(64),
	`ncm` varchar(12),
	`custoUsd` decimal(10,2) NOT NULL DEFAULT '0',
	`precoVendaBrl` decimal(10,2) NOT NULL DEFAULT '0',
	`descricaoCompleta` text,
	`observacoes` text,
	`fotoUrl` varchar(512),
	`ativo` varchar(10) NOT NULL DEFAULT 'true',
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `produtos_id` PRIMARY KEY(`id`),
	CONSTRAINT `produtos_codigo_unique` UNIQUE(`codigo`),
	CONSTRAINT `produtos_codigoBarras_unique` UNIQUE(`codigoBarras`)
);
--> statement-breakpoint
CREATE TABLE `saldo_embarque` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processoId` varchar(64) NOT NULL,
	`saldoUnidades` int NOT NULL DEFAULT 0,
	`saldoValorUsd` decimal(12,2) NOT NULL DEFAULT '0',
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saldo_embarque_id` PRIMARY KEY(`id`),
	CONSTRAINT `saldo_embarque_processoId_unique` UNIQUE(`processoId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `vendas_produto` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produtoId` varchar(64) NOT NULL,
	`vendaTrimestre` int NOT NULL DEFAULT 0,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendas_produto_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendas_produto_produtoId_unique` UNIQUE(`produtoId`)
);
