const express = require('express');
const router = express.Router();
const StatusController = require('../controllers/StatusApiController');

/**
 * @swagger
 * /:
 *   get:
 *     summary: Verifica se a API está funcionando
 *     description: Retorna uma mensagem padrão, status e timestamp atual para confirmar que a API está online.
 *     tags:
 *       - Status
 *     responses:
 *       200:
 *         description: API está funcionando corretamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: API está funcionando corretamente
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/', StatusController.rotaPadrao);

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Retorna o status e tempo de atividade da API
 *     description: Informa o status da API, uptime (tempo que o processo Node está rodando) e timestamp atual.
 *     tags:
 *       - Status
 *     responses:
 *       200:
 *         description: Status da API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 uptime:
 *                   type: number
 *                   description: Tempo em segundos que o processo Node está rodando
 *                   example: 1234.56
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/statusApi', StatusController.apiStatus);

module.exports = router;
