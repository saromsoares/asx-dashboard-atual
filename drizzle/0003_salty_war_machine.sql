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
