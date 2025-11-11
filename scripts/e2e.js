/**
 * E2E test runner sem dependências externas.
 * - Sobe o servidor
 * - Exercita fluxos válidos e inválidos (usuários, pacientes, consultas, auditoria)
 * - Encerra o processo e sai com código apropriado
 */

const { spawn } = require('child_process');
const http = require('http');
const crypto = require('crypto');

const BASE = 'http://localhost:3000';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Realiza requisições HTTP JSON
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
  for (let i = 0; i < 40; i++) {
    try {
      const r = await request('GET', '/health');
      if (r.status === 200) return;
    } catch {}
    await sleep(500);
  }
  throw new Error('Server failed to start');
}

async function run() {
  // Inicia servidor como subprocesso
  const proc = spawn(process.execPath, ['src/servidor.js'], { stdio: 'inherit' });
  try {
    await waitForServer();
    const guid = crypto.randomBytes(4).toString('hex');
    
    // 1) Bootstrap admin ou ignora se já existir
    const adminEmail = `e2e-admin+${guid}@example.com`;
    const adminSenha = 'Senha@123456';
    let r = await request('POST', '/api/v1/usuarios/bootstrap-admin', { email: adminEmail, senha: adminSenha, nome: `Admin ${guid}` });
    if (![201,409].includes(r.status)) throw new Error(`Bootstrap admin falhou: ${r.status}`);
    // Se já existir admin, usa credenciais de fallback do ambiente
    let loginEmail = adminEmail;
    let loginSenha = adminSenha;
    if (r.status === 409) {
      const envEmail = process.env.ADMIN_EMAIL;
      const envPass = process.env.ADMIN_PASSWORD;
      if (!envEmail || !envPass) {
        throw new Error('Admin já existe. Defina ADMIN_EMAIL e ADMIN_PASSWORD no ambiente para o E2E.');
      }
      loginEmail = envEmail; loginSenha = envPass;
    }
    r = await request('POST', '/api/v1/usuarios/login-admin', { email: loginEmail, senha: loginSenha });
    if (r.status !== 200 || !r.body.token) throw new Error(`Falha login: ${r.status}`);
    let headers = { Authorization: `Bearer ${r.body.token}` };

    // 1.1) Se precisar resetar senha, troca antes de continuar
    if (r.body.mustResetPassword) {
      const novaSenha = `${loginSenha}!1`;
      let r2 = await request('PUT', '/api/v1/usuarios/me/senha', { senha_atual: loginSenha, nova_senha: novaSenha }, headers);
      if (r2.status !== 200) throw new Error(`Falha ao trocar senha inicial: ${r2.status}`);
      // Reautentica
      r = await request('POST', '/api/v1/usuarios/login-admin', { email: loginEmail, senha: novaSenha });
      if (r.status !== 200 || !r.body.token) throw new Error(`Falha login pós troca: ${r.status}`);
      headers = { Authorization: `Bearer ${r.body.token}` };
    }

    // 2) Validações inválidas (espera 422)
    r = await request('POST', '/api/v1/pacientes', { email: 'x', telefone: '', data_nascimento: '2020-13-01' }, headers);
    if (r.status !== 422) throw new Error(`Esperado 422 paciente inválido, veio ${r.status}`);
    r = await request('POST', '/api/v1/consultas', { paciente_id: 0, data_consulta: '2020-99-99', hora_inicio: '25:00:00', duracao_minutos: 0, telefone: '' }, headers);
    if (r.status !== 422) throw new Error(`Esperado 422 consulta inválida, veio ${r.status}`);

    // 3) Fluxo válido paciente/consulta
    r = await request('POST', '/api/v1/pacientes', { nome: `Paciente ${guid}`, email: `pac${guid}@example.com`, telefone: `219${guid}`, data_nascimento: '1990-05-20' }, headers);
    if (r.status !== 201) throw new Error(`Criar paciente falhou: ${r.status}`);
    const pacienteId = r.body.id;
    const today = new Date().toISOString().slice(0,10);
    r = await request('POST', '/api/v1/consultas', { paciente_id: pacienteId, data_consulta: today, hora_inicio: '14:00:00', duracao_minutos: 30, telefone: `219${guid}` }, headers);
    if (r.status !== 201) throw new Error(`Criar consulta falhou: ${r.status}`);
    const consultaId = r.body.id;
    r = await request('PATCH', `/api/v1/consultas/${consultaId}/status`, { status: 'REALIZADA' }, headers);
    if (r.status !== 200 || r.body.status !== 'REALIZADA') throw new Error(`Atualizar status falhou: ${r.status}`);

    // 4) Auditoria (admin)
    r = await request('GET', '/api/v1/auditoria?pageSize=5', null, headers);
    if (r.status !== 200 || !Array.isArray(r.body)) throw new Error(`Auditoria falhou: ${r.status}`);

    console.log(JSON.stringify({ ok: true, pacienteId, consultaId, audits: r.body.length }));
    process.exit(0);
  } catch (err) {
    console.error('E2E failed:', err.message);
    process.exit(1);
  } finally {
    if (proc && !proc.killed) proc.kill('SIGTERM');
  }
}

run();
