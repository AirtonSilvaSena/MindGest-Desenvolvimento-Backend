const { Router } = require('express');
const autenticar = require('../middlewares/autenticar');
const enforcePasswordReset = require('../middlewares/enforcePasswordReset');
const AuditController = require('../controllers/AuditController');

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auditoria
 *   description: Endpoints de auditoria (apenas administradores)
 */

/**
 * @swagger
 * /api/v1/auditoria:
 *   get:
 *     summary: Lista registros de auditoria
 *     tags: [Auditoria]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *       - in: query
 *         name: recurso
 *         schema: { type: string }
 *       - in: query
 *         name: acao
 *         schema: { type: string }
 *       - in: query
 *         name: usuario_id
 *         schema: { type: integer }
 *       - in: query
 *         name: entidade_id
 *         schema: { type: integer }
 *       - in: query
 *         name: de
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: ate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Lista de auditoria
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Auditoria'
 *       403:
 *         description: Acesso negado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/', autenticar, enforcePasswordReset(), AuditController.index);

/**
 * @swagger
 * /api/v1/auditoria/{id}:
 *   get:
 *     summary: Detalhe de auditoria por ID
 *     tags: [Auditoria]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Registro de auditoria
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Auditoria'
 *       403:
 *         description: Acesso negado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       404:
 *         description: Não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/:id', autenticar, enforcePasswordReset(), AuditController.show);

module.exports = router;
