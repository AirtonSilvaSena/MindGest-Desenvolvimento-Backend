// Importa o framework Express para criar o servidor
const express = require('express');
const cors = require('cors');
const setupSwagger = require('./config/swagger');
const config = require('./config');
const logger = require('./utils/logger');

// Middlewares
const requestId = require('./middlewares/requestId');
const securityHeaders = require('./middlewares/securityHeaders');
const errorHandler = require('./middlewares/errorHandler');
const rateLimit = require('./middlewares/rateLimit');

// Rotas
const userRoutes = require('./routes/usuarioRoutes');
const statusRoutes = require('./routes/statusRoutes');
const pacienteRoutes = require("./routes/PacienteRoutes");
const consultasRoutes = require('./routes/ConsultaRoutes');
const auditRoutes = require('./routes/auditRoutes');
const monitorRoutes = require('./routes/monitorRoutes');
const planosRoutes = require('./routes/planosRoutes');
const mensagensRoutes = require('./routes/mensagensRoutes');
const inboxRoutes = require('./routes/inboxRoutes');

// Cria uma instância do Express
const app = express();

// Middlewares globais
app.use(requestId);
app.use(securityHeaders);
app.use(cors({ origin: (origin, cb) => {
  // Em dev aceita tudo; em prod limita se configurado
  if (config.env !== 'production' || config.corsOrigins.includes('*') || !origin) return cb(null, true);
  return cb(null, config.corsOrigins.includes(origin));
}}));
app.use(express.json());

// Métricas simples em memória
const metrics = { totalRequests: 0, perRoute: {}, errors: 0 };
app.use((req, res, next) => {
  const start = Date.now();
  metrics.totalRequests++;
  res.on('finish', () => {
    const key = `${req.method} ${req.path}`;
    metrics.perRoute[key] = (metrics.perRoute[key] || 0) + 1;
    const duration = Date.now() - start;
    if (res.statusCode >= 500) metrics.errors++;
    logger.info('request_finished', { requestId: req.id, method: req.method, path: req.originalUrl, status: res.statusCode, duration_ms: duration });
  });
  next();
});

// Rotas da aplicação
// Rate limit específico para login (proteção básica)
app.use('/api/v1/usuarios/login', rateLimit({ windowMs: 60_000, max: 10, keyGenerator: (req) => req.ip }));
app.use('/api/v1/usuarios/login-admin', rateLimit({ windowMs: 60_000, max: 10, keyGenerator: (req) => req.ip }));

app.use('/api/v1/usuarios', userRoutes);
app.use('/api/v1/pacientes', pacienteRoutes);
app.use('/api/v1/consultas', consultasRoutes);
app.use('/api/v1/auditoria', auditRoutes);
app.use('/api/v1/planos', planosRoutes);
app.use('/api/v1/mensagens', mensagensRoutes);
app.use('/api/v1/inbox', inboxRoutes);
// Monitoramento admin
app.use('/api/v1/admin/monitor', rateLimit({ windowMs: 60_000, max: 10, keyGenerator: (req) => req.ip }), monitorRoutes);
app.use('/', statusRoutes);

// Health e métricas
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/metrics', (_req, res) => res.json(metrics));

// Configura o Swagger
setupSwagger(app);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada', path: req.originalUrl, requestId: req.id });
});

// Error handler (sempre por último)
app.use(errorHandler);

// Inicialização do servidor
app.listen(config.port, () => {
  logger.info('server_started', { port: config.port, env: config.env });
});
