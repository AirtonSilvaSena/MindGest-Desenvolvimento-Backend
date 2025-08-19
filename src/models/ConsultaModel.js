const db = require('../config/db'); 
// Importa a conexão com o banco de dados configurada em /config/db

const Consultas = {
  // Cria uma nova consulta
  async create(consulta) {
    const query = `
      INSERT INTO consultas
      (paciente_id, profissional_id, data_consulta, hora_inicio, duracao_minutos, telefone, email, valor_sessao, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    // Executa o INSERT no banco substituindo os ? pelos valores do objeto "consulta"
    const [result] = await db.execute(query, [
      consulta.paciente_id,
      consulta.profissional_id,
      consulta.data_consulta,
      consulta.hora_inicio,
      consulta.duracao_minutos,
      consulta.telefone,
      consulta.email,
      consulta.valor_sessao,
      consulta.observacoes || null // Se não vier observação, salva null
    ]);

    // Após inserir, retorna a consulta completa (com joins) pelo ID criado
    return this.findById(result.insertId);
  },

  // Busca uma consulta pelo ID
  async findById(id) {
    const query = `
      SELECT c.*, 
             p.nome AS paciente_nome,   -- Pega o nome do paciente
             pr.nome AS profissional_nome -- Pega o nome do profissional
      FROM consultas c
      JOIN pacientes p ON p.id = c.paciente_id
      LEFT JOIN usuarios pr ON pr.id = c.profissional_id
      WHERE c.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    return rows[0]; // Retorna o primeiro registro encontrado
  },

  // Lista todas consultas de um profissional específico
  async findAllByProfissional(profissional_id) {
    const query = `
      SELECT c.*, 
             p.nome AS paciente_nome,
             pr.nome AS profissional_nome
      FROM consultas c
      JOIN pacientes p ON p.id = c.paciente_id
      LEFT JOIN usuarios pr ON pr.id = c.profissional_id
      WHERE c.profissional_id = ?
      ORDER BY c.data_consulta, c.hora_inicio -- Ordena por data e hora
    `;
    const [rows] = await db.execute(query, [profissional_id]);
    return rows;
  },

  // Atualiza apenas o status da consulta (ex: CANCELADA, REALIZADA, etc.)
  async updateStatus(id, status) {
    const query = `UPDATE consultas SET status = ? WHERE id = ?`;
    await db.execute(query, [status, id]);
    return this.findById(id); // Retorna a consulta atualizada
  },

  // Atualiza todos os dados da consulta
  async update(id, dados) {
    const query = `
      UPDATE consultas
      SET paciente_id=?, data_consulta=?, hora_inicio=?, duracao_minutos=?, telefone=?, email=?, valor_sessao=?, observacoes=?
      WHERE id=? AND profissional_id=? -- Garante que só o dono (profissional) possa atualizar
    `;
    await db.execute(query, [
      dados.paciente_id,
      dados.data_consulta,
      dados.hora_inicio,
      dados.duracao_minutos,
      dados.telefone,
      dados.email,
      dados.valor_sessao,
      dados.observacoes,
      id,
      dados.profissional_id
    ]);
    return this.findById(id);
  },

  // Deleta uma consulta (somente se o profissional dono for o mesmo)
  async delete(id, profissional_id) {
    const query = `DELETE FROM consultas WHERE id = ? AND profissional_id = ?`;
    const [result] = await db.execute(query, [id, profissional_id]);
    return result.affectedRows > 0; // Retorna true se deletou, false se não
  },

  // Verifica se existe conflito de horário (sobreposição de consultas)
  async checkOverlap(profissional_id, data_consulta, hora_inicio, duracao_minutos) {
    // A lógica verifica se já existe uma consulta que:
    // - Seja no mesmo dia
    // - Do mesmo profissional
    // - Com status AGENDADA
    // - Que o horário inicial ou final conflite com a nova consulta
    const query = `
      SELECT *
      FROM consultas
      WHERE profissional_id = ?
        AND data_consulta = ?
        AND status = 'AGENDADA'
        AND (
          (hora_inicio < ADDTIME(?, SEC_TO_TIME(?*60)) -- A consulta existente começa antes da nova terminar
          AND ADDTIME(hora_inicio, SEC_TO_TIME(duracao_minutos*60)) > ?) -- E termina depois da nova começar
        )
    `;
    const [rows] = await db.execute(query, [
      profissional_id,
      data_consulta,
      hora_inicio,
      duracao_minutos,
      hora_inicio
    ]);
    return rows.length > 0; // Retorna true se houver conflito
  }
};

module.exports = Consultas; 
// Exporta o objeto para ser usado em controllers
