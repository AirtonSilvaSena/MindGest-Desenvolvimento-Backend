// Importa o pool de conexões com o banco configurado em ../config/db
const db = require('../config/db');

// Define os campos públicos que podem ser retornados nas consultas
const selectPublicFields = `
  id, nome, email, telefone, criado_em, atualizado_em, tipo, pessoa_tipo, empresa_nome, cpf, cnpj, must_reset_password, ativo
`;

module.exports = {
  // Busca todos os usuários; pode filtrar por tipo
  async getAll(options = {}) {
    const { tipo } = options || {};
    let sql = `SELECT ${selectPublicFields} FROM usuarios`;
    const params = [];
    if (tipo) { sql += ` WHERE tipo = ?`; params.push(tipo); }
    sql += ` ORDER BY id DESC`;
    const [rows] = await db.query(sql, params);
    return rows;
  },

  // Função para buscar um usuário pelo ID
  async getById(id) {
    // LIMIT 1 garante que só volte um registro
    const [rows] = await db.query(`SELECT * FROM usuarios WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null; // Retorna o usuário ou null se não existir
  },

  // Função para buscar um usuário pelo email
  async getByEmail(email) {
    const [rows] = await db.query(`SELECT * FROM usuarios WHERE email = ? LIMIT 1`, [email]);
    return rows[0] || null; // Retorna o usuário ou null se não existir
  },

  // Busca usuário PF por CPF
  async getByCpf(cpf) {
    const [rows] = await db.query(`SELECT * FROM usuarios WHERE pessoa_tipo = 'PF' AND cpf = ? LIMIT 1`, [cpf]);
    return rows[0] || null;
  },

  // Busca usuário PJ por CNPJ
  async getByCnpj(cnpj) {
    const [rows] = await db.query(`SELECT * FROM usuarios WHERE pessoa_tipo = 'PJ' AND cnpj = ? LIMIT 1`, [cnpj]);
    return rows[0] || null;
  },

  async count() {
    const [rows] = await db.query(`SELECT COUNT(*) AS total FROM usuarios`);
    return rows[0]?.total || 0;
  },

  // Função para criar um novo usuário
  async create({ nome, email, senhaHash, telefone, tipo, pessoa_tipo, cpf, cnpj, empresa_nome, must_reset_password }) {
    const [result] = await db.query(
      `INSERT INTO usuarios (nome, email, senha, telefone, tipo, pessoa_tipo, cpf, cnpj, empresa_nome, must_reset_password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nome, email, senhaHash, telefone ?? null, tipo ?? 'profissional', pessoa_tipo, cpf ?? null, cnpj ?? null, empresa_nome ?? null, must_reset_password ? 1 : 0]
    );
    return result.insertId; // Retorna o ID do novo usuário criado
  },

  // Função para atualizar um usuário
  async update(id, { nome, email, senhaHash, telefone, empresa_nome, ativo }) {
    const fields = []; // Campos que serão atualizados
    const values = []; // Valores correspondentes aos campos

    // Adiciona cada campo se ele foi informado
    if (nome !== undefined) { fields.push('nome = ?'); values.push(nome); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email); }
    if (senhaHash !== undefined) { fields.push('senha = ?'); values.push(senhaHash); }
    if (telefone !== undefined) { fields.push('telefone = ?'); values.push(telefone); }
    if (empresa_nome !== undefined) { fields.push('empresa_nome = ?'); values.push(empresa_nome); }
    if (ativo !== undefined) { fields.push('ativo = ?'); values.push(ativo ? 1 : 0); }

    if (fields.length === 0) return; // Se nenhum campo foi passado, não faz nada

    // Monta a query dinâmica
    const sql = `UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id); // Adiciona o ID no final para o WHERE
    await db.query(sql, values); // Executa a query de atualização
  },

  // Função para deletar um usuário pelo ID
  async delete(id) {
    const [result] = await db.query(`DELETE FROM usuarios WHERE id = ?`, [id]);
    return result.affectedRows > 0; // Retorna true se algum registro foi deletado
  },

  // Função para retornar apenas os dados públicos do usuário (sem senha)
  toPublic(userRow) {
    if (!userRow) return null;
    const { senha, cpf, cnpj, ...rest } = userRow; // Remove o campo 'senha'
    // Mascarar CPF/CNPJ quando presentes
    const mask = (v, type) => {
      if (!v) return v;
      const only = String(v).replace(/\D+/g, '');
      if (type === 'CPF' && only.length === 11) return `***.${only.slice(3,6)}.${only.slice(6,9)}-**`;
      if (type === 'CNPJ' && only.length === 14) return `**.${only.slice(2,5)}.${only.slice(5,8)}/****-**`;
      return '***';
    };
    return { ...rest, cpf: mask(cpf, 'CPF'), cnpj: mask(cnpj, 'CNPJ') };
  },

  // Variante que mantém CPF/CNPJ sem máscara (uso em respostas admin/self)
  toPublicWithSensitive(userRow) {
    if (!userRow) return null;
    const { senha, ...rest } = userRow;
    return { ...rest };
  }
};
