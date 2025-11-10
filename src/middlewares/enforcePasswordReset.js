const logger = require('../utils/logger');

// Middleware que bloqueia acesso se o usuário precisar trocar a senha
module.exports = function enforcePasswordReset() {
  // whitelist de caminhos que podem ser acessados sem trocar a senha
  const allowed = new Set([
    '/api/v1/usuarios/login',
    '/api/v1/usuarios/me/senha',
    '/health',
    '/metrics'
  ]);

  return async function (req, res, next) {
    try {
      // Requests públicos não têm req.user
      if (!req.user) return next();
      // Se caminho for permitido, segue
      if (allowed.has(req.path)) return next();

      const UserModel = require('../models/UsuarioModel');
      const u = await UserModel.getById(req.user.id);
      if (u && u.must_reset_password) {
        logger.info('force_password_reset_block', { userId: u.id, path: req.originalUrl });
        return res.status(403).json({ message: 'Necessário alterar a senha antes de continuar', mustResetPassword: true });
      }
      next();
    } catch (e) {
      return res.status(500).json({ message: 'Erro interno' });
    }
  };
};

