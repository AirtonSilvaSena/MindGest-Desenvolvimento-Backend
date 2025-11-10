// Importa bcryptjs para encriptar e comparar senhas
const bcrypt = require('bcryptjs');
// Importa jsonwebtoken para gerar tokens JWT
const jwt = require('jsonwebtoken');
// Importa o model de usuário para interagir com o banco
const UserModel = require('../models/UsuarioModel');
const logger = require('../utils/logger');
const { audit, maskUser } = require('../services/auditService');
const crypto = require('crypto');
const mailer = require('../services/mailer');
// Função auxiliar para mapear usuário para uma versão pública (sem senha, etc.)
function mapPublic(u) {
  return UserModel.toPublic(u);
}

module.exports = {
  // Lista todos os usuários
  async index(req, res) {
    const users = await UserModel.getAll(); // Busca todos do banco
    return res.json(users); // Retorna como JSON
  },

  // Mostra um usuário específico pelo ID
  async show(req, res) {
    const { id } = req.params; // Pega o ID da URL
    const user = await UserModel.getById(id); // Busca no banco
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' }); // Se não existir, retorna 404
    return res.json(mapPublic(user)); // Retorna dados públicos do usuário
  },

  // Cria um novo usuário
  async store(req, res) {
    try {
      const { nome, email, telefone, pessoa_tipo, cpf, cnpj, empresa_nome } = req.body;

      // Gera senha temporária para criação por admin
      const tempPassword = crypto.randomBytes(9).toString('base64');
      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash(tempPassword, salt);

      const nomeToSave = pessoa_tipo === 'PJ' ? (empresa_nome || nome) : nome;
      const insertId = await UserModel.create({
        nome: nomeToSave,
        email,
        senhaHash,
        telefone,
        tipo: 'profissional',
        pessoa_tipo,
        cpf,
        cnpj,
        empresa_nome,
        must_reset_password: 1
      });
      const created = await UserModel.getById(insertId);
      await audit({ req, recurso: 'usuario', acao: 'CREATE', usuarioId: created.id, entidadeId: created.id, antes: null, depois: maskUser(created) });
      try { await mailer.sendWelcome({ to: email, tempPassword }); } catch {}
      return res.status(201).json({ ...mapPublic(created), tempPasswordSent: true });
    } catch (err) {
      // Tratamento de erro para email duplicado
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Email já cadastrado' });
      }
      logger.error('usuario_store_error', { err: { message: err.message } });
      return res.status(500).json({ message: 'Erro ao criar usuário' });
    }
  },

  // Atualiza um usuário existente
  async update(req, res) {
    try {
      const { id } = req.params; // ID do usuário a ser atualizado
      const { nome, email, senha, telefone } = req.body;

      // Verifica se o usuário existe
      const existing = await UserModel.getById(id);
      if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });

      // Se a senha foi fornecida, gera hash novo
      let senhaHash;
      if (senha !== undefined) {
        const salt = await bcrypt.genSalt(10);
        senhaHash = await bcrypt.hash(senha, salt);
      }

      // Atualiza os dados no banco
      await UserModel.update(id, {
        nome,
        email,
        senhaHash,
        telefone: telefone === undefined ? undefined : (telefone ?? null)
      });

      const updated = await UserModel.getById(id); // Busca o usuário atualizado
      await audit({ req, recurso: 'usuario', acao: 'UPDATE', usuarioId: existing.id, entidadeId: existing.id, antes: maskUser(existing), depois: maskUser(updated) });
      return res.json(mapPublic(updated)); // Retorna dados públicos atualizados
    } catch (err) {
      // Tratamento de email duplicado
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Email já cadastrado' });
      }
      logger.error('usuario_update_error', { err: { message: err.message } });
      return res.status(500).json({ message: 'Erro ao atualizar usuário' });
    }
  },

  // Remove um usuário
  async destroy(req, res) {
    const { id } = req.params;

    // Verifica se o usuário existe
    const existing = await UserModel.getById(id);
    if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });

    // Deleta do banco
    const ok = await UserModel.delete(id);
    if (!ok) return res.status(500).json({ message: 'Erro ao remover usuário' });
    await audit({ req, recurso: 'usuario', acao: 'DELETE', usuarioId: existing.id, entidadeId: existing.id, antes: maskUser(existing), depois: null });
    return res.status(204).send(); // Retorna 204 No Content
  },

  // Autenticação/login do usuário
  async login(req, res) {
    const { email, senha } = req.body;

    try {
      // Busca usuário pelo email
      const usuario = await UserModel.getByEmail(email);
      if (!usuario) return res.status(400).json({ message: "Usuário não encontrado" });

      // Compara senha fornecida com a senha encriptada no banco
      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) return res.status(400).json({ message: "Senha incorreta" });

      // Gera token JWT com o ID do usuário
      const token = jwt.sign(
        { id: usuario.id }, // Apenas o ID é armazenado no token
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN } // Tempo de expiração definido no .env
      );

      // Retorna token para o cliente
      // Auditoria de login (ação de autenticação)
      await audit({ req, recurso: 'auth', acao: 'LOGIN', usuarioId: usuario.id, entidadeId: null, antes: null, depois: { sucesso: true, email } });
      res.json({ token, mustResetPassword: !!usuario.must_reset_password, tipo: usuario.tipo });
    } catch (error) {
      logger.error('usuario_login_error', { err: { message: error.message } });
      res.status(500).json({ message: 'Erro ao autenticar usuário' });
    }
  },

  async validateToken(req, res) {
    try {
      const userId = req.user.id; // pega o id do token
      // Busca o usuário completo no banco
      const user = await UserModel.getById(userId); // ou o método que você usa no seu model
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      const infoUser = mapPublic(user);
      // Retorna uma resposta em formato JSON
      res.json({
        valid: true,         // Indica que o token foi validado com sucesso
        infoUser   // Dados do usuário
        // Esse 'req.user' vem do payload do JWT decodificado
      });

    } catch (error) {
      logger.error('usuario_validate_token_error', { err: { message: error.message } });
      res.status(500).json({ message: 'Erro interno' });
    }
  },

  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { senha_atual, nova_senha } = req.body;
      const user = await UserModel.getById(userId);
      if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
      const ok = await bcrypt.compare(senha_atual, user.senha);
      if (!ok) return res.status(400).json({ message: 'Senha atual incorreta' });
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(nova_senha, salt);
      await require('../config/db').query('UPDATE usuarios SET senha = ?, must_reset_password = 0 WHERE id = ?', [hash, userId]);
      const updated = await UserModel.getById(userId);
      await audit({ req, recurso: 'usuario', acao: 'CHANGE_PASSWORD', usuarioId: userId, entidadeId: userId, antes: null, depois: { changed: true } });
      return res.json(mapPublic(updated));
    } catch (e) {
      logger.error('usuario_change_password_error', { err: { message: e.message } });
      return res.status(500).json({ message: 'Erro ao alterar senha' });
    }
  },

  async bootstrapAdmin(req, res) {
    try {
      // Permite bootstrap se não houver nenhum admin, independentemente de existirem outros usuários
      const db = require('../config/db');
      const [rows] = await db.query("SELECT COUNT(*) AS total FROM usuarios WHERE tipo = 'admin'");
      const totalAdmins = rows[0]?.total || 0;
      if (totalAdmins > 0) return res.status(409).json({ message: 'Já existe admin' });
      const { email, senha, nome } = req.body || {};
      if (!email || !senha) return res.status(422).json({ message: 'email e senha são obrigatórios' });
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(senha, salt);
      const insertId = await UserModel.create({
        nome: nome || 'Super Admin',
        email,
        senhaHash: hash,
        telefone: null,
        tipo: 'admin',
        pessoa_tipo: 'PF',
        cpf: null,
        cnpj: null,
        empresa_nome: null,
        must_reset_password: 1
      });
      const created = await UserModel.getById(insertId);
      await audit({ req, recurso: 'usuario', acao: 'BOOTSTRAP_ADMIN', usuarioId: created.id, entidadeId: created.id, antes: null, depois: maskUser(created) });
      return res.status(201).json(mapPublic(created));
    } catch (e) {
      logger.error('usuario_bootstrap_admin_error', { err: { message: e.message } });
      return res.status(500).json({ message: 'Erro ao criar admin' });
    }
  }
  ,
  async resetPassword(req, res) {
    try {
      const { id } = req.params;
      const target = await UserModel.getById(id);
      if (!target) return res.status(404).json({ message: 'Usuário não encontrado' });
      // Somente admin (rota já protegida), gera senha temporária nova
      const tempPassword = crypto.randomBytes(9).toString('base64');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(tempPassword, salt);
      await require('../config/db').query('UPDATE usuarios SET senha = ?, must_reset_password = 1 WHERE id = ?', [hash, id]);
      const updated = await UserModel.getById(id);
      await audit({ req, recurso: 'usuario', acao: 'RESET_PASSWORD', usuarioId: req.user.id, entidadeId: id, antes: maskUser(target), depois: maskUser(updated) });
      try { await mailer.sendReset({ to: updated.email, tempPassword }); } catch {}
      return res.json({ ...mapPublic(updated), tempPassword });
    } catch (e) {
      logger.error('usuario_reset_password_error', { err: { message: e.message } });
      return res.status(500).json({ message: 'Erro ao resetar senha' });
    }
  }
};
