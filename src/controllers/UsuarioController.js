// Importa bcryptjs para encriptar e comparar senhas
const bcrypt = require('bcryptjs');
// Importa jsonwebtoken para gerar tokens JWT
const jwt = require('jsonwebtoken');
// Importa o model de usuário para interagir com o banco
const UserModel = require('../models/UsuarioModel');
console.log("-> UserModel: " + UserModel);
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
      const { nome, email, senha, telefone, tipo } = req.body; // Pega dados do corpo da requisição

      // Cria um "salt" e gera o hash da senha
      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash(senha, salt);

      // Insere no banco e retorna o ID criado
      const insertId = await UserModel.create({ nome, email, senhaHash, telefone, tipo });
      const created = await UserModel.getById(insertId); // Busca novamente para retornar os dados
      return res.status(201).json(mapPublic(created)); // Retorna o usuário criado (somente dados públicos)
    } catch (err) {
      // Tratamento de erro para email duplicado
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Email já cadastrado' });
      }
      console.error(err);
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
      return res.json(mapPublic(updated)); // Retorna dados públicos atualizados
    } catch (err) {
      // Tratamento de email duplicado
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Email já cadastrado' });
      }
      console.error(err);
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
      res.json({ token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao autenticar usuário' });
    }
  }
};
