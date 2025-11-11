const express = require('express');
const router = express.Router();
const autenticar = require('../middlewares/autenticar');
const enforcePasswordReset = require('../middlewares/enforcePasswordReset');
const InboxController = require('../controllers/InboxController');

router.use(autenticar, enforcePasswordReset());

/**
 * @swagger
 * tags:
 *   name: Inbox
 *   description: Caixa de entrada do usuário
 * components:
 *   schemas:
 *     InboxItem:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         titulo: { type: string }
 *         preview: { type: string }
 *         tipo: { type: string }
 *         recebido_em: { type: string, format: date-time }
 *         lido_em: { type: string, format: date-time, nullable: true }
 *     InboxDetail:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         titulo: { type: string }
 *         corpo: { type: string }
 *         tipo: { type: string }
 *         recebido_em: { type: string, format: date-time }
 *         lido_em: { type: string, format: date-time, nullable: true }
 *     MarkReadRequest:
 *       type: object
 *       properties:
 *         read: { type: boolean, default: true }
 */

/**
 * @swagger
 * /api/v1/inbox:
 *   get:
 *     summary: Listar mensagens do usuário
 *     tags: [Inbox]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [all, unread, read] }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista da inbox
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/InboxItem' }
 */
router.get('/', InboxController.list);

/**
 * @swagger
 * /api/v1/inbox/unread-count:
 *   get:
 *     summary: Contar mensagens não lidas do usuário
 *     tags: [Inbox]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Contagem de não lidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: integer }
 */
router.get('/unread-count', InboxController.unreadCount);

/**
 * @swagger
 * /api/v1/inbox/{id}:
 *   get:
 *     summary: Detalhar mensagem da inbox do usuário
 *     tags: [Inbox]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: integer } } ]
 *     responses:
 *       200:
 *         description: Detalhe da mensagem
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InboxDetail'
 */
router.get('/:id', InboxController.show);

/**
 * @swagger
 * /api/v1/inbox/{id}/read:
 *   patch:
 *     summary: Marcar como lida/não lida
 *     tags: [Inbox]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: integer } } ]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkReadRequest'
 *     responses:
 *       200:
 *         description: Estado de leitura atualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: integer }
 *                 lido_em: { type: string, format: date-time, nullable: true }
 */
router.patch('/:id/read', InboxController.markRead);

module.exports = router;
