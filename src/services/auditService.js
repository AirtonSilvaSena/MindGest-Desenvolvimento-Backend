const AuditModel = require('../models/AuditModel');
const logger = require('../utils/logger');

function maskUser(u) {
  if (!u) return u;
  const { senha, ...rest } = u;
  return rest;
}

async function audit({ req, recurso, acao, usuarioId, entidadeId, antes, depois }) {
  const ip = req?.ip || null;
  const userAgent = req?.headers?.['user-agent'] || null;
  const event = { recurso, acao, usuario_id: usuarioId ?? null, entidade_id: entidadeId ?? null, antes, depois, ip, user_agent: userAgent };
  try {
    await AuditModel.create(event);
  } catch (e) {
    // Loga mas não quebra fluxo
    logger.error('audit_persist_error', { err: { message: e.message } });
  }
  // Também grava no arquivo de audit log
  logger.audit(event);
}

module.exports = { audit, maskUser };

