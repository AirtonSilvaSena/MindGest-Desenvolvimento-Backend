# Visão Admin — Endpoints e Integração Frontend

Este guia consolida todos os endpoints e fluxos relacionados à visão administrativa do sistema (usuários, planos, auditoria e monitoramento), incluindo autenticação, primeiro acesso e integração sugerida no frontend.

Base da API: `/api/v1`
Autenticação: `Authorization: Bearer <token>` (JWT)

Observações gerais:
- Papéis: `admin` e `profissional`.
- Para rotas sensíveis, há middlewares: `autenticar` (JWT), `requireAdmin` (somente admin), `enforcePasswordReset` (bloqueia acesso até o usuário trocar a senha, exceto whitelist) e `enforceLicense` (profissionais precisam de licença ativa; admin não é bloqueado por licença).
- Whitelist de troca de senha: `/api/v1/usuarios/me/senha`, `/api/v1/usuarios/login`, `/api/v1/usuarios/login-admin`, `/health`, `/metrics`.

## Autenticação e Primeiro Acesso

- POST `/usuarios/login` (profissional)
  - Body: `{ pessoa_tipo: 'PF'|'PJ', cpf?: string, cnpj?: string, senha: string }`
  - Sucesso 200: `{ token, mustResetPassword: false, tipo: 'profissional', licenseExpiresAt, daysRemaining }`
  - Primeiro acesso 403: `{ message, mustResetPassword: true, resetToken }`
  - Licença expirada/inativa 403: `{ message, mustRenew: true, expiresAt? }`
  - Uso frontend:
    - Se 200: armazenar `token` e prosseguir.
    - Se 403 com `mustResetPassword`: guardar `resetToken` e redirecionar para tela de troca de senha.

- POST `/usuarios/login-admin` (admin)
  - Body: `{ email: string, senha: string }`
  - Sucesso 200: `{ token, mustResetPassword: boolean, tipo: 'admin' }`
  - Uso frontend:
    - Sempre retorna `token`. Se `mustResetPassword` for true, permitir apenas acesso mínimo e exigir troca de senha.

- GET `/usuarios/validarToken`
  - Autenticado.
  - Retorna `{ valid: true, infoUser }` com dados públicos do usuário (sem senha; CPF/CNPJ mascarados).
  - Uso frontend: hidratar sessão ao carregar o app (meus dados e papel).

- PUT `/usuarios/me/senha` (troca de senha)
  - Autenticado. Aceita tanto `token` normal quanto `resetToken` (de 10 minutos) recebido ao tentar logar no primeiro acesso.
  - Body: `{ senha_atual: string, nova_senha: string }`
  - Sucesso 200: retorna usuário público atualizado; `must_reset_password` passa a 0.
  - Fluxo recomendado:
    1) Profissional tenta login. Se 403 com `resetToken`, ir à tela de troca de senha.
    2) Enviar `PUT /me/senha` com `Authorization: Bearer <resetToken>` e body com a senha temporária (senha_atual) e a nova senha.
    3) Após sucesso, chamar `POST /usuarios/login` novamente para obter `token` normal.
    4) Para admin: usar o `token` de `/login-admin` e obrigar troca imediatamente.

## Usuários (Admin)

Base: `/usuarios` — protegido por `autenticar`, e em geral `requireAdmin` para ações administrativas.

- POST `/usuarios` (criar profissional)
  - Body obrigatório (validações):
    - `pessoa_tipo`: 'PF' | 'PJ'
    - PF: `nome`, `cpf` (11 dígitos), `telefone`, `email`, `plano_id`
    - PJ: `empresa_nome`, `cnpj` (14 dígitos), `telefone`, `email`, `plano_id` (campo `nome` opcional; se presente é validado)
  - Efeito: cria com senha temporária, marca `must_reset_password=1` e ativa licença do plano informado.
  - Respostas: 201 com dados públicos e `tempPasswordSent: true`; 409 em duplicidade (email/cpf/cnpj); 422 em validação.
  - Front: formulário de criação (PF/PJ), selecionar plano. Mostrar confirmação; a senha temporária é enviada por e-mail.

