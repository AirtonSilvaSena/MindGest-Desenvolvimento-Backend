# Licenças – Integração Frontend (Admin)

Guia focado exclusivamente na integração das licenças de usuário (atribuição e renovação), alinhado às rotas e regras deste backend.

- Base da API: `/api/v1`
- Autorização: `Authorization: Bearer <token>` (JWT)
- Papéis: `admin` (gestão), `profissional` (consome o resultado)
- Middlewares: `autenticar`, `requireAdmin`, `enforcePasswordReset`, `enforceLicense`

## Conceitos
- Plano: catálogo administrativo com `descricao`, `dias_acesso` e flag `ativo`.
- Licença do Usuário: histórico de concessões por usuário. Uma licença ativa por vez; expira pela data `expira_em`.
- Bloqueio: profissionais sem licença ativa ou com licença expirada são bloqueados nas rotas privadas. Admin nunca é bloqueado por licença.

## Endpoints de Licença (Admin)
- Atribuir plano a usuário
  - Rota: `PUT /planos/assign-user/{usuarioId}`
  - Requisitos: plano existente e ativo no corpo da requisição.
  - Efeito: desativa licenças ativas do usuário e cria nova licença com validade baseada em `dias_acesso` do plano.
  - Retorno: mensagem de confirmação e objeto da licença ativa após a operação.

- Renovar licença ativa
  - Rota: `POST /planos/renew-user/{usuarioId}`
  - Requisitos: informar quantidade de dias a adicionar (> 0).
  - Efeito: soma os dias informados à data `expira_em` da licença ativa.
  - Retorno: mensagem de confirmação e objeto da licença ativa após a operação.

Observação: não há rota dedicada para consultar “licença ativa por usuário” no admin. Caso necessário para a UI, sugerir adição de `GET /usuarios/{id}/licenca/ativa`.

## Regras de Negócio
- Um usuário pode ter várias licenças no histórico, mas somente uma ativa.
- Atribuir um novo plano encerra a licença ativa anterior, criando outra com novo prazo.
- Renovação exige licença ativa; se inexistente, retorna erro de não encontrado.
- O bloqueio do profissional ocorre no acesso às rotas privadas quando não há licença ativa ou quando está expirada. Rotas essenciais (login, troca de senha, health/metrics e inbox) são liberadas pelo middleware.

## UX recomendada (Admin)
- Local das ações: seção “Licença” no detalhe do usuário.
- Ações principais: “Atribuir plano” (escolha entre planos ativos) e “Renovar licença” (informar dias).
- Exibir contexto quando disponível: plano atual, datas de emissão/expiração, status (ativa/expirada).
- Feedbacks claros após sucesso/erro e atualização da seção após a operação.

## Estados e Erros
- Estados: carregando, salvando, sucesso, erro.
- Erros mais comuns:
  - 401/403: autenticação ausente ou sem permissão de admin.
  - 422: validação (plano inválido/inativo; dias inválidos).
  - 404: sem licença ativa para renovar.
  - 500: falhas internas.

## Impacto no Profissional
- Login pode retornar bloqueio por licença expirada/inativa junto de um indicador de renovação necessária.
- Após atribuição/renovação pelo admin, o profissional volta a autenticar e acessar normalmente.

## Auditoria e Observabilidade
- Operações de atribuição/renovação são registradas em auditoria e logs.
- Recomenda-se exibir `X-Request-Id` em mensagens de erro para facilitar suporte e rastreabilidade.

## Considerações Finais
- Para exibir a licença ativa diretamente no detalhe do usuário sem acionar uma operação, considere solicitar a adição de uma rota específica.
- Para listagens com filtros por status de licença (ativa/expirada), sugerir endpoints de busca dedicados conforme a necessidade do frontend.
