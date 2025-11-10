// Importa o módulo mysql2 usando a interface "promise" para poder usar async/await
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('./index');

// Cria o objeto de configuração do pool a partir do config central
const poolConfig = {
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.pass,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  dateStrings: true,
  connectTimeout: 20000
};

if (config.db.sslEnabled) {
  try {
    poolConfig.ssl = { ca: fs.readFileSync(path.resolve(config.db.sslCAPath)) };
  } catch {}
}

// Cria um pool de conexões com o banco de dados
const pool = mysql.createPool(poolConfig);

// Exporta o pool para ser usado em outros arquivos do projeto
module.exports = pool;
