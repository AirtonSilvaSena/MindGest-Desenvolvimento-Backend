const logger = require('../utils/logger');
const config = require('../config');
let transporter;

function getTransporter() {
  if (!config.mail.enabled) return null;
  if (transporter) return transporter;
  try {
    const nodemailer = require('nodemailer');
    if (config.mail.service) {
      transporter = nodemailer.createTransport({
        service: config.mail.service,
        auth: { user: config.mail.user, pass: config.mail.pass }
      });
    } else {
      transporter = nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port || 587,
        secure: !!config.mail.secure,
        auth: { user: config.mail.user, pass: config.mail.pass }
      });
    }
  } catch (e) {
    logger.error('mailer_transport_error', { err: { message: e.message } });
    transporter = null;
  }
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const tx = getTransporter();
  if (!tx) {
    logger.info('mailer_disabled_or_unavailable', { to, subject });
    return;
  }
  try {
    await tx.sendMail({ from: config.mail.from || config.mail.user, to, subject, text, html });
    logger.info('mailer_sent', { to, subject });
  } catch (e) {
    logger.error('mailer_send_error', { to, subject, err: { message: e.message } });
  }
}

function buildWelcomeMessage(to, tempPassword) {
  const subject = 'Bem-vindo ao MindGest - Acesse e altere sua senha';
  const text = `Olá,

Seu usuário foi criado no MindGest.
Senha temporária: ${tempPassword}

Acesse o site, faça login e altere sua senha no primeiro acesso.

Se você não solicitou este acesso, ignore este e-mail.`;
  const html = `
    <p>Olá,</p>
    <p>Seu usuário foi criado no <strong>MindGest</strong>.</p>
    <p><strong>Senha temporária:</strong> <code>${tempPassword}</code></p>
    <p>Acesse o site, faça login e altere sua senha no primeiro acesso.</p>
    <p>Se você não solicitou este acesso, ignore este e-mail.</p>
  `;
  return { to, subject, text, html };
}

function buildResetMessage(to, tempPassword) {
  const subject = 'MindGest - Sua senha temporária';
  const text = `Olá,

Sua senha foi redefinida por um administrador.
Senha temporária: ${tempPassword}

Acesse o site, faça login e altere sua senha imediatamente.

Se você não solicitou esta alteração, entre em contato com o suporte.`;
  const html = `
    <p>Olá,</p>
    <p>Sua senha foi redefinida por um administrador.</p>
    <p><strong>Senha temporária:</strong> <code>${tempPassword}</code></p>
    <p>Acesse o site, faça login e altere sua senha imediatamente.</p>
    <p>Se você não solicitou esta alteração, entre em contato com o suporte.</p>
  `;
  return { to, subject, text, html };
}

module.exports = {
  async sendWelcome({ to, tempPassword }) {
    const msg = buildWelcomeMessage(to, tempPassword);
    await sendMail(msg);
  },
  async sendReset({ to, tempPassword }) {
    const msg = buildResetMessage(to, tempPassword);
    await sendMail(msg);
  }
};
