const { Router } = require('express');
const UserController = require('../controllers/UsuarioController');
const { createUserValidation, updateUserValidation, idParamValidation, changePasswordValidation } = require('../middlewares/usuarioValidation');
const handleValidation = require('../middlewares/handleValidation');
const autenticar = require('../middlewares/autenticar'); // Middleware de autenticação
const requireAdmin = require('../middlewares/requireAdmin');
const enforcePasswordReset = require('../middlewares/enforcePasswordReset');

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

// Login de profissional (PF/PJ) com CPF/CNPJ
/**
 * @swagger
 * /api/v1/usuarios/login:
 *   post:
 *     summary: Login de profissional (PF/PJ) por CPF/CNPJ
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ pessoa_tipo, senha ]
 *             properties:
 *               pessoa_tipo: { type: string, enum: [PF, PJ] }
 *               cpf: { type: string, description: "Obrigatório quando pessoa_tipo = PF" }
 *               cnpj: { type: string, description: "Obrigatório quando pessoa_tipo = PJ" }
 *               senha: { type: string }
 *           examples:
 *             pf:
 *               summary: Exemplo PF
 *               value: { pessoa_tipo: PF, cpf: "12345678901", senha: "Senha@123" }
 *             pj:
 *               summary: Exemplo PJ
 *               value: { pessoa_tipo: PJ, cnpj: "12345678000199", senha: "Senha@123" }
 *     responses:
 *       200:
 *         description: Login bem-sucedido, retorna token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       400:
 *         description: Usuário não encontrado ou senha incorreta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       403:
 *         description: Primeiro acesso requer troca de senha (retorna resetToken)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 mustResetPassword: { type: boolean }
 *                 resetToken: { type: string }
 */
const { loginProfValidation, loginAdminValidation } = require('../middlewares/loginValidation');
router.post('/login', loginProfValidation, handleValidation, UserController.login);

// Login de administrador com email/senha
/**
 * @swagger
 * /api/v1/usuarios/login-admin:
 *   post:
 *     summary: Login de administrador por email/senha
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ email, senha ]
 *             properties:
 *               email: { type: string }
 *               senha: { type: string }
 *     responses:
 *       200:
 *         description: Login bem-sucedido, retorna token
 *       400:
 *         description: Usuário não encontrado ou senha incorreta
 */
router.post('/login-admin', loginAdminValidation, handleValidation, UserController.loginAdmin);

/**
 * @swagger
 * /validarToken:
 *   get:
 *     summary: Valida o token JWT e retorna os dados do usuário
 *     description: >
 *       Retorna `valid: true` e as informações do usuário caso o token seja válido.
 *     tags:
 *       - Autenticação
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido, retorna informações do usuário.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 infoUser:
 *                   $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: Token não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       403:
 *         description: Token inválido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/validarToken', autenticar, UserController.validateToken);

// Troca de senha (primeiro acesso)
router.put('/me/senha', autenticar, changePasswordValidation, handleValidation, UserController.changePassword);

// Criação de usuário (pública)
/**
 * @swagger
 * /api/v1/usuarios:
 *   post:
 *     summary: Cria um novo usuário (somente admin)
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
 *               - telefone
 *               - plano_id
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               senha:
 *                 type: string
 *               telefone:
 *                 type: string
 *               plano_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Usuário criado
 *       409:
 *         description: Email já cadastrado
 *       422:
 *         description: Erro de validação
 */
router.post('/', autenticar, requireAdmin, enforcePasswordReset(), createUserValidation, handleValidation, UserController.store);

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
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [admin, profissional]
 *         required: false
 *         description: Filtra por tipo de usuário
 *     responses:
 *       200:
 *         description: Lista de usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
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
 */
router.get('/', autenticar, enforcePasswordReset(), requireAdmin, UserController.index);

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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuário não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/:id', autenticar, enforcePasswordReset(), idParamValidation, handleValidation, UserController.show);

// Perfil (self)
/**
 * @swagger
 * /api/v1/usuarios/me:
 *   get:
 *     summary: Retorna o perfil do usuário autenticado
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil
 *   put:
 *     summary: Atualiza o próprio perfil
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome: { type: string }
 *               email: { type: string }
 *               senha: { type: string }
 *               telefone: { type: string }
 *     responses:
 *       200: { description: Perfil atualizado }
 */
router.get('/me', autenticar, enforcePasswordReset(), UserController.me);
router.put('/me', autenticar, enforcePasswordReset(), updateUserValidation, handleValidation, UserController.updateMe);

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
 *           examples:
 *             updateNomeEmail:
 *               summary: Atualização simples
 *               value:
 *                 nome: Novo Nome
 *                 email: novo@email.com
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuário não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       409:
 *         description: Email já cadastrado
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
 */
router.put('/:id', autenticar, enforcePasswordReset(), updateUserValidation, handleValidation, UserController.update);

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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.delete('/:id', autenticar, enforcePasswordReset(), idParamValidation, handleValidation, UserController.destroy);

// Bootstrap do primeiro admin (somente quando não existem usuários)
router.post('/bootstrap-admin', UserController.bootstrapAdmin);
router.post('/:id/reset-password', autenticar, requireAdmin, enforcePasswordReset(), idParamValidation, handleValidation, UserController.resetPassword);



module.exports = router;
/**
 * @swagger
 * /api/v1/usuarios/bootstrap-admin:
 *   post:
 *     summary: Cria um usuário admin (uso em setup e testes)
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ email, senha ]
 *             properties:
 *               email: { type: string }
 *               senha: { type: string }
 *               nome: { type: string }
 *     responses:
 *       201: { description: Admin criado }
 *       409: { description: Já existe usuário }
 */
// rota já definida anteriormente
