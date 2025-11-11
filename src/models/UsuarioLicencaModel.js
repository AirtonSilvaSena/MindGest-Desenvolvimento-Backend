const db = require('../config/db');

module.exports = {
  async getActiveByUserId(usuarioId) {
    const [rows] = await db.query(
      `SELECT ul.*, p.descricao, p.dias_acesso, p.ativo AS plano_ativo
       FROM usuario_licencas ul
       JOIN planos p ON p.id = ul.plano_id
       WHERE ul.usuario_id = ? AND ul.ativo = 1
       ORDER BY ul.id DESC LIMIT 1`,
      [usuarioId]
    );
    return rows[0] || null;
  },
  async listByUserId(usuarioId) {
    const [rows] = await db.query(
      `SELECT ul.*, p.descricao, p.dias_acesso, p.ativo AS plano_ativo
       FROM usuario_licencas ul
       JOIN planos p ON p.id = ul.plano_id
       WHERE ul.usuario_id = ?
       ORDER BY ul.id DESC`,
      [usuarioId]
    );
    return rows || [];
  },

  async deactivateAll(usuarioId) {
    await db.query('UPDATE usuario_licencas SET ativo = 0 WHERE usuario_id = ? AND ativo = 1', [usuarioId]);
  },

  async activateNew(usuarioId, planoId, dias) {
    const [rows] = await db.query('SELECT NOW() AS now');
    const now = rows[0].now;
    // expira_em = now + dias
    await this.deactivateAll(usuarioId);
    const [res] = await db.query(
      'INSERT INTO usuario_licencas (usuario_id, plano_id, emitido_em, expira_em, ativo) VALUES (?, ?, ?, DATE_ADD(?, INTERVAL ? DAY), 1)',
      [usuarioId, planoId, now, now, Number(dias)]
    );
    return res.insertId;
  },

  async renew(usuarioId, addDays) {
    const active = await this.getActiveByUserId(usuarioId);
    if (!active) return null;
    const [res] = await db.query(
      'UPDATE usuario_licencas SET expira_em = DATE_ADD(expira_em, INTERVAL ? DAY) WHERE id = ? AND ativo = 1',
      [Number(addDays), active.id]
    );
    return res.affectedRows > 0;
  }
};

