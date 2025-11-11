/**
 * E2E Inbox:
 * - Bootstrap admin (se necessário)
 * - Login admin; se mustResetPassword=true, troca e reloga
 * - Cria plano teste
 * - Cria usuário PF (com plano)
 * - Envia 3 mensagens direcionadas a esse usuário
 * - Login PF (fluxo de primeiro acesso com resetToken), troca senha e reloga
 * - Verifica inbox (count não lidas == 3) e marca uma como lida
 */

const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': String(payload.length) } : {}),
        ...headers
      },
      timeout: 20000
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let json;
        try { json = data ? JSON.parse(data) : {}; } catch { json = { raw: data }; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { const r = await request('GET', '/health'); if (r.status === 200) return; } catch {}
    await sleep(500);
  }
  throw new Error('Server not ready');
}

function digits(n) { return Array.from(crypto.randomBytes(n)).map(b => (b % 10)).join('').slice(0, n); }

let STEP = 0;
function logStep(msg, extra) {
  const ts = new Date().toISOString();
  const base = `[#${++STEP}] ${ts} - ${msg}`;
  if (extra !== undefined) console.log(base, extra);
  else console.log(base);
}

async function run() {
  logStep('Aguardando servidor responder /health...');
  await waitForServer();
  logStep('Servidor OK');

  // Bootstrap admin
  const adminEmail = `admin+${Date.now()}@example.com`;
  const adminSenha = 'Admin@12345';
  logStep('Bootstrap admin', { email: adminEmail });
  let r = await request('POST', '/api/v1/usuarios/bootstrap-admin', { email: adminEmail, senha: adminSenha, nome: 'Super Admin' });
  logStep('Bootstrap admin resposta', { status: r.status });
  if (![201, 500].includes(r.status) && r.status !== 409) throw new Error(`bootstrap-admin falhou: ${r.status} ${JSON.stringify(r.body)}`);

  // Login admin
  logStep('Login admin (email/senha)');
  r = await request('POST', '/api/v1/usuarios/login-admin', { email: adminEmail, senha: adminSenha });
  logStep('Login admin resposta', { status: r.status, mustResetPassword: !!r.body?.mustResetPassword });
  if (r.status !== 200 || !r.body.token) throw new Error(`login-admin falhou: ${r.status} ${JSON.stringify(r.body)}`);
  let adminToken = r.body.token;
  let adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // Troca de senha se necessário (normalmente must_reset_password=true no bootstrap)
  if (r.body.mustResetPassword) {
    logStep('Trocando senha do admin (mustResetPassword=true)');
    const nova = 'Admin@67890';
    const r2 = await request('PUT', '/api/v1/usuarios/me/senha', { senha_atual: adminSenha, nova_senha: nova }, adminHeaders);
    logStep('Troca de senha do admin resposta', { status: r2.status });
    if (r2.status !== 200) throw new Error(`troca de senha admin falhou: ${r2.status} ${JSON.stringify(r2.body)}`);
    r = await request('POST', '/api/v1/usuarios/login-admin', { email: adminEmail, senha: nova });
    logStep('Relogin admin resposta', { status: r.status });
    if (r.status !== 200 || !r.body.token) throw new Error(`relogin-admin falhou: ${r.status}`);
    adminHeaders = { Authorization: `Bearer ${r.body.token}` };
  }

  // Cria plano para ativar licença
  logStep('Criando plano teste (30d)');
  r = await request('POST', '/api/v1/planos', { descricao: 'Plano Teste 30d', dias_acesso: 30, ativo: true }, adminHeaders);
  logStep('Criar plano resposta', { status: r.status, id: r.body?.id });
  if (r.status !== 201) throw new Error(`criar plano falhou: ${r.status} ${JSON.stringify(r.body)}`);
  const planoId = r.body.id;

  // Cria PF
  const guid = crypto.randomBytes(3).toString('hex');
  const pf = {
    pessoa_tipo: 'PF',
    nome: `Usu PF ${guid}`,
    cpf: digits(11),
    email: `pf+${guid}@example.com`,
    telefone: '11999999999',
    plano_id: planoId
  };
  logStep('Criando usuário PF', { email: pf.email, cpf: pf.cpf });
  r = await request('POST', '/api/v1/usuarios', pf, adminHeaders);
  logStep('Criar usuário PF resposta', { status: r.status, id: r.body?.id });
  if (r.status !== 201 || !r.body.id) throw new Error(`criar PF falhou: ${r.status} ${JSON.stringify(r.body)}`);
  const pfId = r.body.id;

  // Reset para obter senha temporária (exibe tempPassword)
  logStep('Reset de senha PF para obter temporária', { userId: pfId });
  let rReset = await request('POST', `/api/v1/usuarios/${pfId}/reset-password`, null, adminHeaders);
  logStep('Reset senha PF resposta', { status: rReset.status, tempPassword: !!rReset.body.tempPassword });
  if (rReset.status !== 200 || !rReset.body.tempPassword) throw new Error(`reset PF falhou: ${rReset.status} ${JSON.stringify(rReset.body)}`);
  const pfTemp = rReset.body.tempPassword;

  // Envia 3 mensagens para o PF
  const msgs = [
    { titulo: 'Comunicado geral', corpo: 'Bem-vindo!', tipo: 'comunicado' },
    { titulo: 'Cobrança', corpo: 'Sua fatura vence em 3 dias.', tipo: 'cobranca' },
    { titulo: 'Aviso do sistema', corpo: 'Manutenção programada amanhã.', tipo: 'sistema' },
  ];
  for (const m of msgs) {
    logStep('Enviando mensagem', { titulo: m.titulo, tipo: m.tipo });
    const rr = await request('POST', '/api/v1/mensagens', { ...m, destino: 'por_ids', usuario_ids: [pfId], sendEmail: false }, adminHeaders);
    logStep('Enviar mensagem resposta', { status: rr.status, mensagemId: rr.body?.mensagem?.id, entregues: rr.body?.entregues });
    if (rr.status !== 201) throw new Error(`enviar mensagem falhou: ${rr.status} ${JSON.stringify(rr.body)}`);
  }

  // Login PF (primeiro acesso -> 403 resetToken)
  logStep('Login PF (primeiro acesso) com senha temporária');
  r = await request('POST', '/api/v1/usuarios/login', { pessoa_tipo: 'PF', cpf: pf.cpf, senha: pfTemp });
  logStep('Login PF (primeiro acesso) resposta', { status: r.status, mustResetPassword: !!r.body?.mustResetPassword });
  if (r.status !== 403 || !r.body.resetToken) throw new Error(`login PF (primeiro acesso) esperado 403 resetToken: ${r.status}`);

  // Troca senha com resetToken
  const resetHeaders = { Authorization: `Bearer ${r.body.resetToken}` };
  const pfNova = 'Pf@Senha123';
  logStep('Trocando senha PF com resetToken');
  let r2 = await request('PUT', '/api/v1/usuarios/me/senha', { senha_atual: pfTemp, nova_senha: pfNova }, resetHeaders);
  logStep('Troca senha PF resposta', { status: r2.status });
  if (r2.status !== 200) throw new Error(`PF troca senha falhou: ${r2.status} ${JSON.stringify(r2.body)}`);

  // Reloga PF
  logStep('Relogin PF');
  r = await request('POST', '/api/v1/usuarios/login', { pessoa_tipo: 'PF', cpf: pf.cpf, senha: pfNova });
  logStep('Relogin PF resposta', { status: r.status });
  if (r.status !== 200 || !r.body.token) throw new Error(`relogin PF falhou: ${r.status} ${JSON.stringify(r.body)}`);
  const pfHeaders = { Authorization: `Bearer ${r.body.token}` };

  // Inbox: contar não lidas
  logStep('Contando não lidas na inbox');
  let rc = await request('GET', '/api/v1/inbox/unread-count', null, pfHeaders);
  logStep('Unread-count resposta', { status: rc.status, count: rc.body?.count });
  if (rc.status !== 200) throw new Error(`count inbox falhou: ${rc.status}`);
  if ((rc.body.count || 0) < 3) throw new Error(`esperado >=3 não lidas, obtido ${rc.body.count}`);

  // Listar inbox e marcar a primeira como lida
  logStep('Listando inbox (não lidas)');
  let rl = await request('GET', '/api/v1/inbox?status=unread&page=1&limit=10', null, pfHeaders);
  logStep('Listar inbox resposta', { status: rl.status, itens: Array.isArray(rl.body) ? rl.body.length : 'N/A' });
  if (rl.status !== 200 || !Array.isArray(rl.body) || rl.body.length === 0) throw new Error(`listar inbox falhou: ${rl.status}`);
  const firstId = rl.body[0].id;
  logStep('Marcando primeira mensagem como lida', { id: firstId });
  const rm = await request('PATCH', `/api/v1/inbox/${firstId}/read`, { read: true }, pfHeaders);
  logStep('Marcar lida resposta', { status: rm.status, lido_em: rm.body?.lido_em || null });
  if (rm.status !== 200) throw new Error(`marcar lida falhou: ${rm.status}`);

  logStep('Fluxo concluído com sucesso');
  console.log(JSON.stringify({ ok: true, adminEmail, pf: { id: pfId, cpf: pf.cpf, email: pf.email }, mensagens: msgs.length }));
}

run().catch(err => { console.error('e2e_inbox_failed:', err.message); process.exit(1); });
