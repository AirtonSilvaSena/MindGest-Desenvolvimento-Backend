const Delivery = require('../models/MessageDeliveryModel');
const logger = require('../utils/logger');
const { audit } = require('../services/auditService');

module.exports = {
  async list(req, res) {
    try {
      const userId = req.user.id;
      const { status = 'all', page, limit } = req.query || {};
      const itens = await Delivery.listInbox(userId, { status, page, limit });
      res.json(itens);
    } catch (e) {
      logger.error('inbox_list_error', { err: { message: e.message } });
      res.status(500).json({ message: 'Erro ao listar inbox' });
    }
  },

  async unreadCount(req, res) {
    try {
      const userId = req.user.id;
      const count = await Delivery.countUnread(userId);
      res.json({ count });
    } catch (e) {
      res.status(500).json({ message: 'Erro ao contar não lidas' });
    }
  },

  async show(req, res) {
    const userId = req.user.id;
    const { id } = req.params;
    const m = await Delivery.getInboxItem(userId, id);
    if (!m) return res.status(404).json({ message: 'Mensagem não encontrada' });
    res.json(m);
  },

  async markRead(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { read = true } = req.body || {};
      const ok = await Delivery.markRead(userId, id, !!read);
      if (!ok) return res.status(404).json({ message: 'Mensagem não encontrada' });
      const m = await Delivery.getInboxItem(userId, id);
      audit({ req, recurso: 'inbox', acao: read ? 'READ' : 'UNREAD', usuarioId: userId, entidadeId: Number(id), antes: null, depois: { lido_em: m?.lido_em || null } });
      res.json({ id: Number(id), lido_em: m?.lido_em || null });
    } catch (e) {
      res.status(500).json({ message: 'Erro ao alterar leitura' });
    }
  }
};

