const express = require('express');
const autenticar = require('../middlewares/autenticar');
const requireAdmin = require('../middlewares/requireAdmin');
const enforcePasswordReset = require('../middlewares/enforcePasswordReset');
const { getSummary: getDbSummary, pingLatency } = require('../services/monitorDb');
const serverMonitor = require('../services/monitorServer');
const logger = require('../utils/logger');

const router = express.Router();

// Proteção: admin + senha trocada
router.use(autenticar, enforcePasswordReset(), requireAdmin);

/**
 * @swagger
 * /api/v1/admin/monitor/db/summary:
 *   get:
 *     summary: Resumo do banco de dados (admin)
 *     tags: [Monitor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumo atual do banco
 *       403:
 *         description: Acesso negado ou troca de senha pendente
 */
router.get('/db/summary', async (_req, res) => {
  try {
    const s = await getDbSummary();
    res.json(s);
  } catch (e) {
    logger.error('monitor_db_summary_error', { err: { message: e.message } });
    res.status(500).json({ message: 'Erro ao obter resumo do banco' });
  }
});

/**
 * @swagger
 * /api/v1/admin/monitor/db/health:
 *   get:
 *     summary: Health do banco (latência)
 *     tags: [Monitor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Banco OK
 *       503:
 *         description: Banco indisponível
 */
router.get('/db/health', async (_req, res) => {
  try {
    const latencyMs = await pingLatency();
    res.json({ ok: true, latencyMs });
  } catch (e) {
    res.status(503).json({ ok: false, message: 'Banco indisponível' });
  }
});

/**
 * @swagger
 * /api/v1/admin/monitor/server/summary:
 *   get:
 *     summary: Resumo do servidor (admin)
 *     tags: [Monitor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumo do servidor
 */
router.get('/server/summary', async (_req, res) => {
  try {
    const s = await serverMonitor.getSummary();
    res.json(s);
  } catch (e) {
    logger.error('monitor_server_summary_error', { err: { message: e.message } });
    res.status(500).json({ message: 'Erro ao obter resumo do servidor' });
  }
});

module.exports = router;
