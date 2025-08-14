// Importa a função validationResult do express-validator
// Ela é usada para coletar os resultados das validações definidas nas rotas
const { validationResult } = require('express-validator');

// Exporta uma função middleware para tratar erros de validação
module.exports = function handleValidation(req, res, next) {
  // Pega os resultados da validação do request (req) atual
  const errors = validationResult(req);

  // Se não houver erros de validação, passa para o próximo middleware/rota
  if (errors.isEmpty()) return next();

  // Se houver erros, retorna resposta 422 (Unprocessable Entity) com os detalhes
  return res.status(422).json({
    message: 'Erro de validação',          // Mensagem geral de erro
    errors: errors.array().map(e => ({     // Mapeia cada erro para um formato legível
      field: e.path,                        // Campo que gerou o erro
      msg: e.msg                             // Mensagem de validação associada
    }))
  });
};
