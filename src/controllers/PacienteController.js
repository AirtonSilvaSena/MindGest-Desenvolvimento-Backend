// Importa o model do paciente
const Paciente = require("../models/PacienteModel");

const pacienteController = {
  /**
   * Listar todos os pacientes do usuário logado
   * @param {Object} req - Requisição HTTP
   * @param {Object} res - Resposta HTTP
   */
  async listar(req, res) {
    try {
      // Pega o id do usuário logado (definido pelo middleware de autenticação)
      const profissional_id = req.user.id;

      // Chama o model para buscar todos os pacientes desse profissional
      const pacientes = await Paciente.getAll(profissional_id);

      // Retorna a lista de pacientes em JSON
      res.json(pacientes);
    } catch (error) {
      // Em caso de erro, retorna status 500 com a mensagem de erro
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Buscar um paciente pelo ID, apenas se pertencer ao usuário logado
   */
  async buscarPorId(req, res) {
    try {
      const profissional_id = req.user.id;
      const paciente = await Paciente.getById(req.params.id, profissional_id);

      // Se não existir paciente ou não pertencer ao usuário, retorna 404
      if (!paciente) {
        return res.status(404).json({ error: "Paciente não encontrado" });
      }

      res.json(paciente);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Criar um novo paciente vinculado ao usuário logado
   */
  async criar(req, res) {
    try {
      //console.log("Req: ", req.user)
      const profissional_id = req.user.id;

      //console.log("User Id: ", req.user.id)
      // Passa apenas os campos que devem ser preenchidos pelo usuário
      const { nome, email, telefone, data_nascimento } = req.body;
       console.log("req body: ", req.body);
      // Cria o paciente usando o model
      const novo = await Paciente.create({ nome, email, telefone, data_nascimento }, profissional_id);

      // Retorna status 201 (criado) com os dados do paciente
      res.status(201).json(novo);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Atualizar paciente, garantindo que ele pertence ao usuário logado
   */
  async atualizar(req, res) {
    try {
      const profissional_id = req.user.id;
      const { nome, email, telefone, data_nascimento, ativo } = req.body;

      // Atualiza apenas se o paciente pertencer ao usuário
      const atualizado = await Paciente.update(
        req.params.id,
        { nome, email, telefone, data_nascimento, ativo },profissional_id
      );

      // Se paciente não existir ou não pertencer ao usuário, retorna 404
      if (!atualizado) {
        return res.status(404).json({ error: "Paciente não encontrado ou não pertence ao usuário" });
      }

      res.json(atualizado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Excluir paciente, garantindo que ele pertence ao usuário logado
   */
  async excluir(req, res) {
    try {
      const profissional_id = req.user.id;

      // Tenta deletar o paciente
      const result = await Paciente.delete(req.params.id, profissional_id);

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Pesquisar paciente, garantindo que ele pertence ao usuário logado
   */
  async pesquisar(req, res) {
    try {
      const termo = req.query.q || ""; // pega da query string ?q=joao
      const pacientes = await Paciente.search(req.user.id, termo);
      res.json(pacientes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

};

// Exporta o controller para ser usado nas rotas
module.exports = pacienteController;
