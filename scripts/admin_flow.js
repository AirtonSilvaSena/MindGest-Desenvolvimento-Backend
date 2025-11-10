/**
 * Fluxo solicitado:
 * - Criar super admin admin@admin.com senha: admin (bootstrap)
 * - Logar como admin; se exigir reset, trocar senha e relogar
 * - Criar usuário PF e PJ
 * - Logar com PF/PJ usando senha temporária, trocar senha e relogar
 */

const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

const BASE = 'http://localhost:3000';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': String(payload.length) } : {}),
        ...headers
      },
      timeout: 15000
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
  throw new Error('Server failed to start');
}

async function run() {
  await waitForServer();
  const adminEmail = 'admin@admin.com';
  const adminSenha = 'admin';

  // bootstrap admin (permitido quando não existe admin)
  let r = await request('POST', '/api/v1/usuarios/bootstrap-admin', { email: adminEmail, senha: adminSenha, nome: 'Super Admin' });
  if (![201, 409].includes(r.status)) throw new Error(`bootstrap-admin falhou: ${r.status} ${JSON.stringify(r.body)}`);

  // login admin
  r = await request('POST', '/api/v1/usuarios/login', { email: adminEmail, senha: adminSenha });
  let adminToken = r.body.token;
  if (r.status !== 200 || !adminToken) throw new Error(`login admin falhou: ${r.status}`);
  let adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // reset de senha do admin se necessário
  if (r.body.mustResetPassword) {
    const nova = 'Admin@12345';
    const r2 = await request('PUT', '/api/v1/usuarios/me/senha', { senha_atual: adminSenha, nova_senha: nova }, adminHeaders);
    if (r2.status !== 200) throw new Error(`troca de senha admin falhou: ${r2.status}`);
    r = await request('POST', '/api/v1/usuarios/login', { email: adminEmail, senha: nova });
    if (r.status !== 200 || !r.body.token) throw new Error(`relogin admin falhou: ${r.status}`);
    adminHeaders = { Authorization: `Bearer ${r.body.token}` };
  }

  // helpers para gerar números únicos
  const randDigits = (n) => Array.from(crypto.randomBytes(n)).map(b => (b % 10)).join('').slice(0, n);

  // criar PF
  const guid = crypto.randomBytes(4).toString('hex');
  const pfEmail = `pf+${guid}@example.com`;
  r = await request('POST', '/api/v1/usuarios', {
    pessoa_tipo: 'PF',
    nome: `Usu PF ${guid}`,
    cpf: randDigits(11),
    email: pfEmail
  }, adminHeaders);
  if (r.status !== 201) throw new Error(`criar PF falhou: ${r.status} ${JSON.stringify(r.body)}`);
  // gera senha temporária via endpoint admin
  let rReset = await request('POST', `/api/v1/usuarios/${r.body.id}/reset-password`, null, adminHeaders);
  if (rReset.status !== 200) throw new Error(`reset PF falhou: ${rReset.status} ${JSON.stringify(rReset.body)}`);
  const pfTemp = rReset.body.tempPassword;

  // login PF e troca
  r = await request('POST', '/api/v1/usuarios/login', { email: pfEmail, senha: pfTemp });
  if (r.status !== 200 || !r.body.token) throw new Error(`login PF falhou: ${r.status}`);
  let pfHeaders = { Authorization: `Bearer ${r.body.token}` };
  const pfNova = 'PfNovaSenha@123';
  let r2 = await request('PUT', '/api/v1/usuarios/me/senha', { senha_atual: pfTemp, nova_senha: pfNova }, pfHeaders);
  if (r2.status !== 200) throw new Error(`troca de senha PF falhou: ${r2.status}`);
  r = await request('POST', '/api/v1/usuarios/login', { email: pfEmail, senha: pfNova });
  if (r.status !== 200 || !r.body.token) throw new Error(`relogin PF falhou: ${r.status}`);

  // criar PJ
  const pjEmail = `pj+${guid}@example.com`;
  r = await request('POST', '/api/v1/usuarios', {
    pessoa_tipo: 'PJ',
    empresa_nome: `Empresa ${guid}`,
    cnpj: randDigits(14),
    email: pjEmail
  }, adminHeaders);
  if (r.status !== 201) throw new Error(`criar PJ falhou: ${r.status} ${JSON.stringify(r.body)}`);
  rReset = await request('POST', `/api/v1/usuarios/${r.body.id}/reset-password`, null, adminHeaders);
  if (rReset.status !== 200) throw new Error(`reset PJ falhou: ${rReset.status} ${JSON.stringify(rReset.body)}`);
  const pjTemp = rReset.body.tempPassword;

  // login PJ e troca
  r = await request('POST', '/api/v1/usuarios/login', { email: pjEmail, senha: pjTemp });
  if (r.status !== 200 || !r.body.token) throw new Error(`login PJ falhou: ${r.status}`);
  let pjHeaders = { Authorization: `Bearer ${r.body.token}` };
  const pjNova = 'PjNovaSenha@123';
  r2 = await request('PUT', '/api/v1/usuarios/me/senha', { senha_atual: pjTemp, nova_senha: pjNova }, pjHeaders);
  if (r2.status !== 200) throw new Error(`troca de senha PJ falhou: ${r2.status}`);
  r = await request('POST', '/api/v1/usuarios/login', { email: pjEmail, senha: pjNova });
  if (r.status !== 200 || !r.body.token) throw new Error(`relogin PJ falhou: ${r.status}`);

  console.log(JSON.stringify({ ok: true, admin: adminEmail, pfEmail, pjEmail }));
}

run().catch(err => { console.error('admin_flow_failed:', err.message); process.exit(1); });
