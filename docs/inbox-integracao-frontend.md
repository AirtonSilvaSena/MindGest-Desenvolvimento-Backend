# Caixa de Entrada (Inbox) – Plano de Implementação e Integração

Objetivo: permitir que administradores enviem mensagens internas para profissionais (ex.: cobrança, comunicados). Profissionais visualizam em uma caixa de entrada simples com status lido/não lido e contador.

- Base da API: `/api/v1`
- Autorização: `Authorization: Bearer <token>` (JWT)
- Papéis: admin cria/gerencia mensagens; profissional lê e marca como lida.

## Resumo Funcional

- Admin cria mensagens e define destinatários:
  - Alvo “todos” os profissionais ativos ou uma lista de `usuario_ids`.
  - Tipos sugeridos: `cobranca`, `comunicado`, `sistema`, `outro` (campo livre/enum).
- Entrega imediata: ao criar a mensagem, são geradas as associações para cada destinatário.
- Profissional consulta sua inbox paginada, lê detalhes e marca como lida/ não lida.
- Contador de não lidas para badge em UI.

## Modelo de Dados (SQL)

Adicionar às migrações/banco (ex.: incluir em `Banco de Dados/bdSql.sql`):

```sql
-- Mensagens criadas pelo admin
CREATE TABLE IF NOT EXISTS mensagens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  corpo TEXT NOT NULL,
  tipo VARCHAR(30) DEFAULT 'outro', -- cobranca|comunicado|sistema|outro
  criado_por_admin_id INT NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (tipo),
  INDEX (criado_por_admin_id),
  CONSTRAINT fk_mensagens_admin_user FOREIGN KEY (criado_por_admin_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Liga mensagem aos destinatários e controla lido/não lido
CREATE TABLE IF NOT EXISTS mensagens_destinatarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mensagem_id INT NOT NULL,
  usuario_id INT NOT NULL,
  lido_em DATETIME NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_msg_user (mensagem_id, usuario_id),
  INDEX (usuario_id, lido_em),
  CONSTRAINT fk_md_msg FOREIGN KEY (mensagem_id) REFERENCES mensagens(id) ON DELETE CASCADE,
  CONSTRAINT fk_md_user FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Observações:
- “Não lida” = `lido_em IS NULL`; “Lida” = `lido_em NOT NULL`.
- Destinatários: apenas profissionais ativos (`usuarios.tipo = 'profissional' AND usuarios.ativo = 1`).

## Endpoints Admin – Mensagens

Protegidos por `autenticar`, `enforcePasswordReset()` e `requireAdmin`.

1) Criar e entregar mensagem
- POST `/mensagens`
- Body:
  - `{ titulo: string, corpo: string, tipo?: 'cobranca'|'comunicado'|'sistema'|'outro', destino: 'todos'|'por_ids', usuario_ids?: number[] }`
- Regras:
  - `destino = 'todos'`: entrega a todos profissionais ativos.
  - `destino = 'por_ids'`: exige `usuario_ids` válidos (profissionais ativos).
- Respostas:
  - 201 `{ mensagem, entregues: number }`

2) Listar mensagens (admin)
- GET `/mensagens?tipo=&q=&page=&limit=`
- Retorna lista com estatísticas: `total_destinatarios`, `lidos`, `nao_lidos`.

3) Detalhar mensagem (admin)
- GET `/mensagens/{id}`
- Inclui metadados e contagens. Pode incluir amostra/paginação de destinatários com status.

4) Atualizar mensagem
- PUT `/mensagens/{id}`
- Body parcial: `{ titulo?, corpo?, tipo? }`
- Observação: conteúdo alterado não regrava mensagens já entregues nas caixas (apenas reflete no detalhe). Manter simples.

5) Remover mensagem
- DELETE `/mensagens/{id}` – remove mensagem e associações de destinatários.

## Endpoints Usuário – Inbox

Protegidos por `autenticar` e `enforcePasswordReset()`.

1) Listar inbox do usuário autenticado
- GET `/inbox?status=all|unread|read&page=&limit=`
- Resposta `200` Array de itens:
  - `{ id, titulo, preview, tipo, recebido_em, lido_em }`
  - `preview`: primeiras N letras do corpo (ex.: 140).

2) Contar não lidas
- GET `/inbox/unread-count`
- Resposta `200` `{ count: number }`

3) Detalhar mensagem
- GET `/inbox/{id}`
- Retorna `{ id, titulo, corpo, tipo, recebido_em, lido_em }`

4) Marcar como lida
- PATCH `/inbox/{id}/read` – body opcional `{ read?: boolean }` (padrão: `true`).
- Resposta `200` `{ id, lido_em }`

Erros comuns:
- `404` quando a mensagem não é destinada ao usuário.

## Regras, Validações e Middlewares

- Admin-only para CRUD de mensagens: usar `requireAdmin` em `/mensagens`.
- Profissionais acessam `/inbox`. Recomenda-se permitir leitura mesmo com licença expirada (comunicados críticos):
  - Ajuste em `src/middlewares/enforceLicense.js`: incluir `/api/v1/inbox`, `/api/v1/inbox/unread-count` no `allowed` (sem bloquear admin por padrão).
- Sanitização/validação:
  - `titulo` obrigatório (1..200), `corpo` obrigatório (> 0), `tipo` dentro do conjunto.
  - `usuario_ids` obrigatórios e existentes quando `destino='por_ids'`.
  - Entrega para “todos” seleciona somente profissionais ativos.

## Auditoria e E-mail (opcional)

- Auditoria:
  - Ao criar mensagem: `recurso='mensagens', acao='CREATE'` com rascunho do payload (sem grandes textos, opcionalmente truncado).
  - Ao marcar leitura: `recurso='inbox', acao='READ'` com `{ usuario_id, mensagem_id }`.
- E-mail opcional (via `src/services/mailer.js`):
  - Flag `sendEmail?: boolean` no POST `/mensagens` para disparar e-mails aos destinatários com o mesmo conteúdo.
  - Se `config.mail.enabled=false`, apenas loga (`mailer_disabled_or_unavailable`).

## Recomendações de UI/UX

- Inbox do profissional:
  - Lista com filtros: “Todos | Não lidos | Lidos”.
  - Badge de não lidas (chama `/inbox/unread-count`).
  - Item mostra `titulo`, `preview`, `tipo`, `recebido_em`, indicador lido.
  - Detalhe com `titulo` e `corpo`, botão “Marcar como lida/Não lida”.
- Admin – mensagens:
  - Formulário: `titulo`, `tipo`, `corpo`, seleção de destino (todos | selecionar usuários).
  - Após criar, exibir quantidade entregue e atalho para ver estatísticas.

## Exemplos de Integração (Axios + React)

Setup API:
```ts
import axios from 'axios';
export const api = axios.create({ baseURL: '/api/v1' });
// Authorization via interceptor global já existente conforme docs de autenticação
```

Profissional – inbox:
```ts
export async function listarInbox(params?: { status?: 'all'|'unread'|'read'; page?: number; limit?: number }) {
  const { data } = await api.get('/inbox', { params });
  return data as Array<{ id:number; titulo:string; preview:string; tipo:string; recebido_em:string; lido_em?:string|null }>;
}
export async function countNaoLidas() {
  const { data } = await api.get('/inbox/unread-count');
  return data as { count: number };
}
export async function detalharMensagem(id: number) {
  const { data } = await api.get(`/inbox/${id}`);
  return data as { id:number; titulo:string; corpo:string; tipo:string; recebido_em:string; lido_em?:string|null };
}
export async function marcarLida(id: number, read = true) {
  const { data } = await api.patch(`/inbox/${id}/read`, { read });
  return data as { id:number; lido_em?:string|null };
}
```

Admin – mensagens:
```ts
type CriarMensagemBody = {
  titulo: string;
  corpo: string;
  tipo?: 'cobranca'|'comunicado'|'sistema'|'outro';
  destino: 'todos'|'por_ids';
  usuario_ids?: number[];
  sendEmail?: boolean;
};

