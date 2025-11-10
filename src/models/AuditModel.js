const db = require('../config/db');

module.exports = {
  async create({ recurso, acao, usuario_id, entidade_id, antes, depois, ip, user_agent }) {
    const [result] = await db.query(
      `INSERT INTO auditoria (recurso, acao, usuario_id, entidade_id, antes, depois, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [recurso, acao, usuario_id, entidade_id ?? null, JSON.stringify(antes ?? null), JSON.stringify(depois ?? null), ip ?? null, user_agent ?? null]
    );
    return result.insertId;
  },

  async findById(id) {
    const [rows] = await db.query(`SELECT * FROM auditoria WHERE id = ?`, [id]);
    return rows[0] || null;
  },

  async list({ page = 1, pageSize = 20, recurso, acao, usuario_id, entidade_id, de, ate }) {
    const where = [];
    const args = [];
    if (recurso) { where.push('recurso = ?'); args.push(recurso); }
    if (acao) { where.push('acao = ?'); args.push(acao); }
    if (usuario_id) { where.push('usuario_id = ?'); args.push(usuario_id); }
    if (entidade_id) { where.push('entidade_id = ?'); args.push(entidade_id); }
    if (de) { where.push('criado_em >= ?'); args.push(de); }
    if (ate) { where.push('criado_em <= ?'); args.push(ate); }

    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
    const limit = Math.max(1, Math.min(100, Number(pageSize)));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    const [rows] = await db.query(
      `SELECT * FROM auditoria ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...args, limit, offset]
    );
    return rows;
  }
};

