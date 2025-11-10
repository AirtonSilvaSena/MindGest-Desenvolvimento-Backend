/**
 * Teste: admin cria usuário PJ com email especificado e dispara e-mail de boas-vindas.
 */
const http = require('http');
const { URL } = require('url');

const BASE = 'http://localhost:3000';
const TARGET_EMAIL = process.env.TARGET_EMAIL || 'airtonsilvasena@outlook.com';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json', ...(payload ? { 'Content-Length': String(payload.length) } : {}), ...headers },
      timeout: 15000
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => data += c);
      res.on('end', () => {
        let json; try { json = data ? JSON.parse(data) : {}; } catch { json = { raw: data }; }
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

async function adminLogin() {
  // tenta com senha já trocada
  let r = await request('POST', '/api/v1/usuarios/login', { email: 'admin@admin.com', senha: 'Admin@12345' });
  if (r.status === 200 && r.body.token) return { headers: { Authorization: `Bearer ${r.body.token}` } };
  // bootstrap
  r = await request('POST', '/api/v1/usuarios/bootstrap-admin', { email: 'admin@admin.com', senha: 'admin', nome: 'Super Admin' });
  if (![201,409].includes(r.status)) throw new Error(`bootstrap-admin falhou: ${r.status}`);
  // login padrão
  r = await request('POST', '/api/v1/usuarios/login', { email: 'admin@admin.com', senha: 'admin' });
  if (r.status !== 200 || !r.body.token) throw new Error(`login admin falhou: ${r.status}`);
  let headers = { Authorization: `Bearer ${r.body.token}` };
  if (r.body.mustResetPassword) {
    const r2 = await request('PUT', '/api/v1/usuarios/me/senha', { senha_atual: 'admin', nova_senha: 'Admin@12345' }, headers);
    if (r2.status !== 200) throw new Error(`troca de senha admin falhou: ${r2.status}`);
    r = await request('POST', '/api/v1/usuarios/login', { email: 'admin@admin.com', senha: 'Admin@12345' });
    if (r.status !== 200 || !r.body.token) throw new Error(`relogin admin falhou: ${r.status}`);
    headers = { Authorization: `Bearer ${r.body.token}` };
  }
  return { headers };
}

function digits(n) { return Array.from({ length: n }, () => Math.floor(Math.random()*10)).join(''); }

async function run() {
  await waitForServer();
  const { headers } = await adminLogin();
  // remove se já existir
  let list = await request('GET', '/api/v1/usuarios', null, headers);
  if (list.status === 200 && Array.isArray(list.body)) {
    const found = list.body.find(u => (u.email || '').toLowerCase() === TARGET_EMAIL.toLowerCase());
    if (found) { await request('DELETE', `/api/v1/usuarios/${found.id}`, null, headers); await sleep(150); }
  }
  // cria PJ
  const r = await request('POST', '/api/v1/usuarios', {
    pessoa_tipo: 'PJ',
    empresa_nome: 'Empresa Teste PJ',
    cnpj: digits(14),
    email: TARGET_EMAIL
  }, headers);
  if (r.status !== 201) throw new Error(`criar usuário PJ falhou: ${r.status} ${JSON.stringify(r.body)}`);
  console.log(JSON.stringify({ ok: true, email: TARGET_EMAIL, userId: r.body.id }));
}

run().catch(err => { console.error('send_welcome_pj_failed:', err.message); process.exit(1); });

