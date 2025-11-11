const Lic = require('../models/UsuarioLicencaModel');
const Plano = require('../models/PlanoModel');
const logger = require('../utils/logger');

module.exports = {
  async getActive(req, res) {
    try {
      const { id } = req.params;
      const active = await Lic.getActiveByUserId(id);
      if (!active) return res.status(404).json({ message: 'Licença ativa não encontrada' });
      return res.json(active);
    } catch (e) {
      logger.error('user_licenca_active_error', { err: { message: e.message } });
      return res.status(500).json({ message: 'Erro ao buscar licença ativa' });
    }
  },
  async list(req, res) {
    try {
      const { id } = req.params;
      const items = await Lic.listByUserId(id);
      return res.json(items);
    } catch (e) {
      logger.error('user_licenca_list_error', { err: { message: e.message } });
      return res.status(500).json({ message: 'Erro ao listar licenças do usuário' });
    }
  },
  async assign(req, res) {
    try {
      const { id } = req.params;
      const { plano_id } = req.body || {};
      const plano = await Plano.getById(plano_id);
      if (!plano || !plano.ativo) return res.status(422).json({ message: 'plano inválido ou inativo' });
      await Lic.activateNew(id, plano_id, plano.dias_acesso);
      const lic = await Lic.getActiveByUserId(id);
      return res.json({ message: 'Plano atribuído', licenca: lic });
    } catch (e) {
      logger.error('user_licenca_assign_error', { err: { message: e.message } });
      return res.status(500).json({ message: 'Erro ao atribuir plano' });
    }
  },
  async renew(req, res) {
    try {
      const { id } = req.params;
      const { add_days } = req.body || {};
      const add = Number(add_days || 0);
      if (!add || add <= 0) return res.status(422).json({ message: 'add_days deve ser > 0' });
      const ok = await Lic.renew(id, add);
      if (!ok) return res.status(404).json({ message: 'Licença ativa não encontrada' });
      const lic = await Lic.getActiveByUserId(id);
      return res.json({ message: 'Licença renovada', licenca: lic });
    } catch (e) {
      logger.error('user_licenca_renew_error', { err: { message: e.message } });
      return res.status(500).json({ message: 'Erro ao renovar licença' });
    }
  }
};

