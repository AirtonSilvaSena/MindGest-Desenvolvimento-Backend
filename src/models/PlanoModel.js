const db = require('../config/db');

module.exports = {
  async create({ descricao, dias_acesso, ativo = 1 }) {
    const [res] = await db.query(
      'INSERT INTO planos (descricao, dias_acesso, ativo) VALUES (?, ?, ?)',
      [descricao, dias_acesso, ativo ? 1 : 0]
    );
    return res.insertId;
  },

  async update(id, { descricao, dias_acesso, ativo }) {
    const fields = [];
    const values = [];
    if (descricao !== undefined) { fields.push('descricao = ?'); values.push(descricao); }
    if (dias_acesso !== undefined) { fields.push('dias_acesso = ?'); values.push(Number(dias_acesso)); }
    if (ativo !== undefined) { fields.push('ativo = ?'); values.push(ativo ? 1 : 0); }
    if (!fields.length) return;
    values.push(id);
    await db.query(`UPDATE planos SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async getById(id) {
    const [rows] = await db.query('SELECT * FROM planos WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async getAllWithCounts() {
    const [rows] = await db.query(
      `SELECT p.*, IFNULL(u.cnt,0) AS ativos_count
       FROM planos p
       LEFT JOIN (
         SELECT plano_id, COUNT(*) AS cnt
         FROM usuario_licencas WHERE ativo = 1 GROUP BY plano_id
       ) u ON u.plano_id = p.id
       ORDER BY p.id DESC`
    );
    return rows;
  },

  async countUsersByPlanoId(planoId) {
    const [rows] = await db.query('SELECT COUNT(*) AS total FROM usuario_licencas WHERE plano_id = ? AND ativo = 1', [planoId]);
    return rows[0]?.total || 0;
  }
};

