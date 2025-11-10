const AuditModel = require('../models/AuditModel');
const UserModel = require('../models/UsuarioModel');

module.exports = {
  async index(req, res) {
    // Verifica privilégio via banco (token não possui tipo)
    const current = await UserModel.getById(req.user.id);
    if (!current || current.tipo !== 'admin') return res.status(403).json({ message: 'Acesso negado' });
    const { page, pageSize, recurso, acao, usuario_id, entidade_id, de, ate } = req.query;
    const items = await AuditModel.list({ page, pageSize, recurso, acao, usuario_id, entidade_id, de, ate });
    return res.json(items);
  },
  async show(req, res) {
    const current = await UserModel.getById(req.user.id);
    if (!current || current.tipo !== 'admin') return res.status(403).json({ message: 'Acesso negado' });
    const item = await AuditModel.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Registro não encontrado' });
    return res.json(item);
  }
};
