const UserModel = require('../models/UsuarioModel');

module.exports = async function requireAdmin(req, res, next) {
  try {
    const current = await UserModel.getById(req.user.id);
    if (!current || current.tipo !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    // Propaga o papel para uso posterior em controllers
    if (!req.user) req.user = {};
    req.user.tipo = 'admin';
    next();
  } catch (e) {
    return res.status(500).json({ message: 'Erro interno' });
  }
};
