function validatePaciente(req, res, next) {
  const { nome, telefone, data_nascimento } = req.body;
  if (!nome || !telefone || !data_nascimento) {
    return res.status(400).json({ error: "Campos obrigatórios: nome, telefone, data_nascimento" });
  }
  next();
}

module.exports = validatePaciente;