- GET `/usuarios` (listar)
  - Query opcional: `tipo=admin|profissional`.
  - Retorna lista de usuários com dados públicos (CPF/CNPJ mascarados).

- GET `/usuarios/{id}` (detalhar)
  - Admin pode ver qualquer. Profissional só pode ver a si mesmo.

- PUT `/usuarios/{id}` (atualizar)
  - Admin: pode alterar `nome`, `email`, `senha`, `telefone`, `empresa_nome`, `ativo`.
  - Profissional (self): pode alterar `nome`, `email`, `senha`, `telefone`.
  - Respostas: 200 atualizado; 409 duplicidade; 404 não encontrado.

- DELETE `/usuarios/{id}` (remover)
  - Somente admin; bloqueia remover a si próprio e o último admin existente.
  - 204 em sucesso; 404 se não encontrado; 409 se tentativa de remover último admin.

- POST `/usuarios/{id}/reset-password` (reset por admin)
  - Gera nova senha temporária e marca `must_reset_password=1`.
  - Resposta 200: retorna usuário público e `tempPassword` (além de enviar e-mail de reset).
  - Front: ação no detalhe/lista do usuário; exibir senha temporária somente se política permitir.

- POST `/usuarios/bootstrap-admin` (setup/testes)
  - Cria um admin adicional com `must_reset_password=1`.
  - Uso restrito (ambiente de setup/testes).

## Planos (Admin)

Base: `/planos` — protegido por `autenticar`, `enforcePasswordReset()` e `requireAdmin`.

- POST `/planos` (criar)
  - Body: `{ descricao: string, dias_acesso: number, ativo?: boolean }`
  - 201 com plano criado.

- GET `/planos` (listar com contagem)
  - Retorna lista: cada item inclui `ativos_count` (usuários com licença ativa).

- GET `/planos/{id}` (detalhar)
  - Retorna plano e `ativos_count`.

- PUT `/planos/{id}` (atualizar)
  - Body parcial: `{ descricao?, dias_acesso?, ativo? }`

- PUT `/planos/assign-user/{usuarioId}` (atribuir plano)
  - Body: `{ plano_id: number }`
  - Efeito: desativa licenças ativas e ativa nova licença conforme `dias_acesso` do plano.
  - Retorna `{ message, licenca }`.

- POST `/planos/renew-user/{usuarioId}` (renovar licença)
  - Body: `{ add_days: number > 0 }`
  - Efeito: soma dias na `expira_em` da licença ativa.
  - Retorna `{ message, licenca }`.

## Auditoria (Admin)

Base: `/auditoria` — autenticado e somente admin.

- GET `/auditoria` (listar)
  - Query: `page`, `pageSize` (1–100), `recurso`, `acao`, `usuario_id`, `entidade_id`, `de`, `ate` (ISO date-time).
  - Retorna array de registros conforme filtros (ordenado por `id DESC`).

- GET `/auditoria/{id}` (detalhar)
  - 404 se não encontrado.

Eventos auditados (exemplos): `auth: LOGIN/LOGIN_ADMIN/LOGIN_BLOCKED_MUST_RESET/LOGIN_LICENSE_BLOCK`, `usuario: CREATE/UPDATE/DELETE/RESET_PASSWORD/CHANGE_PASSWORD/BOOTSTRAP_ADMIN`.

## Monitor (Admin)

Base: `/admin/monitor` — autenticado, `enforcePasswordReset`, e `requireAdmin`.

- GET `/admin/monitor/db/summary`
  - Retorna: `{ database, sizeMB, topTables[], status{}, latencyMs, pool{} }`.

