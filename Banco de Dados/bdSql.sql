-- --------------------------------------------------------
-- Servidor:                     127.0.0.1
-- Versão do servidor:           10.4.32-MariaDB - mariadb.org binary distribution
-- OS do Servidor:               Win64
-- HeidiSQL Versão:              12.11.0.7065
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Copiando estrutura do banco de dados para mindgest
CREATE DATABASE IF NOT EXISTS `mindgest` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `mindgest`;

-- Copiando estrutura para tabela mindgest.consultas
CREATE TABLE IF NOT EXISTS `consultas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `paciente_id` int(11) NOT NULL,
  `profissional_id` int(11) DEFAULT NULL,
  `data_consulta` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `duracao_minutos` int(11) NOT NULL CHECK (`duracao_minutos` > 0),
  `telefone` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `valor_sessao` decimal(10,2) DEFAULT NULL,
  `status` enum('AGENDADA','REALIZADA','CANCELADA') DEFAULT 'AGENDADA',
  `observacoes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  KEY `profissional_id` (`profissional_id`),
  CONSTRAINT `consultas_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela mindgest.pacientes
CREATE TABLE IF NOT EXISTS `pacientes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `telefone` varchar(20) NOT NULL,
  `data_nascimento` date DEFAULT NULL,
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp(),
  `atualizado_em` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `profissional_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `telefone` (`telefone`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_paciente_profissional` (`profissional_id`),
  CONSTRAINT `fk_paciente_profissional` FOREIGN KEY (`profissional_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados foi desmarcado.

-- Copiando estrutura para tabela mindgest.usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `telefone` varchar(20) DEFAULT NULL,
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp(),
  `atualizado_em` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `tipo` varchar(20) NOT NULL DEFAULT 'profissional',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados foi desmarcado.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;

-- Tabela de auditoria
CREATE TABLE IF NOT EXISTS `auditoria` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `recurso` varchar(50) NOT NULL,
  `acao` varchar(20) NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `entidade_id` int(11) DEFAULT NULL,
  `antes` json DEFAULT NULL,
  `depois` json DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_auditoria_recurso` (`recurso`),
  KEY `idx_auditoria_usuario` (`usuario_id`),
  KEY `idx_auditoria_entidade` (`entidade_id`),
  KEY `idx_auditoria_criado` (`criado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Migração: Adequações PF/PJ, reset de senha e índices
-- OBS: Execute os ALTERs apenas uma vez em bases existentes
-- --------------------------------------------------------
-- Pessoa tipo (PF/PJ) e identificadores
ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `pessoa_tipo` ENUM('PF','PJ') NOT NULL AFTER `tipo`;

ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `cpf` VARCHAR(14) NULL AFTER `pessoa_tipo`;

ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `cnpj` VARCHAR(18) NULL AFTER `cpf`;

ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `empresa_nome` VARCHAR(150) NULL AFTER `cnpj`;

-- Força troca de senha no primeiro acesso e flag de ativo
ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `must_reset_password` TINYINT(1) NOT NULL DEFAULT 0 AFTER `telefone`;

ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `ativo` TINYINT(1) NOT NULL DEFAULT 1 AFTER `atualizado_em`;

-- Constraints de unicidade
ALTER TABLE `usuarios`
  ADD UNIQUE KEY `uniq_usuarios_cpf` (`cpf`);

ALTER TABLE `usuarios`
  ADD UNIQUE KEY `uniq_usuarios_cnpj` (`cnpj`);

-- Índices auxiliares
ALTER TABLE `usuarios`
  ADD INDEX `idx_usuarios_tipo` (`tipo`),
  ADD INDEX `idx_usuarios_pessoa_tipo` (`pessoa_tipo`);
