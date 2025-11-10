const Consultas = require('../models/ConsultaModel'); // Importa o model de consultas, onde ficam as queries SQL
const { audit } = require('../services/auditService');
const logger = require('../utils/logger');

const consultasController = {
  // Criação de uma nova consulta
  async create(req, res) {
    try {
      // Extrai os campos enviados no body da requisição
      const { paciente_id, data_consulta, hora_inicio, duracao_minutos, telefone, email, valor_sessao, observacoes } = req.body;
      const profissional_id = req.user.id; // ID do profissional autenticado (vem do middleware de autenticação)

      // Validação de campos obrigatórios
      if (!paciente_id || !data_consulta || !hora_inicio || !duracao_minutos || !telefone) {
        return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
      }

      // Validação da duração da consulta
      if (duracao_minutos <= 0) {
        return res.status(400).json({ message: 'A duração deve ser maior que 0.' });
      }

      // Verifica se já existe outra consulta no mesmo horário para este profissional
      const overlap = await Consultas.checkOverlap(profissional_id, data_consulta, hora_inicio, duracao_minutos);
      if (overlap) {
        return res.status(400).json({ message: 'Já existe uma consulta nesse horário para este profissional.' });
      }

      // Cria a nova consulta
      const novaConsulta = await Consultas.create({
        paciente_id,
        profissional_id,
        data_consulta,
        hora_inicio,
        duracao_minutos,
        telefone,
        email,
        valor_sessao,
        observacoes
      });

      // Retorna a consulta criada
      await audit({ req, recurso: 'consulta', acao: 'CREATE', usuarioId: profissional_id, entidadeId: novaConsulta.id, antes: null, depois: novaConsulta });
      res.status(201).json(novaConsulta);
    } catch (err) {
      logger.error('consulta_create_error', { err: { message: err.message } });
      res.status(500).json({ message: 'Erro ao criar consulta.' });
    }
  },

  // Lista todas as consultas do profissional autenticado
  async list(req, res) {
    try {
      const profissional_id = req.user.id;
      const consultas = await Consultas.findAllByProfissional(profissional_id);
      res.json(consultas);
    } catch (err) {
      logger.error('consulta_list_error', { err: { message: err.message } });
      res.status(500).json({ message: 'Erro ao listar consultas.' });
    }
  },

  // Busca uma consulta pelo ID
  async getById(req, res) {
    try {
      const consulta = await Consultas.findById(req.params.id);
      if (!consulta) return res.status(404).json({ message: 'Consulta não encontrada.' });

      // Garante que a consulta só pode ser acessada pelo dono (profissional que a criou)
      if (consulta.profissional_id !== req.user.id) {
        return res.status(403).json({ message: 'Acesso negado.' });
      }

      res.json(consulta);
    } catch (err) {
      logger.error('consulta_getById_error', { err: { message: err.message } });
      res.status(500).json({ message: 'Erro ao buscar consulta.' });
    }
  },

  // Atualiza todos os dados de uma consulta
  async update(req, res) {
    try {
      const profissional_id = req.user.id;
      const { paciente_id, data_consulta, hora_inicio, duracao_minutos, telefone, email, valor_sessao, observacoes } = req.body;

      // Atualiza a consulta
      const consultaAtualizada = await Consultas.update(req.params.id, {
        paciente_id,
        data_consulta,
        hora_inicio,
        duracao_minutos,
        telefone,
        email,
        valor_sessao,
        observacoes,
        profissional_id
      });

      if (!consultaAtualizada) return res.status(404).json({ message: 'Consulta não encontrada ou sem permissão.' });

      await audit({ req, recurso: 'consulta', acao: 'UPDATE', usuarioId: profissional_id, entidadeId: Number(req.params.id), antes: null, depois: consultaAtualizada });
      res.json(consultaAtualizada);
    } catch (err) {
      logger.error('consulta_update_error', { err: { message: err.message } });
      res.status(500).json({ message: 'Erro ao atualizar consulta.' });
    }
  },

  // Atualiza somente o status da consulta
  async updateStatus(req, res) {
    try {
      const { status } = req.body;

      // Valida se o status enviado é válido
      if (!['AGENDADA','REALIZADA','CANCELADA'].includes(status)) {
        return res.status(400).json({ message: 'Status inválido.' });
      }

      // Busca a consulta no banco
      const consulta = await Consultas.findById(req.params.id);
      if (!consulta) return res.status(404).json({ message: 'Consulta não encontrada.' });

      // Verifica se o profissional autenticado é o dono da consulta
      if (consulta.profissional_id !== req.user.id) {
        return res.status(403).json({ message: 'Acesso negado.' });
      }

      // Atualiza o status
      const consultaAtualizada = await Consultas.updateStatus(req.params.id, status);
      await audit({ req, recurso: 'consulta', acao: 'STATUS', usuarioId: req.user.id, entidadeId: Number(req.params.id), antes: consulta, depois: consultaAtualizada });
      res.json(consultaAtualizada);
    } catch (err) {
      logger.error('consulta_update_status_error', { err: { message: err.message } });
      res.status(500).json({ message: 'Erro ao atualizar status.' });
    }
  },

  // Remove uma consulta
  async delete(req, res) {
    try {
      const profissional_id = req.user.id;

      // Deleta a consulta (apenas se pertencer ao profissional autenticado)
      const before = await Consultas.findById(req.params.id);
      const sucesso = await Consultas.delete(req.params.id, profissional_id);
      if (!sucesso) return res.status(404).json({ message: 'Consulta não encontrada ou sem permissão.' });
      await audit({ req, recurso: 'consulta', acao: 'DELETE', usuarioId: profissional_id, entidadeId: Number(req.params.id), antes: before, depois: null });
      res.json({ message: 'Consulta removida com sucesso.' });
    } catch (err) {
      logger.error('consulta_delete_error', { err: { message: err.message } });
      res.status(500).json({ message: 'Erro ao remover consulta.' });
    }
  }
};

module.exports = consultasController;
