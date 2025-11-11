/**
 * @swagger
 * components:
 *   schemas:
 *     Erro:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *           example: INTERNAL_ERROR
 *         message:
 *           type: string
 *           example: Erro interno do servidor
 *         path:
 *           type: string
 *           example: /api/v1/usuarios
 *         requestId:
 *           type: string
 *           example: 5b1c9b1e-9f2e-4f2a-9c74-3c0a2fefc111
 *
 *     Usuario:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 12 }
 *         nome: { type: string, example: 'João da Silva' }
 *         email: { type: string, example: 'joao@email.com' }
 *         telefone: { type: string, example: '11999998888' }
 *         criado_em: { type: string, format: date-time }
 *         atualizado_em: { type: string, format: date-time }
 *         tipo: { type: string, example: 'profissional' }
 *         pessoa_tipo: { type: string, example: 'PF' }
 *         empresa_nome: { type: string, nullable: true, example: 'ACME Ltda' }
 *         cpf: { type: string, nullable: true, example: '***.123.456-**' }
 *         cnpj: { type: string, nullable: true, example: '**.234.567/****-**' }
 *
 *     LoginRequest:
 *       type: object
 *       required: [ email, senha ]
 *       properties:
 *         email: { type: string }
 *         senha: { type: string }
 *
 *     TokenResponse:
 *       type: object
 *       properties:
 *         token: { type: string }
 *         mustResetPassword: { type: boolean, example: true }
 *         tipo: { type: string, example: 'admin' }
 *         licenseExpiresAt: { type: string, format: date-time }
 *         daysRemaining: { type: integer, example: 42 }
 *
 *     Paciente:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 7 }
 *         nome: { type: string, example: 'Maria' }
 *         email: { type: string, example: 'maria@email.com' }
 *         telefone: { type: string, example: '21999998888' }
 *         data_nascimento: { type: string, format: date }
 *         profissional_id: { type: integer, example: 12 }
 *         ativo: { type: boolean, example: true }
 *         criado_em: { type: string, format: date-time }
 *         atualizado_em: { type: string, format: date-time }
 *
 *     Consulta:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         paciente_id: { type: integer }
 *         profissional_id: { type: integer }
 *         data_consulta: { type: string, format: date }
 *         hora_inicio: { type: string, example: '14:00:00' }
 *         duracao_minutos: { type: integer }
 *         telefone: { type: string }
 *         email: { type: string, nullable: true }
 *         valor_sessao: { type: number, nullable: true }
 *         observacoes: { type: string, nullable: true }
 *         status: { type: string, enum: [AGENDADA, REALIZADA, CANCELADA] }
 *         paciente_nome: { type: string }
 *         profissional_nome: { type: string }
 *
 *     Auditoria:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         recurso: { type: string, example: 'paciente' }
 *         acao: { type: string, example: 'CREATE' }
 *         usuario_id: { type: integer, nullable: true }
 *         entidade_id: { type: integer, nullable: true }
 *         antes: { type: object, nullable: true }
 *         depois: { type: object, nullable: true }
 *         ip: { type: string, example: '::1' }
 *         user_agent: { type: string, nullable: true }
 *         criado_em: { type: string, format: date-time }
 *
 *     Plano:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         descricao: { type: string }
 *         dias_acesso: { type: integer }
 *         ativo: { type: boolean }
 *         criado_em: { type: string, format: date-time }
 *         atualizado_em: { type: string, format: date-time }
 *
 *     Licenca:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         usuario_id: { type: integer }
 *         plano_id: { type: integer }
 *         emitido_em: { type: string, format: date-time }
 *         expira_em: { type: string, format: date-time }
 *         ativo: { type: boolean }
 */

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Métricas básicas da API
 *     description: Contadores simples de requisições (para debug em dev)
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: Métricas atuais
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRequests: { type: integer }
 *                 errors: { type: integer }
 */
