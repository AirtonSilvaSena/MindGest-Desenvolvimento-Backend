const express = require('express');
const router = express.Router();
const consultasController = require('../controllers/ConsultaController');
const autenticar = require('../middlewares/autenticar');
const enforcePasswordReset = require('../middlewares/enforcePasswordReset');
const { createConsultaValidation, updateConsultaValidation, statusConsultaValidation, idParamValidation } = require('../middlewares/consultaValidation');
const enforceLicense = require('../middlewares/enforceLicense');
const handleValidation = require('../middlewares/handleValidation');

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
 *           examples:
 *             default:
 *               summary: Exemplo de criação
 *               value:
 *                 paciente_id: 10
 *                 data_consulta: '2025-11-11'
 *                 hora_inicio: '14:00:00'
 *                 duracao_minutos: 30
 *                 telefone: '21999998888'
 *     responses:
 *       201:
 *         description: Consulta criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Consulta'
 *       400:
 *         description: Conflito de horário / regra de negócio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       422:
 *         description: Erro de validação
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.post('/', autenticar, enforcePasswordReset(), enforceLicense(), createConsultaValidation, handleValidation, consultasController.create);

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
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/', autenticar, enforcePasswordReset(), enforceLicense(), consultasController.list);

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
 *       404:
 *         description: Consulta não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/:id', autenticar, enforcePasswordReset(), enforceLicense(), idParamValidation, handleValidation, consultasController.getById);

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
 *       200:
 *         description: Consulta atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Consulta'
 *       404:
 *         description: Consulta não encontrada ou sem permissão
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       422:
 *         description: Erro de validação
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.put('/:id', autenticar, enforcePasswordReset(), enforceLicense(), updateConsultaValidation, handleValidation, consultasController.update);

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
 *           examples:
 *             exemplo:
 *               summary: Atualiza para REALIZADA
 *               value:
 *                 status: REALIZADA
 *     responses:
 *       200:
 *         description: Status atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Consulta'
 *       400:
 *         description: Status inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Consulta não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.patch('/:id/status', autenticar, enforcePasswordReset(), enforceLicense(), statusConsultaValidation, handleValidation, consultasController.updateStatus);

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
 *       200:
 *         description: Consulta removida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: 'Consulta removida com sucesso.' }
 *       404:
 *         description: Consulta não encontrado ou sem permissão
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.delete('/:id', autenticar, enforcePasswordReset(), enforceLicense(), idParamValidation, handleValidation, consultasController.delete);

module.exports = router;
