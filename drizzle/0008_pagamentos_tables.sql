-- Migration: Create financial tables (debitos + pagamentos_registros)
-- Date: 2026-03-20

CREATE TABLE IF NOT EXISTS `debitos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `data` varchar(10) NOT NULL,
  `ordem` varchar(255) NOT NULL,
  `valor` decimal(12,2) NOT NULL,
  `criadoEm` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizadoEm` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pagamentos_registros` (
  `id` int NOT NULL AUTO_INCREMENT,
  `data` varchar(10) NOT NULL,
  `remetente` varchar(255) NOT NULL,
  `valor` decimal(12,2) NOT NULL,
  `tipo` enum('MIC','NAITE','TT','LC','OUTRO') NOT NULL DEFAULT 'TT',
  `criadoEm` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizadoEm` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed initial data (from the existing localStorage values)
INSERT INTO `debitos` (`data`, `ordem`, `valor`) VALUES
  ('2026-02-25', 'Saldo da planilha anterior', 56069.63);

INSERT INTO `pagamentos_registros` (`data`, `remetente`, `valor`, `tipo`) VALUES
  ('2026-02-25', 'Prosper ASX', 48444.30, 'TT');
