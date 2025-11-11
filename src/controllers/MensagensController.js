const Message = require('../models/MessageModel');
const Delivery = require('../models/MessageDeliveryModel');
const logger = require('../utils/logger');
const { audit } = require('../services/auditService');

module.exports = {
  async create(req, res) {
    try {
      const { titulo, corpo, tipo = 'outro', destino, usuario_ids, sendEmail } = req.body || {};
      if (!titulo || !corpo) return res.status(422).json({ message: 'titulo e corpo são obrigatórios' });
      if (!destino || !['todos', 'por_ids'].includes(destino)) return res.status(422).json({ message: 'destino inválido' });
      if (destino === 'por_ids' && (!Array.isArray(usuario_ids) || usuario_ids.length === 0)) {
        return res.status(422).json({ message: 'usuario_ids obrigatório quando destino="por_ids"' });
      }

      const criado_por_admin_id = req.user.id;
      const id = await Message.create({ titulo, corpo, tipo, criado_por_admin_id });

      let entregues = 0;
      if (destino === 'todos') {
        entregues = await Delivery.deliverToAllActiveProfessionals(id);
      } else {
        entregues = await Delivery.deliverToUsers(id, usuario_ids);
      }

      // Audit
      audit({ req, recurso: 'mensagens', acao: 'CREATE', usuarioId: criado_por_admin_id, entidadeId: id, antes: null, depois: { titulo, tipo, destino, entregues } });

      // E-mail opcional (stub)
      if (sendEmail) {
        logger.info('inbox_email_stub', { mensagem_id: id, entregues });
      }

      const mensagem = await Message.getById(id);
      res.status(201).json({ mensagem, entregues });
    } catch (e) {
      logger.error('mensagem_create_error', { err: { message: e.message } });
      res.status(500).json({ message: 'Erro ao criar mensagem' });
    }
  },

  async index(req, res) {
    try {
      const { tipo, q, page, limit } = req.query;
      const itens = await Message.getAllWithStats({ tipo, q, page, limit });
      res.json(itens);
    } catch (e) {
      res.status(500).json({ message: 'Erro ao listar mensagens' });
    }
  },

  async show(req, res) {
    const { id } = req.params;
    const m = await Message.getById(id);
    if (!m) return res.status(404).json({ message: 'Mensagem não encontrada' });
    const stats = await Message.getStatsById(id);
    res.json({ ...m, ...stats });
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await Message.getById(id);
      if (!existing) return res.status(404).json({ message: 'Mensagem não encontrada' });
      const { titulo, corpo, tipo } = req.body || {};
      await Message.update(id, { titulo, corpo, tipo });
      const updated = await Message.getById(id);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: 'Erro ao atualizar mensagem' });
    }
  },

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const existing = await Message.getById(id);
      if (!existing) return res.status(404).json({ message: 'Mensagem não encontrada' });
      await Message.delete(id);
      res.status(204).end();
    } catch (e) {
      res.status(500).json({ message: 'Erro ao remover mensagem' });
    }
  }
};

