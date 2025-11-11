const Lic = require('../models/UsuarioLicencaModel');

// Bloqueia acesso de profissionais sem licença válida
module.exports = function enforceLicense() {
  const allowed = new Set([
    '/api/v1/usuarios/login',
    '/api/v1/usuarios/login-admin',
    '/api/v1/usuarios/me/senha',
    '/health',
    '/metrics'
  ]);
  return async function (req, res, next) {
    try {
      if (!req.user) return next();
      // Admin não é bloqueado por licença
      if (req.user.tipo === 'admin') return next();
      if (allowed.has(req.path)) return next();
      const lic = await Lic.getActiveByUserId(req.user.id);
      if (!lic || !lic.plano_ativo) {
        return res.status(403).json({ message: 'Plano inativo ou licença ausente', mustRenew: true });
      }
      const now = Date.now();
      const exp = new Date(lic.expira_em).getTime();
      if (exp <= now) {
        return res.status(403).json({ message: 'Licença expirada', mustRenew: true, expiresAt: lic.expira_em });
      }
      next();
    } catch (e) {
      return res.status(500).json({ message: 'Erro de verificação de licença' });
    }
  };
};

