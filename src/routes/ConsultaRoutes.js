const express = require('express');
const router = express.Router();
const consultasController = require('../controllers/ConsultaController');
const autenticar = require('../middlewares/autenticar');

/**
 * @swagger
 * tags:
 *   name: Consultas
 *   description: Endpoints para gerenciamento de consultas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Consulta:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         paciente_id:
 *           type: integer
 *         profissional_id:
 *           type: integer
 *         data_consulta:
 *           type: string
 *           format: date
 *         hora_inicio:
 *           type: string
 *           example: "14:00:00"
 *         duracao_minutos:
 *           type: integer
 *         telefone:
 *           type: string
 *         email:
 *           type: string
 *         valor_sessao:
 *           type: number
 *         observacoes:
 *           type: string
 *         status:
 *           type: string
 *           enum: [AGENDADA, REALIZADA, CANCELADA]
 *         paciente_nome:
 *           type: string
 *         profissional_nome:
 *           type: string
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/v1/consultas:
 *   post:
 *     summary: Criar nova consulta
 *     tags: [Consultas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paciente_id, data_consulta, hora_inicio, duracao_minutos, telefone]
 *             properties:
 *               paciente_id: { type: integer }
 *               data_consulta: { type: string, format: date }
 *               hora_inicio: { type: string, example: "14:00:00" }
 *               duracao_minutos: { type: integer }
 *               telefone: { type: string }
 *               email: { type: string }
 *               valor_sessao: { type: number }
 *               observacoes: { type: string }
 *     responses:
 *       201:
 *         description: Consulta criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Consulta'
 *       400: { description: Erro de validação }
 *       500: { description: Erro interno }
 */
router.post('/', autenticar, consultasController.create);

/**
 * @swagger
 * /api/v1/consultas:
 *   get:
 *     summary: Listar consultas do profissional logado
 *     tags: [Consultas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de consultas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Consulta'
 *       500: { description: Erro interno }
 */
router.get('/', autenticar, consultasController.list);

/**
 * @swagger
 * /api/v1/consultas/{id}:
 *   get:
 *     summary: Buscar consulta por ID
 *     tags: [Consultas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Consulta encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Consulta'
 *       403: { description: Acesso negado }
 *       404: { description: Consulta não encontrada }
 *       500: { description: Erro interno }
 */
router.get('/:id', autenticar, consultasController.getById);

/**
 * @swagger
 * /api/v1/consultas/{id}:
 *   put:
 *     summary: Atualizar consulta
 *     tags: [Consultas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Consulta'
 *     responses:
 *       200: { description: Consulta atualizada }
 *       404: { description: Consulta não encontrada ou sem permissão }
 *       500: { description: Erro interno }
 */
router.put('/:id', autenticar, consultasController.update);

/**
 * @swagger
 * /api/v1/consultas/{id}/status:
 *   patch:
 *     summary: Atualizar status da consulta
 *     tags: [Consultas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [AGENDADA, REALIZADA, CANCELADA]
 *     responses:
 *       200: { description: Status atualizado }
 *       400: { description: Status inválido }
 *       403: { description: Acesso negado }
 *       404: { description: Consulta não encontrada }
 *       500: { description: Erro interno }
 */
router.patch('/:id/status', autenticar, consultasController.updateStatus);

/**
 * @swagger
 * /api/v1/consultas/{id}:
 *   delete:
 *     summary: Excluir consulta
 *     tags: [Consultas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Consulta removida com sucesso }
 *       404: { description: Consulta não encontrada ou sem permissão }
 *       500: { description: Erro interno }
 */
router.delete('/:id', autenticar, consultasController.delete);

module.exports = router;
