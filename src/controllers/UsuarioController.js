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

function mapPublic(u, { showSensitive = false } = {}) {
  return showSensitive ? UserModel.toPublicWithSensitive(u) : UserModel.toPublic(u);
}

module.exports = {
  // Lista todos os usuários
  async index(req, res) {
    const tipo = req.query && req.query.tipo ? String(req.query.tipo) : undefined;
    const users = await UserModel.getAll(tipo ? { tipo } : undefined);
    // Admin listagem: mostrar CPF/CNPJ sem máscara e incluir licença ativa para profissionais
    const Lic = require('../models/UsuarioLicencaModel');
    const mapped = await Promise.all((users || []).map(async (u) => {
      const base = mapPublic(u, { showSensitive: true });
      if (u.tipo === 'profissional') {
        const lic = await Lic.getActiveByUserId(u.id);
        return { ...base, licenca_ativa: lic };
      }
      return base;
    }));
    return res.json(mapped);
  },

  // Mostra um usuário específico pelo ID
  async show(req, res) {
    const { id } = req.params;
    const user = await UserModel.getById(id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    // Admin pode ver qualquer; profissional apenas o próprio
    if (req.user?.tipo !== 'admin' && req.user?.id !== Number(id)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    const actorIsAdmin = req.user?.tipo === 'admin';
    const actorIsSelf = req.user?.id === Number(id);
    const payload = mapPublic(user, { showSensitive: actorIsAdmin || actorIsSelf });
    if (user.tipo === 'profissional') {
      const Lic = require('../models/UsuarioLicencaModel');
      const lic = await Lic.getActiveByUserId(user.id);
      return res.json({ ...payload, licenca_ativa: lic });
    }
    return res.json(payload);
  },

  // Cria um novo usuário
  async store(req, res) {
    try {
      const { nome, email, telefone, pessoa_tipo, cpf, cnpj, empresa_nome, plano_id } = req.body;

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
      // Vincula licença do plano (se fornecido)
      try {
        if (!plano_id) return res.status(422).json({ message: 'plano_id é obrigatório' });
        const Plano = require('../models/PlanoModel');
        const Lic = require('../models/UsuarioLicencaModel');
        const plano = await Plano.getById(plano_id);
        if (!plano || !plano.ativo) return res.status(422).json({ message: 'plano inválido ou inativo' });
        await Lic.activateNew(insertId, plano_id, plano.dias_acesso);
      } catch (e) {
        logger.error('usuario_store_license_error', { err: { message: e.message } });
      }
      const created = await UserModel.getById(insertId);
      await audit({ req, recurso: 'usuario', acao: 'CREATE', usuarioId: created.id, entidadeId: created.id, antes: null, depois: maskUser(created) });
      try { await mailer.sendWelcome({ to: email, tempPassword }); } catch {}
      return res.status(201).json({ ...mapPublic(created, { showSensitive: true }), tempPasswordSent: true });
    } catch (err) {
      // Tratamento de erro para duplicidades em chaves únicas
      if (err && err.code === 'ER_DUP_ENTRY') {
        const msg = (err.sqlMessage || err.message || '').toLowerCase();
        let friendly = 'Registro já existe';
        if (msg.includes('uniq_usuarios_cpf') || msg.includes('cpf')) friendly = 'CPF já cadastrado';
        else if (msg.includes('uniq_usuarios_cnpj') || msg.includes('cnpj')) friendly = 'CNPJ já cadastrado';
        else if (msg.includes('email')) friendly = 'Email já cadastrado';
        return res.status(409).json({ message: friendly });
      }
      logger.error('usuario_store_error', { err: { message: err.message } });
      return res.status(500).json({ message: 'Erro ao criar usuário' });
    }
  },

  // Atualiza um usuário existente
  async update(req, res) {
    try {
      const { id } = req.params; // ID do usuário a ser atualizado
      const { nome, email, senha, telefone, empresa_nome, ativo } = req.body || {};

      // Verifica se o usuário existe
      const existing = await UserModel.getById(id);
      if (!existing) return res.status(404).json({ message: 'Usuário não encontrado' });

      const isAdmin = req.user?.tipo === 'admin';
      const isSelf = req.user?.id === Number(id);
      if (!isAdmin && !isSelf) {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      // Se a senha foi fornecida, gera hash novo
      let senhaHash;
      if (senha !== undefined) {
        const salt = await bcrypt.genSalt(10);
        senhaHash = await bcrypt.hash(senha, salt);
      }

      // Restringe campos conforme papel
      const payload = {
        nome,
        email,
        senhaHash,
        telefone: telefone === undefined ? undefined : (telefone ?? null)
      };
      if (isAdmin) {
        if (empresa_nome !== undefined) payload.empresa_nome = empresa_nome;
        if (ativo !== undefined) payload.ativo = ativo ? 1 : 0;
      }

      // Atualiza os dados no banco
      await UserModel.update(id, payload);

      const updated = await UserModel.getById(id); // Busca o usuário atualizado
      await audit({ req, recurso: 'usuario', acao: 'UPDATE', usuarioId: existing.id, entidadeId: existing.id, antes: maskUser(existing), depois: maskUser(updated) });
      const actorIsAdmin = req.user?.tipo === 'admin';
      const actorIsSelf = req.user?.id === Number(id);
      return res.json(mapPublic(updated, { showSensitive: actorIsAdmin || actorIsSelf })); // Retorna dados públicos atualizados
    } catch (err) {
      // Tratamento de duplicidade
      if (err && err.code === 'ER_DUP_ENTRY') {
        const msg = (err.sqlMessage || err.message || '').toLowerCase();
        let friendly = 'Registro já existe';
        if (msg.includes('uniq_usuarios_cpf') || msg.includes('cpf')) friendly = 'CPF já cadastrado';
        else if (msg.includes('uniq_usuarios_cnpj') || msg.includes('cnpj')) friendly = 'CNPJ já cadastrado';
        else if (msg.includes('email')) friendly = 'Email já cadastrado';
        return res.status(409).json({ message: friendly });
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

    // Apenas admin pode deletar
    if (req.user?.tipo !== 'admin') return res.status(403).json({ message: 'Acesso negado' });

    // Evita auto-delete e proteger último admin
    if (existing.tipo === 'admin') {
      if (req.user?.id === Number(id)) {
        return res.status(403).json({ message: 'Admin não pode remover a si mesmo' });
      }
      const db = require('../config/db');
      const [rows] = await db.query("SELECT COUNT(*) AS total FROM usuarios WHERE tipo = 'admin'");
      const totalAdmins = rows[0]?.total || 0;
      if (totalAdmins <= 1) {
        return res.status(409).json({ message: 'Não é permitido remover o último admin' });
      }
    }

    // Deleta do banco
    const ok = await UserModel.delete(id);
    if (!ok) return res.status(500).json({ message: 'Erro ao remover usuário' });
    await audit({ req, recurso: 'usuario', acao: 'DELETE', usuarioId: existing.id, entidadeId: existing.id, antes: maskUser(existing), depois: null });
    return res.status(204).send(); // Retorna 204 No Content
  },

  // Login profissional (PF/PJ) por CPF/CNPJ
  async login(req, res) {
    const { pessoa_tipo, cpf, cnpj, senha } = req.body || {};
    try {
      let usuario = null;
      if (pessoa_tipo === 'PF') {
        const doc = String(cpf || '').replace(/\D+/g, '');
        usuario = await UserModel.getByCpf(doc);
      } else if (pessoa_tipo === 'PJ') {
        const doc = String(cnpj || '').replace(/\D+/g, '');
        usuario = await UserModel.getByCnpj(doc);
      }
      if (!usuario || usuario.tipo !== 'profissional') {
        return res.status(400).json({ message: 'Usuário não encontrado' });
      }
      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) return res.status(400).json({ message: 'Senha incorreta' });

      // Se for primeiro acesso, exigir troca de senha antes de liberar login
      if (usuario.must_reset_password) {
        const resetToken = jwt.sign(
          { id: usuario.id, purpose: 'password_reset' },
          process.env.JWT_SECRET,
          { expiresIn: '10m' }
        );
        await audit({ req, recurso: 'auth', acao: 'LOGIN_BLOCKED_MUST_RESET', usuarioId: usuario.id, entidadeId: null, antes: null, depois: { sucesso: false, pessoa_tipo } });
        return res.status(403).json({
          message: 'Necessário alterar a senha antes de continuar',
          mustResetPassword: true,
          resetToken
        });
      }

      // Verifica licença ativa do profissional
      const Lic = require('../models/UsuarioLicencaModel');
      const lic = await Lic.getActiveByUserId(usuario.id);
      const now = Date.now();
      const exp = lic ? new Date(lic.expira_em).getTime() : 0;
      if (!lic || !lic.plano_ativo || exp <= now) {
        await audit({ req, recurso: 'auth', acao: 'LOGIN_LICENSE_BLOCK', usuarioId: usuario.id, entidadeId: null, antes: null, depois: { sucesso: false } });
        return res.status(403).json({ message: 'Licença expirada ou plano inativo', mustRenew: true, expiresAt: lic?.expira_em || null });
      }

      const token = jwt.sign(
        { id: usuario.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      const daysRemaining = Math.ceil((exp - now) / (24*3600*1000));
      await audit({ req, recurso: 'auth', acao: 'LOGIN', usuarioId: usuario.id, entidadeId: null, antes: null, depois: { sucesso: true, pessoa_tipo } });
      res.json({ token, mustResetPassword: false, tipo: usuario.tipo, licenseExpiresAt: lic.expira_em, daysRemaining });
    } catch (error) {
      logger.error('usuario_login_error', { err: { message: error.message } });
      res.status(500).json({ message: 'Erro ao autenticar usuário' });
    }
  },

  // Perfil próprio
  async me(req, res) {
    const user = await UserModel.getById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    return res.json(mapPublic(user, { showSensitive: true }));
  },

  async updateMe(req, res) {
    req.params.id = String(req.user.id);
    return this.update(req, res);
  },

  // Login do administrador por email/senha
  async loginAdmin(req, res) {
    const { email, senha } = req.body || {};
    try {
      const usuario = await UserModel.getByEmail(email);
      if (!usuario || usuario.tipo !== 'admin') return res.status(400).json({ message: 'Usuário não encontrado' });
      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) return res.status(400).json({ message: 'Senha incorreta' });
      const token = jwt.sign(
        { id: usuario.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      await audit({ req, recurso: 'auth', acao: 'LOGIN_ADMIN', usuarioId: usuario.id, entidadeId: null, antes: null, depois: { sucesso: true, email } });
      res.json({ token, mustResetPassword: !!usuario.must_reset_password, tipo: usuario.tipo });
    } catch (error) {
      logger.error('usuario_login_admin_error', { err: { message: error.message } });
      res.status(500).json({ message: 'Erro ao autenticar administrador' });
    }
  },

  async validateToken(req, res) {
    try {
      const userId = req.user.id;
      const user = await UserModel.getById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      const infoUser = mapPublic(user);
      res.json({ valid: true, infoUser });
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
      return res.json(mapPublic(updated, { showSensitive: true }));
    } catch (e) {
      logger.error('usuario_change_password_error', { err: { message: e.message } });
      return res.status(500).json({ message: 'Erro ao alterar senha' });
    }
  },

  async bootstrapAdmin(req, res) {
    try {
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
      return res.status(201).json(mapPublic(created, { showSensitive: true }));
    } catch (e) {
      logger.error('usuario_bootstrap_admin_error', { err: { message: e.message } });
      return res.status(500).json({ message: 'Erro ao criar admin' });
    }
  },

  async resetPassword(req, res) {
    try {
      const { id } = req.params;
      const target = await UserModel.getById(id);
      if (!target) return res.status(404).json({ message: 'Usuário não encontrado' });
      const tempPassword = crypto.randomBytes(9).toString('base64');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(tempPassword, salt);
      await require('../config/db').query('UPDATE usuarios SET senha = ?, must_reset_password = 1 WHERE id = ?', [hash, id]);
      const updated = await UserModel.getById(id);
      await audit({ req, recurso: 'usuario', acao: 'RESET_PASSWORD', usuarioId: req.user.id, entidadeId: id, antes: maskUser(target), depois: maskUser(updated) });
      try { await mailer.sendReset({ to: updated.email, tempPassword }); } catch {}
      return res.json({ ...mapPublic(updated, { showSensitive: true }), tempPassword });
    } catch (e) {
      logger.error('usuario_reset_password_error', { err: { message: e.message } });
      return res.status(500).json({ message: 'Erro ao resetar senha' });
    }
  }
};
