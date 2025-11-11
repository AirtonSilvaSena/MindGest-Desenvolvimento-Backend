const db = require('../config/db');

module.exports = {
  async create({ titulo, corpo, tipo = 'outro', criado_por_admin_id }) {
    const [res] = await db.query(
      `INSERT INTO mensagens (titulo, corpo, tipo, criado_por_admin_id) VALUES (?, ?, ?, ?)`,
      [titulo, corpo, tipo, criado_por_admin_id]
    );
    return res.insertId;
  },

  async getById(id) {
    const [rows] = await db.query(`SELECT * FROM mensagens WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async update(id, { titulo, corpo, tipo }) {
    const fields = [];
    const values = [];
    if (titulo !== undefined) { fields.push('titulo = ?'); values.push(titulo); }
    if (corpo !== undefined) { fields.push('corpo = ?'); values.push(corpo); }
    if (tipo !== undefined) { fields.push('tipo = ?'); values.push(tipo); }
    if (!fields.length) return;
    const sql = `UPDATE mensagens SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    await db.query(sql, values);
  },

  async delete(id) {
    const [res] = await db.query(`DELETE FROM mensagens WHERE id = ?`, [id]);
    return res.affectedRows > 0;
  },

  async getAllWithStats({ tipo, q, page = 1, limit = 20 } = {}) {
    const off = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
    const where = [];
    const params = [];
    if (tipo) { where.push('m.tipo = ?'); params.push(tipo); }
    if (q) { where.push('(m.titulo LIKE ? OR m.corpo LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `
      SELECT m.*, 
        COUNT(md.id) AS total_destinatarios,
        SUM(CASE WHEN md.lido_em IS NULL THEN 1 ELSE 0 END) AS nao_lidos,
        SUM(CASE WHEN md.lido_em IS NOT NULL THEN 1 ELSE 0 END) AS lidos
      FROM mensagens m
      LEFT JOIN mensagens_destinatarios md ON md.mensagem_id = m.id
      ${whereSql}
      GROUP BY m.id
      ORDER BY m.id DESC
      LIMIT ? OFFSET ?`;
    const [rows] = await db.query(sql, [...params, Math.max(1, Number(limit)), off]);
    return rows;
  },

  async getStatsById(id) {
    const [rows] = await db.query(
      `SELECT 
        COUNT(md.id) AS total_destinatarios,
        SUM(CASE WHEN md.lido_em IS NULL THEN 1 ELSE 0 END) AS nao_lidos,
        SUM(CASE WHEN md.lido_em IS NOT NULL THEN 1 ELSE 0 END) AS lidos
      FROM mensagens_destinatarios md
      WHERE md.mensagem_id = ?`, [id]
    );
    return rows[0] || { total_destinatarios: 0, nao_lidos: 0, lidos: 0 };
  }
};

