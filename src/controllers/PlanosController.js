const Plano = require('../models/PlanoModel');
const Lic = require('../models/UsuarioLicencaModel');
const logger = require('../utils/logger');

module.exports = {
  async create(req, res) {
    try {
      const { descricao, dias_acesso, ativo } = req.body || {};
      if (!descricao || !dias_acesso) return res.status(422).json({ message: 'descricao e dias_acesso são obrigatórios' });
      const id = await Plano.create({ descricao, dias_acesso, ativo });
      const created = await Plano.getById(id);
      res.status(201).json(created);
    } catch (e) {
      logger.error('plano_create_error', { err: { message: e.message } });
      res.status(500).json({ message: 'Erro ao criar plano' });
    }
  },
  async index(_req, res) {
    const itens = await Plano.getAllWithCounts();
    res.json(itens);
  },
  async show(req, res) {
    const { id } = req.params;
    const p = await Plano.getById(id);
    if (!p) return res.status(404).json({ message: 'Plano não encontrado' });
    const count = await Plano.countUsersByPlanoId(id);
    res.json({ ...p, ativos_count: count });
  },
  async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await Plano.getById(id);
      if (!existing) return res.status(404).json({ message: 'Plano não encontrado' });
      const { descricao, dias_acesso, ativo } = req.body || {};
      await Plano.update(id, { descricao, dias_acesso, ativo });
      const updated = await Plano.getById(id);
      res.json(updated);
    } catch (e) {
      logger.error('plano_update_error', { err: { message: e.message } });
      res.status(500).json({ message: 'Erro ao atualizar plano' });
    }
  },
  // Atribui novo plano ao usuário (ativa nova licença)
  async assignToUser(req, res) {
    try {
      const { id } = req.params; // usuário id
      const { plano_id } = req.body || {};
      const plano = await Plano.getById(plano_id);
      if (!plano || !plano.ativo) return res.status(422).json({ message: 'plano inválido ou inativo' });
      await Lic.activateNew(id, plano_id, plano.dias_acesso);
      const lic = await Lic.getActiveByUserId(id);
      res.json({ message: 'Plano atribuído', licenca: lic });
    } catch (e) {
      logger.error('plano_assign_error', { err: { message: e.message } });
      res.status(500).json({ message: 'Erro ao atribuir plano' });
    }
  },
  // Renova licença do usuário (soma dias)
  async renewUser(req, res) {
    try {
      const { id } = req.params;
      const { add_days } = req.body || {};
      const add = Number(add_days || 0);
      if (!add || add <= 0) return res.status(422).json({ message: 'add_days deve ser > 0' });
      const ok = await Lic.renew(id, add);
      if (!ok) return res.status(404).json({ message: 'Licença ativa não encontrada' });
      const lic = await Lic.getActiveByUserId(id);
      res.json({ message: 'Licença renovada', licenca: lic });
    } catch (e) {
      logger.error('plano_renew_error', { err: { message: e.message } });
      res.status(500).json({ message: 'Erro ao renovar licença' });
    }
  }
};

