const UserModel = require('../models/UsuarioModel');

module.exports = async function requireAdmin(req, res, next) {
  try {
    const current = await UserModel.getById(req.user.id);
    if (!current || current.tipo !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    next();
  } catch (e) {
    return res.status(500).json({ message: 'Erro interno' });
  }
};

