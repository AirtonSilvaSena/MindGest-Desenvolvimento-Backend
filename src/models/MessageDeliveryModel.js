const db = require('../config/db');

async function getActiveProfessionalUserIdsByIds(ids) {
  if (!ids || !ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT id FROM usuarios WHERE id IN (${placeholders}) AND tipo = 'profissional' AND ativo = 1`, ids
  );
  return rows.map(r => r.id);
}

async function getAllActiveProfessionalUserIds() {
  const [rows] = await db.query(`SELECT id FROM usuarios WHERE tipo = 'profissional' AND ativo = 1`);
  return rows.map(r => r.id);
}

module.exports = {
  async deliverToUsers(mensagem_id, usuario_ids) {
    const ids = await getActiveProfessionalUserIdsByIds(usuario_ids);
    if (!ids.length) return 0;
    const values = ids.map(uid => [mensagem_id, uid]);
    await db.query(
      `INSERT IGNORE INTO mensagens_destinatarios (mensagem_id, usuario_id) VALUES ?`, [values]
    );
    return ids.length;
  },

  async deliverToAllActiveProfessionals(mensagem_id) {
    const ids = await getAllActiveProfessionalUserIds();
    if (!ids.length) return 0;
    const values = ids.map(uid => [mensagem_id, uid]);
    await db.query(
      `INSERT IGNORE INTO mensagens_destinatarios (mensagem_id, usuario_id) VALUES ?`, [values]
    );
    return ids.length;
  },

  async listInbox(user_id, { status = 'all', page = 1, limit = 20 } = {}) {
    const off = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
    const where = ['md.usuario_id = ?'];
    const params = [user_id];
    if (status === 'unread') where.push('md.lido_em IS NULL');
    if (status === 'read') where.push('md.lido_em IS NOT NULL');
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const sql = `
      SELECT m.id, m.titulo, LEFT(m.corpo, 140) AS preview, m.tipo, md.criado_em AS recebido_em, md.lido_em
      FROM mensagens_destinatarios md
      INNER JOIN mensagens m ON m.id = md.mensagem_id
      ${whereSql}
      ORDER BY md.id DESC
      LIMIT ? OFFSET ?`;
    const [rows] = await db.query(sql, [...params, Math.max(1, Number(limit)), off]);
    return rows;
  },

  async getInboxItem(user_id, mensagem_id) {
    const [rows] = await db.query(
      `SELECT m.id, m.titulo, m.corpo, m.tipo, md.criado_em AS recebido_em, md.lido_em
       FROM mensagens_destinatarios md
       INNER JOIN mensagens m ON m.id = md.mensagem_id
       WHERE md.usuario_id = ? AND md.mensagem_id = ?
       LIMIT 1`, [user_id, mensagem_id]
    );
    return rows[0] || null;
  },

  async markRead(user_id, mensagem_id, read = true) {
    if (read) {
      const [res] = await db.query(
        `UPDATE mensagens_destinatarios SET lido_em = IFNULL(lido_em, NOW()) WHERE usuario_id = ? AND mensagem_id = ?`,
        [user_id, mensagem_id]
      );
      return res.affectedRows > 0;
    }
    const [res] = await db.query(
      `UPDATE mensagens_destinatarios SET lido_em = NULL WHERE usuario_id = ? AND mensagem_id = ?`,
      [user_id, mensagem_id]
    );
    return res.affectedRows > 0;
  },

  async countUnread(user_id) {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS total FROM mensagens_destinatarios WHERE usuario_id = ? AND lido_em IS NULL`, [user_id]
    );
    return rows[0]?.total || 0;
  }
};

