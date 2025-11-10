// Importa as funções body e param do express-validator
// body é usado para validar campos no corpo da requisição
// param é usado para validar parâmetros da URL
const { body, param } = require('express-validator');

function onlyDigits(v) { return String(v || '').replace(/\D+/g, ''); }

const cpfValidator = body('cpf').custom((value, { req }) => {
  const tipo = req.body.pessoa_tipo;
  if (tipo === 'PF') {
    const digits = onlyDigits(value);
    if (!digits || digits.length !== 11) throw new Error('cpf inválido');
  } else if (value !== undefined && value !== null && value !== '') {
    throw new Error('cpf não permitido para PJ');
  }
  return true;
});

const cnpjValidator = body('cnpj').custom((value, { req }) => {
  const tipo = req.body.pessoa_tipo;
  if (tipo === 'PJ') {
    const digits = onlyDigits(value);
    if (!digits || digits.length !== 14) throw new Error('cnpj inválido');
  } else if (value !== undefined && value !== null && value !== '') {
    throw new Error('cnpj não permitido para PF');
  }
  return true;
});

// Define validações comuns que podem ser reutilizadas
const common = {
  // Validação do campo 'nome'
  nome: body('nome')
    .trim() // Remove espaços no início e fim
    .notEmpty().withMessage('nome é obrigatório') // Não pode ser vazio
    .isLength({ max: 100 }).withMessage('nome deve ter no máximo 100 caracteres'), // Tamanho máximo

  // Validação do campo 'email'
  email: body('email')
    .trim()
    .notEmpty().withMessage('email é obrigatório') // Obrigatório
    .isEmail().withMessage('email inválido') // Deve ser email válido
    .isLength({ max: 150 }).withMessage('email deve ter no máximo 150 caracteres'), // Tamanho máximo

  // Validação do campo 'senha' (opcional na criação via admin; gerada automaticamente)
  senha: body('senha')
    .optional()
    .isLength({ min: 8, max: 255 }).withMessage('senha deve ter entre 8 e 255 caracteres'),

  // Validação do campo 'telefone'
  telefone: body('telefone')
    .optional({ nullable: true }) // Campo opcional, pode ser null
    .isLength({ max: 20 }).withMessage('telefone deve ter no máximo 20 caracteres') // Tamanho máximo
};

// Validações para criação de usuário
const createUserValidation = [
  body('pessoa_tipo').isIn(['PF','PJ']).withMessage('pessoa_tipo deve ser PF ou PJ'),
  // Nome (PF) obrigatório
  body('nome').custom((v, { req }) => {
    if (req.body.pessoa_tipo === 'PF') {
      if (!v || String(v).trim() === '') throw new Error('nome é obrigatório para PF');
      if (String(v).length > 100) throw new Error('nome deve ter no máximo 100 caracteres');
    } else if (v) {
      // Para PJ, se vier, validamos tamanho mas não exigimos
      if (String(v).length > 100) throw new Error('nome deve ter no máximo 100 caracteres');
    }
    return true;
  }),
  // Empresa (PJ)
  body('empresa_nome').custom((v, { req }) => {
    if (req.body.pessoa_tipo === 'PJ') {
      if (!v || String(v).trim() === '') throw new Error('empresa_nome é obrigatório para PJ');
      if (String(v).length > 150) throw new Error('empresa_nome deve ter no máximo 150');
    } else if (v) {
      throw new Error('empresa_nome não permitido para PF');
    }
    return true;
  }),
  common.email,
  common.telefone,
  cpfValidator,
  cnpjValidator
];

// Validações para atualização de usuário
const updateUserValidation = [
  // Valida o parâmetro 'id' da URL
  param('id').isInt({ min: 1 }).withMessage('id inválido'),

  // Validação customizada para garantir que ao menos um campo válido seja enviado
  body().custom(body => {
    const allowed = ['nome', 'email', 'senha', 'telefone', 'empresa_nome', 'ativo']; // Campos permitidos
    const keys = Object.keys(body || {}); // Campos enviados na requisição
    const hasAllowed = keys.some(k => allowed.includes(k)); // Verifica se tem pelo menos 1
    if (!hasAllowed) {
      throw new Error('Nenhum campo para atualizar (nome, email, senha, telefone, empresa_nome, ativo)');
    }
    return true;
  }),

  // Validações opcionais de cada campo (podem ser enviados ou não)
  body('nome')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('nome deve ter no máximo 100 caracteres'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('email inválido')
    .isLength({ max: 150 }).withMessage('email deve ter no máximo 150 caracteres'),
  body('senha')
    .optional()
    .isLength({ min: 8, max: 255 }).withMessage('senha deve ter entre 8 e 255 caracteres'),
  body('telefone')
    .optional({ nullable: true })
    .isLength({ max: 20 }).withMessage('telefone deve ter no máximo 20 caracteres')
];

// Validação apenas do parâmetro 'id' para rotas que recebem um ID
const idParamValidation = [
  param('id').isInt({ min: 1 }).withMessage('id inválido')
];

// Exporta todas as validações para serem usadas nas rotas
module.exports = {
  createUserValidation,
  updateUserValidation,
  idParamValidation,
  changePasswordValidation: [
    body('senha_atual').notEmpty().withMessage('senha_atual é obrigatória'),
    body('nova_senha').notEmpty().isLength({ min: 8, max: 255 }).withMessage('nova_senha inválida')
  ]
};
