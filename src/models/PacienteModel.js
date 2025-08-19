const db = require("../config/db");

const Paciente = {
  /**
   * Buscar todos os pacientes do usuário logado
   * @param {number} profissional_id - id do usuário logado
   */
  async getAll(profissional_id) {
    const [rows] = await db.query(
      "SELECT * FROM pacientes WHERE profissional_id = ?",
      [profissional_id]
    );
    return rows;
  },

  /**
 * Buscar pacientes do usuário logado com filtro por nome, email ou telefone
 * Case-insensitive e lida com campos nulos
 * @param {number} profissional_id - id do usuário logado
 * @param {string} termo - termo a buscar (nome, email ou telefone)
 */
  async search(profissional_id, termo) {
    const likeTerm = `%${termo}%`.toLowerCase(); // transforma para minúsculo

    const [rows] = await db.query(
      `SELECT *
     FROM pacientes
     WHERE profissional_id = ?
       AND (
         LOWER(nome) LIKE ?
         OR (email IS NOT NULL AND LOWER(email) LIKE ?)
         OR LOWER(telefone) LIKE ?
       )`,
      [profissional_id, likeTerm, likeTerm, likeTerm]
    );

    return rows;
  },

  /**
   * Buscar um paciente pelo id, mas apenas se pertencer ao usuário logado
   * @param {number} id - id do paciente
   * @param {number} profissional_id - id do usuário logado
   */
  async getById(id, profissional_id) {
    const [rows] = await db.query(
      "SELECT * FROM pacientes WHERE id = ? AND profissional_id = ?",
      [id, profissional_id]
    );
    return rows[0];
  },

  /**
   * Criar um novo paciente vinculado ao usuário logado
   * @param {Object} pacienteData - dados do paciente
   * @param {number} profissional_id - id do usuário logado
   */
  async create({ nome, email, telefone, data_nascimento }, profissional_id) {

    // 1️⃣ Verifica se o email já existe (não nulo)
    if (email) {
      const [emailExists] = await db.query(
        "SELECT id FROM pacientes WHERE email = ?",
        [email]
      );
      if (emailExists.length > 0) {
        throw new Error("Este email já está cadastrado");
      }
    }

    // 2️⃣ Verifica se o telefone já existe
    const [telefoneExists] = await db.query(
      "SELECT id FROM pacientes WHERE telefone = ?",
      [telefone]
    );
    if (telefoneExists.length > 0) {
      throw new Error("Este telefone já está cadastrado");
    }

    // Inserimos profissional_id automaticamente
    const [result] = await db.query(
      "INSERT INTO pacientes (nome, email, telefone, data_nascimento, profissional_id) VALUES (?, ?, ?, ?, ?)",
      [nome, email, telefone, data_nascimento,profissional_id]
    );
    console.log("Result: ", result)
    return {
      id: result.insertId,
      nome,
      email,
      telefone,
      data_nascimento,
      profissional_id,
    };
  },

  /**
   * Atualizar paciente, garantindo que ele pertence ao usuário logado
   * @param {number} id - id do paciente
   * @param {Object} pacienteData - dados a atualizar
   * @param {number} profissional_id - id do usuário logado
   */
  async update(id, { nome, email, telefone, data_nascimento, ativo }, profissional_id) {
    const pacienteAtual = await this.getById(id, profissional_id);
    if (!pacienteAtual) {
      throw new Error("Paciente não encontrado ou não pertence ao profissional logado");
    }

    if (email && email !== pacienteAtual.email) {
      const [emailExists] = await db.query(
        "SELECT id FROM pacientes WHERE email = ? AND id != ?",
        [email, id]
      );
      if (emailExists.length > 0) {
        throw new Error("Este e-mail já está cadastrado em outro paciente");
      }
    }

    if (telefone && telefone !== pacienteAtual.telefone) {
      const [telefoneExists] = await db.query(
        "SELECT id FROM pacientes WHERE telefone = ? AND id != ?",
        [telefone, id]
      );
      if (telefoneExists.length > 0) {
        throw new Error("Este telefone já está cadastrado em outro paciente");
      }
    }
    // Só atualiza se o paciente pertencer ao profissional
    await db.query(
      `UPDATE pacientes
       SET nome = ?, email = ?, telefone = ?, data_nascimento =? , ativo = ?
       WHERE id = ? AND profissional_id = ?`,
      [nome, email, telefone, data_nascimento, ativo, id, profissional_id]
    );
    return this.getById(id, profissional_id);
  },

  /**
   * Deletar paciente, garantindo que ele pertence ao usuário logado
   * @param {number} id - id do paciente
   * @param {number} profissional_id - id do usuário logado
   */
  async delete(id, profissional_id) {
    // Só deleta se o paciente pertencer ao profissional
    const [result] = await db.query(
      "DELETE FROM pacientes WHERE id = ? AND profissional_id = ?",
      [id, profissional_id]
    );
    if (result.affectedRows === 0) {
      return { message: "Paciente não encontrado ou não pertence ao usuário" };
    }
    return { message: "Paciente excluído com sucesso" };
  },
};

module.exports = Paciente;
