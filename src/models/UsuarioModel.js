// Importa o pool de conexões com o banco configurado em ../config/db
const db = require('../config/db');

// Define os campos públicos que podem ser retornados nas consultas
const selectPublicFields = `
  id, nome, email, telefone, criado_em, atualizado_em
`;

module.exports = {
  // Função para buscar todos os usuários, ordenados do mais recente para o mais antigo
  async getAll() {
    const [rows] = await db.query(`SELECT ${selectPublicFields} FROM usuarios ORDER BY id DESC`);
    return rows; // Retorna array de usuários
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

  // Função para criar um novo usuário
  async create({ nome, email, senhaHash, telefone, tipo}) {
    const [result] = await db.query(
      `INSERT INTO usuarios (nome, email, senha, telefone, tipo) VALUES (?, ?, ?, ?, ?)`,
      [nome, email, senhaHash, telefone ?? null, tipo ?? 'cliente'] // Se telefone não for informado, envia null
                                                                    // se tipo nao for informado, envia cliente
    );
    return result.insertId; // Retorna o ID do novo usuário criado
  },

  // Função para atualizar um usuário
  async update(id, { nome, email, senhaHash, telefone }) {
    const fields = []; // Campos que serão atualizados
    const values = []; // Valores correspondentes aos campos

    // Adiciona cada campo se ele foi informado
    if (nome !== undefined) { fields.push('nome = ?'); values.push(nome); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email); }
    if (senhaHash !== undefined) { fields.push('senha = ?'); values.push(senhaHash); }
    if (telefone !== undefined) { fields.push('telefone = ?'); values.push(telefone); }

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
    const { senha, ...rest } = userRow; // Remove o campo 'senha'
    return rest; // Retorna o restante dos dados
  }
};
