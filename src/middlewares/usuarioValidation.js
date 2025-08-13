// Importa as funções body e param do express-validator
// body é usado para validar campos no corpo da requisição
// param é usado para validar parâmetros da URL
const { body, param } = require('express-validator');

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

  // Validação do campo 'senha'
  senha: body('senha')
    .notEmpty().withMessage('senha é obrigatória') // Obrigatório
    .isLength({ min: 8, max: 255 }).withMessage('senha deve ter entre 8 e 255 caracteres'), // Tamanho mínimo e máximo

  // Validação do campo 'telefone'
  telefone: body('telefone')
    .optional({ nullable: true }) // Campo opcional, pode ser null
    .isLength({ max: 20 }).withMessage('telefone deve ter no máximo 20 caracteres') // Tamanho máximo
};

// Validações para criação de usuário
const createUserValidation = [
  common.nome,
  common.email,
  common.senha,
  common.telefone
];

// Validações para atualização de usuário
const updateUserValidation = [
  // Valida o parâmetro 'id' da URL
  param('id').isInt({ min: 1 }).withMessage('id inválido'),

  // Validação customizada para garantir que ao menos um campo válido seja enviado
  body().custom(body => {
    const allowed = ['nome', 'email', 'senha', 'telefone']; // Campos permitidos
    const keys = Object.keys(body || {}); // Campos enviados na requisição
    const hasAllowed = keys.some(k => allowed.includes(k)); // Verifica se tem pelo menos 1
    if (!hasAllowed) {
      throw new Error('Nenhum campo para atualizar (nome, email, senha, telefone)');
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
  idParamValidation
};
