// Importa a biblioteca jsonwebtoken para gerar e verificar tokens JWT
const jwt = require('jsonwebtoken');

// Middleware de autenticação para proteger rotas
const autenticar = (req, res, next) => {
    // Pega o cabeçalho 'Authorization' da requisição
    const authHeader = req.headers['authorization'];

    // O token normalmente vem no formato "Bearer TOKEN"
    // Aqui estamos separando e pegando apenas o TOKEN
    const token = authHeader && authHeader.split(' ')[1]; 

    // Se não existir token, retorna erro 401 (Não autorizado)
    if (!token) return res.status(401).json({ message: "Token não fornecido" });

    // Verifica se o token é válido usando a chave secreta definida no .env
    jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
        // Se ocorrer algum erro (token inválido, expirado, etc.), retorna 403 (Proibido)
        if (err) return res.status(403).json({ message: "Token inválido" });

        // Se o token for válido, adiciona as informações do usuário à requisição
        // Isso permite que outras rotas acessem req.usuario para saber quem está logado
        req.user = usuario;
        // Chama o próximo middleware ou a rota final
        next();
    });
};

// Exporta o middleware para ser usado em outras partes da aplicação
module.exports = autenticar;
