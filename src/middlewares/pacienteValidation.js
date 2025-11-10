// Validações de Paciente usando express-validator
const { body, param, query } = require('express-validator');

// Criação: campos obrigatórios e formatos básicos
const createPacienteValidation = [
  body('nome').trim().notEmpty().withMessage('nome é obrigatório').isLength({ max: 100 }).withMessage('nome máx 100'),
  body('telefone').trim().notEmpty().withMessage('telefone é obrigatório').isLength({ max: 20 }).withMessage('telefone máx 20'),
  body('data_nascimento').trim().notEmpty().withMessage('data_nascimento é obrigatório').isISO8601().withMessage('data_nascimento inválida'),
  body('email').optional({ nullable: true }).isEmail().withMessage('email inválido').isLength({ max: 150 }).withMessage('email máx 150')
];

// Atualização: id válido, pelo menos um campo permitido, valida formatos
const updatePacienteValidation = [
  param('id').isInt({ min: 1 }).withMessage('id inválido'),
  body().custom((b) => {
    const allowed = ['nome', 'email', 'telefone', 'data_nascimento', 'ativo'];
    const keys = Object.keys(b || {});
    if (!keys.some(k => allowed.includes(k))) throw new Error('Nenhum campo para atualizar');
    return true;
  }),
  body('nome').optional().trim().isLength({ max: 100 }).withMessage('nome máx 100'),
  body('telefone').optional().trim().isLength({ max: 20 }).withMessage('telefone máx 20'),
  body('data_nascimento').optional().isISO8601().withMessage('data_nascimento inválida'),
  body('email').optional({ nullable: true }).isEmail().withMessage('email inválido').isLength({ max: 150 }).withMessage('email máx 150'),
  body('ativo').optional().isBoolean().withMessage('ativo deve ser boolean')
];

// Param id genérico
const idParamValidation = [ param('id').isInt({ min: 1 }).withMessage('id inválido') ];

// Pesquisa: aceita filtros opcionais
const searchPacienteValidation = [
  query('nome').optional().isString(),
  query('email').optional().isEmail().withMessage('email inválido'),
  query('telefone').optional().isString()
];

module.exports = {
  createPacienteValidation,
  updatePacienteValidation,
  idParamValidation,
  searchPacienteValidation
};
