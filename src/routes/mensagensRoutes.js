const express = require('express');
const router = express.Router();
const autenticar = require('../middlewares/autenticar');
const requireAdmin = require('../middlewares/requireAdmin');
const enforcePasswordReset = require('../middlewares/enforcePasswordReset');
const MensagensController = require('../controllers/MensagensController');

// Protegido: admin
router.use(autenticar, enforcePasswordReset(), requireAdmin);

/**
 * @swagger
 * tags:
 *   name: Mensagens
 *   description: Administração de mensagens internas (inbox)
 * components:
 *   schemas:
 *     Mensagem:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         titulo: { type: string }
 *         corpo: { type: string }
 *         tipo: { type: string, enum: [cobranca, comunicado, sistema, outro] }
 *         criado_por_admin_id: { type: integer }
 *         criado_em: { type: string, format: date-time }
 *     MensagemStats:
 *       type: object
 *       properties:
 *         total_destinatarios: { type: integer }
 *         lidos: { type: integer }
 *         nao_lidos: { type: integer }
 *     MensagemCreateRequest:
 *       type: object
 *       required: [ titulo, corpo, destino ]
 *       properties:
 *         titulo: { type: string, example: 'Aviso de cobrança' }
 *         corpo: { type: string, example: 'Sua fatura vence em 3 dias.' }
 *         tipo: { type: string, enum: [cobranca, comunicado, sistema, outro], example: 'comunicado' }
 *         destino: { type: string, enum: [todos, por_ids] }
 *         usuario_ids:
 *           type: array
 *           items: { type: integer }
 *           description: Obrigatório quando destino=por_ids
 *         sendEmail:
 *           type: boolean
 *           description: Opcional; quando true, envia e-mail (se configurado)
 *     MensagemListItem:
 *       allOf:
 *         - $ref: '#/components/schemas/Mensagem'
 *         - type: object
 *           properties:
 *             total_destinatarios: { type: integer }
 *             lidos: { type: integer }
 *             nao_lidos: { type: integer }
 */

/**
 * @swagger
 * /api/v1/mensagens:
 *   post:
 *     summary: Criar mensagem e entregar aos destinatários
 *     tags: [Mensagens]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [titulo, corpo, destino]
 *             properties:
 *               titulo: { type: string }
 *               corpo: { type: string }
 *               tipo: { type: string, enum: [cobranca, comunicado, sistema, outro] }
 *               destino: { type: string, enum: [todos, por_ids] }
 *               usuario_ids: { type: array, items: { type: integer } }
 *               sendEmail: { type: boolean }
 *     responses:
 *       201:
 *         description: Mensagem criada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem: { $ref: '#/components/schemas/Mensagem' }
 *                 entregues: { type: integer }
 */
router.post('/', MensagensController.create);

/**
 * @swagger
 * /api/v1/mensagens:
 *   get:
 *     summary: Listar mensagens com estatísticas
 *     tags: [Mensagens]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de mensagens
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/MensagemListItem' }
 */
router.get('/', MensagensController.index);

/**
 * @swagger
 * /api/v1/mensagens/{id}:
 *   get:
 *     summary: Detalhar mensagem
 *     tags: [Mensagens]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: integer } } ]
 *     responses:
 *       200:
 *         description: Detalhe com estatísticas
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Mensagem'
 *                 - $ref: '#/components/schemas/MensagemStats'
 */
router.get('/:id', MensagensController.show);

/**
 * @swagger
 * /api/v1/mensagens/{id}:
 *   put:
 *     summary: Atualizar mensagem
 *     tags: [Mensagens]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: integer } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo: { type: string }
 *               corpo: { type: string }
 *               tipo: { type: string }
 *     responses:
 *       200:
 *         description: Mensagem atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mensagem'
 */
router.put('/:id', MensagensController.update);

/**
 * @swagger
 * /api/v1/mensagens/{id}:
 *   delete:
 *     summary: Remover mensagem
 *     tags: [Mensagens]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: integer } } ]
 *     responses:
 *       204: { description: Removida }
 */
router.delete('/:id', MensagensController.destroy);

module.exports = router;
