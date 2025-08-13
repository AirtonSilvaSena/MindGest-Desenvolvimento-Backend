// Importa o framework Express para criar o servidor
const express = require('express');
const setupSwagger = require('./config/swagger');


// Importa dotenv para carregar variáveis de ambiente do arquivo .env
const dotenv = require('dotenv');

// Importa as rotas de usuários
const userRoutes = require('./routes/usuarioRoutes');

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Cria uma instância do Express
const app = express();

// Middlewares globais
// Permite que o Express entenda requisições com corpo em JSON
app.use(express.json());

// Rotas da aplicação
// Todas as rotas de usuário começam com /usuarios
app.use('/api/v1/usuarios', userRoutes);

// Healthcheck simples para verificar se o servidor está online
// GET /health retorna um JSON com status 'ok'
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
setupSwagger(app);

// Middleware para tratar rotas não encontradas (404)
// Deve ficar no final, depois de todas as rotas definidas
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

// Inicialização do servidor
// Usa a porta definida no .env ou 3000 por padrão
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});


