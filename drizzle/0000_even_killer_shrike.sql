CREATE TABLE `config_json` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chave` varchar(128) NOT NULL,
	`dados` text NOT NULL,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `config_json_id` PRIMARY KEY(`id`),
	CONSTRAINT `config_json_chave_unique` UNIQUE(`chave`)
);
