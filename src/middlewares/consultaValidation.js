const { body, param } = require('express-validator');

// Criação de consulta
const createConsultaValidation = [
  body('paciente_id').isInt({ min: 1 }).withMessage('paciente_id inválido'),
  body('data_consulta').isISO8601().withMessage('data_consulta inválida'),
  body('hora_inicio').matches(/^\d{2}:\d{2}:\d{2}$/).withMessage('hora_inicio no formato HH:MM:SS'),
  body('duracao_minutos').isInt({ min: 1 }).withMessage('duracao_minutos deve ser > 0'),
  body('telefone').trim().notEmpty().withMessage('telefone é obrigatório').isLength({ max: 20 }).withMessage('telefone máx 20'),
  body('email').optional({ nullable: true }).isEmail().withMessage('email inválido'),
  body('valor_sessao').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('valor_sessao inválido'),
  body('observacoes').optional({ nullable: true }).isString()
];

// Atualização completa
const updateConsultaValidation = [
  param('id').isInt({ min: 1 }).withMessage('id inválido'),
  body('paciente_id').isInt({ min: 1 }).withMessage('paciente_id inválido'),
  body('data_consulta').isISO8601().withMessage('data_consulta inválida'),
  body('hora_inicio').matches(/^\d{2}:\d{2}:\d{2}$/).withMessage('hora_inicio no formato HH:MM:SS'),
  body('duracao_minutos').isInt({ min: 1 }).withMessage('duracao_minutos deve ser > 0'),
  body('telefone').trim().notEmpty().withMessage('telefone é obrigatório').isLength({ max: 20 }).withMessage('telefone máx 20'),
  body('email').optional({ nullable: true }).isEmail().withMessage('email inválido'),
  body('valor_sessao').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('valor_sessao inválido'),
  body('observacoes').optional({ nullable: true }).isString()
];

// Atualizar status
const statusConsultaValidation = [
  param('id').isInt({ min: 1 }).withMessage('id inválido'),
  body('status').isIn(['AGENDADA','REALIZADA','CANCELADA']).withMessage('status inválido')
];

// Param id
const idParamValidation = [ param('id').isInt({ min: 1 }).withMessage('id inválido') ];

module.exports = {
  createConsultaValidation,
  updateConsultaValidation,
  statusConsultaValidation,
  idParamValidation
};

