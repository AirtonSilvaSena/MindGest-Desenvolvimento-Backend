const express = require('express');
const router = express.Router();
const autenticar = require('../middlewares/autenticar');
const requireAdmin = require('../middlewares/requireAdmin');
const enforcePasswordReset = require('../middlewares/enforcePasswordReset');
const PlanosController = require('../controllers/PlanosController');

// Protegido: admin
router.use(autenticar, enforcePasswordReset(), requireAdmin);

/**
 * @swagger
 * tags:
 *   name: Planos
 *   description: Administração de planos de licença
 */

/**
 * @swagger
 * /api/v1/planos:
 *   post:
 *     summary: Criar plano
 *     tags: [Planos]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [descricao, dias_acesso]
 *             properties:
 *               descricao: { type: string }
 *               dias_acesso: { type: integer }
 *               ativo: { type: boolean }
 *     responses:
 *       201: { description: Plano criado }
 */
router.post('/', PlanosController.create);

/**
 * @swagger
 * /api/v1/planos:
 *   get:
 *     summary: Listar planos com contagem de usuários ativos
 *     tags: [Planos]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Lista de planos }
 */
router.get('/', PlanosController.index);

/**
 * @swagger
 * /api/v1/planos/{id}:
 *   get:
 *     summary: Detalhar plano (com contagem)
 *     tags: [Planos]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: integer } } ]
 *     responses:
 *       200: { description: OK }
 */
router.get('/:id', PlanosController.show);

/**
 * @swagger
 * /api/v1/planos/{id}:
 *   put:
 *     summary: Atualizar plano
 *     tags: [Planos]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: integer } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descricao: { type: string }
 *               dias_acesso: { type: integer }
 *               ativo: { type: boolean }
 *     responses:
 *       200: { description: Atualizado }
 */
router.put('/:id', PlanosController.update);

/**
 * @swagger
 * /api/v1/planos/assign-user/{id}:
 *   put:
 *     summary: Atribuir plano ao usuário (nova licença)
 *     tags: [Planos]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: integer } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plano_id]
 *             properties:
 *               plano_id: { type: integer }
 *     responses:
 *       200: { description: Plano atribuído }
 */
router.put('/assign-user/:id', PlanosController.assignToUser);

/**
 * @swagger
 * /api/v1/planos/renew-user/{id}:
 *   post:
 *     summary: Renovar licença do usuário (somar dias)
 *     tags: [Planos]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: integer } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [add_days]
 *             properties:
 *               add_days: { type: integer }
 *     responses:
 *       200: { description: Licença renovada }
 */
router.post('/renew-user/:id', PlanosController.renewUser);

module.exports = router;
