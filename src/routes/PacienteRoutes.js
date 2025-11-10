const express = require("express");
const router = express.Router();
const pacienteController = require("../controllers/PacienteController");
const { createPacienteValidation, updatePacienteValidation, idParamValidation, searchPacienteValidation } = require("../middlewares/pacienteValidation");
const handleValidation = require('../middlewares/handleValidation');
const autenticar = require('../middlewares/autenticar'); // Middleware de autenticação
const enforcePasswordReset = require('../middlewares/enforcePasswordReset');

/**
 * @swagger
 * tags:
 *   name: Pacientes
 *   description: Gerenciamento de pacientes
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Paciente:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nome:
 *           type: string
 *           example: João da Silva
 *         email:
 *           type: string
 *           example: joao@email.com
 *         telefone:
 *           type: string
 *           example: 11988887777
 *         data_nascimento:
 *           type: string
 *           format: date
 *           example: 1990-05-20
 *         profissional_id:
 *           type: integer
 *           example: 32
 *         ativo:
 *           type: boolean
 *           example: true
 *       required:
 *         - nome
 *         - email
 *         - telefone
 *         - profissional_id
 */

/**
 * @swagger
 * /api/v1/pacientes:
 *   get:
 *     summary: Lista todos os pacientes do usuário logado
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pacientes retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Paciente'
 *       401:
 *         description: Token não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       403:
 *         description: Token inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       401:
 *         description: Token não fornecido
 *       403:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 *
 *   post:
 *     summary: Cria um novo paciente vinculado ao usuário logado
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               telefone:
 *                 type: string
 *               data_nascimento:
 *                 type: string
 *                 format: date
 *             required:
 *               - nome
 *               - email
 *               - telefone
 *           examples:
 *             default:
 *               summary: Exemplo de criação
 *               value:
 *                 nome: Maria da Silva
 *                 email: maria@email.com
 *                 telefone: '21999999999'
 *                 data_nascimento: '1990-05-20'
 *     responses:
 *       201:
 *         description: Paciente criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Paciente'
 *       422:
 *         description: Erro de validação
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       401:
 *         description: Token não fornecido
 *       403:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.get("/", autenticar, enforcePasswordReset(), pacienteController.listar);

/**
 * @swagger
 * /api/v1/pacientes/pesquisar:
 *   get:
 *     summary: Pesquisa pacientes do usuário logado por nome, email ou telefone
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: nome
 *         schema:
 *           type: string
 *         required: false
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         required: false
 *       - in: query
 *         name: telefone
 *         schema:
 *           type: string
 *         required: false
 *     responses:
 *       200:
 *         description: Lista de pacientes encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Paciente'
 *       422:
 *         description: Erro de validação
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       401:
 *         description: Token não fornecido
 *       403:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.get("/pesquisar", autenticar, enforcePasswordReset(), searchPacienteValidation, handleValidation, pacienteController.pesquisar);

/**
 * @swagger
 * /api/v1/pacientes/{id}:
 *   get:
 *     summary: Busca um paciente pelo ID (somente do usuário logado)
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paciente encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Paciente'
 *       404:
 *         description: Paciente não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       401:
 *         description: Token não fornecido
 *       403:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 *
 *   put:
 *     summary: Atualiza um paciente existente do usuário logado
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               telefone:
 *                 type: string
 *               data_nascimento:
 *                 type: string
 *                 format: date
 *               ativo:
 *                 type: boolean
 *           examples:
 *             update:
 *               summary: Exemplo de atualização
 *               value:
 *                 nome: Maria A.
 *                 ativo: true
 *     responses:
 *       200:
 *         description: Paciente atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Paciente'
 *       404:
 *         description: Paciente não encontrado ou não pertence ao usuário
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
 *       401:
 *         description: Token não fornecido
 *       403:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 *
 *   delete:
 *     summary: Exclui um paciente pelo ID (somente do usuário logado)
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paciente excluído com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Paciente excluído com sucesso
 *       404:
 *         description: Paciente não encontrado ou não pertence ao usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       401:
 *         description: Token não fornecido
 *       403:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.get("/:id", autenticar, idParamValidation, handleValidation, pacienteController.buscarPorId);

/**
 * @swagger
 * /api/v1/pacientes:
 *   post:
 *     summary: Cria um novo paciente vinculado ao usuário logado
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               telefone:
 *                 type: string
 *               data_nascimento:
 *                 type: string
 *                 format: date
 *             required:
 *               - nome
 *               - email
 *               - telefone
 *     responses:
 *       201:
 *         description: Paciente criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Paciente'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token não fornecido
 *       403:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.post("/", autenticar, createPacienteValidation, handleValidation, pacienteController.criar);

/**
 * @swagger
 * /api/v1/pacientes/{id}:
 *   put:
 *     summary: Atualiza um paciente existente do usuário logado
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do paciente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               telefone:
 *                 type: string
 *               data_nascimento:
 *                 type: string
 *                 format: date
 *               ativo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Paciente atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Paciente'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token não fornecido
 *       403:
 *         description: Token inválido
 *       404:
 *         description: Paciente não encontrado ou não pertence ao usuário
 *       500:
 *         description: Erro interno do servidor
 */
router.put("/:id", autenticar, updatePacienteValidation, handleValidation, pacienteController.atualizar);

/**
 * @swagger
 * /api/v1/pacientes/{id}:
 *   delete:
 *     summary: Exclui um paciente pelo ID (somente do usuário logado)
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do paciente
 *     responses:
 *       200:
 *         description: Paciente excluído com sucesso
 *       401:
 *         description: Token não fornecido
 *       403:
 *         description: Token inválido
 *       404:
 *         description: Paciente não encontrado ou não pertence ao usuário
 *       500:
 *         description: Erro interno do servidor
 */
router.delete("/:id", autenticar, idParamValidation, handleValidation, pacienteController.excluir);

module.exports = router;
