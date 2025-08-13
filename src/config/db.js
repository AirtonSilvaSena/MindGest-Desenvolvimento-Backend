// Importa o módulo mysql2 usando a interface "promise" para poder usar async/await
const mysql = require('mysql2/promise');

// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

// Cria um pool de conexões com o banco de dados
const pool = mysql.createPool({
  host: process.env.DB_HOST,       // Endereço do servidor do banco (ex: localhost)
  user: process.env.DB_USER,       // Usuário do banco definido no .env
  password: process.env.DB_PASS,   // Senha do banco definida no .env
  database: process.env.DB_NAME,   // Nome do banco que será usado
  waitForConnections: true,        // Aguarda se todas as conexões estiverem ocupadas
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10), // Máximo de conexões simultâneas no pool
  queueLimit: 0,                   // Sem limite de espera na fila de conexões
  dateStrings: true                // Converte DATETIME/TIMESTAMP do MySQL em string legível
});

// Exporta o pool para ser usado em outros arquivos do projeto
module.exports = pool;
