# Licenças (Admin) – Integração no Frontend

Documento descritivo, sem código, para integrar a gestão de licenças dos profissionais no frontend. Não cobre a criação de usuário com licença inicial, pois o seu frontend já implementa esse fluxo. O foco aqui é consultar, trocar (atribuir novo plano) e renovar licenças existentes.

- Base da API: `/api/v1`
- Autenticação: `Authorization: Bearer <token>` (JWT)
- Perfil: `admin` para todas as ações administrativas
- Middlewares: `autenticar`, `requireAdmin`, `enforcePasswordReset` (admin não é bloqueado por licença)

## Conceitos Rápidos
- Plano: catálogo com `descricao`, `dias_acesso`, `ativo`.
- Licença do Usuário: histórico 1:N por profissional. Apenas uma `ativa` por vez, com validade em `expira_em`.
- Efeito prático: profissionais sem licença ativa/válida são bloqueados nas rotas privadas; inbox, login e troca de senha permanecem liberados.

## Endpoints Relevantes

Preferência de uso no frontend (novas rotas por usuário):
- Consultar licença ativa do usuário
  - `GET /usuarios/{id}/licenca/ativa`
  - Retorna 404 se não houver ativa.
- Listar histórico de licenças do usuário
  - `GET /usuarios/{id}/licencas`
  - Ordenado do mais recente para o mais antigo.
- Atribuir um novo plano (trocar de plano)
  - `POST /usuarios/{id}/licencas/assign` (admin)
  - Efeito: encerra licenças ativas anteriores, cria nova licença com `dias_acesso` do plano.
- Renovar a licença ativa (somar dias)
  - `POST /usuarios/{id}/licencas/renew` (admin)
  - Requisito: existir licença ativa; caso contrário, retorna 404.

Compatibilidade (rotas já existentes via módulo de planos):
- `PUT /planos/assign-user/{usuarioId}` (atribuir)
- `POST /planos/renew-user/{usuarioId}` (renovar)

Observação: as rotas por usuário facilitam a navegação do CRUD no detalhe do profissional; as rotas em `/planos` continuam válidas.

## Dados Exibidos nas Telas

- Lista de profissionais (admin)
  - Consumir `GET /usuarios?tipo=profissional`.
  - Cada item pode incluir `licenca_ativa` (plano, emissão, expiração, status ativo).
  - Sinalização útil: "Ativa até DD/MM/AAAA" | "Expirada em DD/MM/AAAA" | "Sem licença".

- Detalhe do profissional (admin)
  - Consumir `GET /usuarios/{id}`; se o usuário for profissional, a resposta inclui `licenca_ativa`.
  - Para histórico, usar `GET /usuarios/{id}/licencas`.
  - Mostrar: plano atual (quando ativo), `emitido_em`, `expira_em`, status.

## Fluxos de UI

- Trocar de plano (atribuir)
  - Abrir seleção de planos ativos.
  - Confirmar operação indicando o novo plano e a validade prevista (dias do plano).
  - Após sucesso, atualizar a seção com a nova `licenca_ativa` e registrar feedback ao usuário.

- Renovar licença
  - Solicitar quantidade de dias (> 0) a somar.
  - Após sucesso, atualizar a validade exibida e registrar feedback.

- Estados e mensagens
  - Estados: carregando, salvando, sucesso, erro.
  - Principais erros:
    - 422: plano inválido/inativo (atribuição) ou dias inválidos (renovação)
    - 404: renovar sem licença ativa
    - 401/403: autorização/permissão
    - 500: falhas internas

## Recomendações de UX
- Destacar CTAs apenas quando aplicáveis (p.ex., "Renovar" apenas quando há licença ativa; "Atribuir" sempre disponível).
- Fornecer rótulos claros de status (ativa/expirada/ausente) e datas legíveis.
- Exibir aviso de confirmação ao trocar de plano, pois encerra a licença anterior.

## Auditoria e Suporte
- As operações (atribuir/renovar) são registradas em auditoria.
- Exibir (quando disponível) o `X-Request-Id` em erros para acelerar suporte.

## Notas Técnicas
- O backend expõe `licenca_ativa` embutida nas respostas de usuário profissional tanto na listagem quanto no detalhe.
- As rotas administrativas exigem `requireAdmin` e sessão válida; `enforcePasswordReset` pode exigir troca de senha pendente do admin.
