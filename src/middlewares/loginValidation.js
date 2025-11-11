const { body } = require('express-validator');

function onlyDigits(v) { return String(v || '').replace(/\D+/g, ''); }

// Login profissional (PF/PJ) usando CPF/CNPJ
const loginProfValidation = [
  body('pessoa_tipo').isIn(['PF','PJ']).withMessage('pessoa_tipo deve ser PF ou PJ'),
  body('cpf').custom((v, { req }) => {
    if (req.body.pessoa_tipo === 'PF') {
      const digits = onlyDigits(v);
      if (!digits || digits.length !== 11) throw new Error('cpf inválido');
    }
    return true;
  }),
  body('cnpj').custom((v, { req }) => {
    if (req.body.pessoa_tipo === 'PJ') {
      const digits = onlyDigits(v);
      if (!digits || digits.length !== 14) throw new Error('cnpj inválido');
    }
    return true;
  }),
  body('senha').notEmpty().isLength({ min: 8, max: 255 }).withMessage('senha inválida')
];

// Login admin com email/senha
const loginAdminValidation = [
  body('email').notEmpty().isEmail().withMessage('email inválido'),
  body('senha').notEmpty().isLength({ min: 8, max: 255 }).withMessage('senha inválida')
];

module.exports = { loginProfValidation, loginAdminValidation };