export async function criarMensagem(body: CriarMensagemBody) {
  const { data } = await api.post('/mensagens', body);
  return data as { mensagem: any; entregues: number };
}

export async function listarMensagens(params?: { tipo?: string; q?: string; page?: number; limit?: number }) {
  const { data } = await api.get('/mensagens', { params });
  return data as Array<{ id:number; titulo:string; tipo:string; criado_em:string; total_destinatarios:number; lidos:number; nao_lidos:number }>;
}
```

## Roteiro de Implementação (Backend)

Arquivos novos:
- `src/models/MessageModel.js` – CRUD de `mensagens` e utilidades (listar com estatísticas, buscar por id, etc.).
- `src/models/MessageDeliveryModel.js` – CRUD de `mensagens_destinatarios` (listar inbox, marcar leitura, contagem).
- `src/controllers/MensagensController.js` – endpoints admin.
- `src/controllers/InboxController.js` – endpoints do profissional.
- `src/routes/mensagensRoutes.js` – `router.use(autenticar, enforcePasswordReset(), requireAdmin)`; monta CRUD.
- `src/routes/inboxRoutes.js` – `router.use(autenticar, enforcePasswordReset())`; monta listagem/contagem/detalhe/mark-read.

Ajustes:
- `src/servidor.js`: `app.use('/api/v1/mensagens', mensagensRoutes);` e `app.use('/api/v1/inbox', inboxRoutes);`
- `src/middlewares/enforceLicense.js`: adicionar `/api/v1/inbox` e `/api/v1/inbox/unread-count` ao `allowed` para permitir leitura com licença expirada (recomendado).
- Swagger: documentar novos endpoints seguindo o padrão de `src/routes/planosRoutes.js` e `src/routes/usuarioRoutes.js`.
- Auditoria: usar `services/auditService.audit` em CREATE (mensagens) e READ (inbox).
- E-mail (opcional): integrar `services/mailer.js` quando `sendEmail=true`.

Validações e performance:
- Paginar inbox e listagem admin (`page`, `limit`, `ORDER BY criado_em DESC`).
- Indexes já previstos nas tabelas cobrem buscas por usuário e status.

## Erros Padrão

- `401` Token não fornecido
- `403` Bloqueios de senha/role (ou licença quando aplicável)
- `404` Mensagem não encontrada ou não destinada ao usuário
- `422` Validações de payload (ex.: destino e `usuario_ids`)
- `500` Falhas internas

---

Para dúvidas, melhorias (ex.: anexos, rascunho/agendamento, templates) ou ajustes de UX, abrir issue com exemplos de payloads e telas-alvo para alinhamento rápido.