- GET `/admin/monitor/db/health`
  - Retorna: `{ ok: true, latencyMs }` ou `{ ok: false, message }` (503 quando indisponível).

- GET `/admin/monitor/server/summary`
  - Retorna: uptime, versão Node, OS, uso de memória, load (quando disponível), e tamanhos dos logs (`app.log`, `error.log`, `audit.log`).

Obs.: rotas de monitor têm rate limit básico.

## Integração Frontend — Recomendações

- Armazenamento de sessão
  - Guardar `token` (JWT) pós-login; incluir `Authorization: Bearer` em todas as chamadas protegidas.
  - Usar `GET /usuarios/validarToken` para hidratar sessão ao iniciar a aplicação e obter `infoUser.tipo`.

- Guardas de rota
  - Admin: somente renderizar área admin quando `infoUser.tipo === 'admin'`.
  - Primeiro acesso: se `mustResetPassword` (de `/login-admin`) ou se login profissional retornou 403 com `resetToken`, redirecionar para tela de troca de senha.
  - Licença: ao receber 403 com `{ mustRenew: true }`, exibir feedback e bloquear funcionalidades de profissionais até renovação (admin não é bloqueado).

- Fluxo de primeiro acesso (profissional)
  1) Login com CPF/CNPJ e senha temporária.
  2) Se 403 com `resetToken`: ir para tela “Defina sua nova senha”.
  3) Enviar `PUT /usuarios/me/senha` com `Authorization: Bearer <resetToken>` e body `{ senha_atual: <temp>, nova_senha }`.
  4) Ao sucesso, refazer login e seguir navegação normal.

- Gestão de usuários (admin)
  - Lista: `GET /usuarios?tipo=profissional|admin`.
  - Criar: `POST /usuarios` (fornecer `plano_id`).
  - Editar: `PUT /usuarios/{id}` (habilitar `ativo` e `empresa_nome` apenas para admin).
  - Reset de senha: ação `POST /usuarios/{id}/reset-password` (opcional exibir `tempPassword`).
  - Remover: `DELETE /usuarios/{id}` (ver mensagens 403/409 para auto-delete/último admin).

- Gestão de planos (admin)
  - Lista/detalhe/criação/edição via `/planos`.
  - Atribuir plano: `PUT /planos/assign-user/{usuarioId}`.
  - Renovar licença: `POST /planos/renew-user/{usuarioId}`.

- Auditoria (admin)
  - Tabela com filtros de período/usuário/recurso/ação.
  - Detalhe por ID mostrando `antes`/`depois` quando aplicável.

- Monitor (admin)
  - Dashboard com seções: DB Summary, DB Health (ping ms), Server Summary (memória, CPU, logs).

## Especificações de Respostas e Erros Comuns

- 401 `{ message: 'Token não fornecido' }` — ausência de JWT.
- 403 `{ message: 'Token inválido' }` — JWT inválido/expirado.
- 403 `{ message: 'Necessário alterar a senha...', mustResetPassword: true }` — bloqueio por primeiro acesso.
- 403 `{ message: 'Licença expirada ou plano inativo', mustRenew: true }` — bloqueio de licença (profissionais).
- 404 `{ message: '... não encontrado' }` — recurso inexistente.
- 409 `{ message: '...' }` — conflitos (duplicidade, último admin, etc.).
- 422 `{ message: '...' }` — erro de validação.

## Dicas Técnicas

- CPF/CNPJ retornam mascarados em respostas públicas.
- Em atualização de usuário, enviar apenas campos a alterar; backend atualiza dinamicamente.
- `resetToken` é um JWT curto com `{ id, purpose: 'password_reset' }`. Use-o apenas em `PUT /usuarios/me/senha`.
- Rotas admin também exigem senha já trocada (middleware `enforcePasswordReset`).

---

Dúvidas ou ajustes de contrato, abra uma issue com exemplos de payloads e respostas esperadas para alinhar com o backend.

