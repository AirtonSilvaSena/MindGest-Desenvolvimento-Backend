// Importa o model do paciente
const Paciente = require("../models/PacienteModel");
const { audit } = require('../services/auditService');
const logger = require('../utils/logger');

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
      logger.error('paciente_listar_error', { err: { message: error.message } });
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
      logger.error('paciente_buscarPorId_error', { err: { message: error.message } });
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
      await audit({ req, recurso: 'paciente', acao: 'CREATE', usuarioId: profissional_id, entidadeId: novo.id, antes: null, depois: novo });

      // Retorna status 201 (criado) com os dados do paciente
      res.status(201).json(novo);
    } catch (error) {
      logger.error('paciente_criar_error', { err: { message: error.message } });
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

      await audit({ req, recurso: 'paciente', acao: 'UPDATE', usuarioId: profissional_id, entidadeId: atualizado?.id || Number(req.params.id), antes: null, depois: atualizado });
      res.json(atualizado);
    } catch (error) {
      logger.error('paciente_atualizar_error', { err: { message: error.message } });
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
      const id = req.params.id;
      const antes = await Paciente.getById(id, profissional_id).catch(() => null);
      const result = await Paciente.delete(id, profissional_id);
      if (result && result.message && result.message.toLowerCase().includes('sucesso')) {
        await audit({ req, recurso: 'paciente', acao: 'DELETE', usuarioId: profissional_id, entidadeId: Number(id), antes, depois: null });
      }

      res.json(result);
    } catch (error) {
      logger.error('paciente_excluir_error', { err: { message: error.message } });
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
      logger.error('paciente_pesquisar_error', { err: { message: error.message } });
      res.status(500).json({ error: error.message });
    }
  }

};

// Exporta o controller para ser usado nas rotas
module.exports = pacienteController;
