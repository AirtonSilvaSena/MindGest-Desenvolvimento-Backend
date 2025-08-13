const { Router } = require('express');
const UserController = require('../controllers/UsuarioController');
const { createUserValidation, updateUserValidation, idParamValidation } = require('../middlewares/usuarioValidation');
const handleValidation = require('../middlewares/handleValidation');
const autenticar = require('../middlewares/autenticar'); // Middleware de autenticação

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Usuários
 *   description: Endpoints de gerenciamento de usuários
 */

/**
 * Rotas públicas
 */

// Login de usuário
/**
 * @swagger
 * /api/v1/usuarios/login:
 *   post:
 *     summary: Login de usuário
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *               senha:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login bem-sucedido, retorna token
 *       400:
 *         description: Usuário não encontrado ou senha incorreta
 */
router.post('/login', UserController.login);

// Criação de usuário (pública)
/**
 * @swagger
 * /api/v1/usuarios:
 *   post:
 *     summary: Cria um novo usuário
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *               - senha
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               senha:
 *                 type: string
 *               telefone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuário criado
 *       409:
 *         description: Email já cadastrado
 *       422:
 *         description: Erro de validação
 */
router.post('/', createUserValidation, handleValidation, UserController.store);

/**
 * Rotas protegidas (necessário token)
 */

// Listar todos os usuários
/**
 * @swagger
 * /api/v1/usuarios:
 *   get:
 *     summary: Lista todos os usuários
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários
 */
router.get('/', autenticar, UserController.index);

// Buscar usuário por ID
/**
 * @swagger
 * /api/v1/usuarios/{id}:
 *   get:
 *     summary: Busca um usuário pelo ID
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do usuário
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/:id', autenticar, idParamValidation, handleValidation, UserController.show);

// Atualizar usuário
/**
 * @swagger
 * /api/v1/usuarios/{id}:
 *   put:
 *     summary: Atualiza um usuário existente
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do usuário a ser atualizado
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
 *               senha:
 *                 type: string
 *               telefone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *       404:
 *         description: Usuário não encontrado
 *       409:
 *         description: Email já cadastrado
 */
router.put('/:id', autenticar, updateUserValidation, handleValidation, UserController.update);

// Deletar usuário
/**
 * @swagger
 * /api/v1/usuarios/{id}:
 *   delete:
 *     summary: Remove um usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do usuário a ser removido
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Usuário removido com sucesso
 *       404:
 *         description: Usuário não encontrado
 */
router.delete('/:id', autenticar, idParamValidation, handleValidation, UserController.destroy);

module.exports = router;
