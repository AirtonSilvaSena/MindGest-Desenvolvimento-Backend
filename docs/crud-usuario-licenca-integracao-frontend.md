# Usuário x Licença – Integração Frontend (Admin)

Documento descritivo, sem código, para implantar no frontend toda a gestão de licença do usuário (atribuição e renovação de planos), considerando regras, estados e respostas da API deste projeto.

- Base da API: `/api/v1`
- Autenticação: `Authorization: Bearer <token>` (JWT)
- Papel: `admin` (gestão); profissionais apenas consomem o resultado (bloqueio/liberação de acesso)
- Middlewares: `autenticar`, `enforcePasswordReset()`, `requireAdmin` (para endpoints administrativos)

## Escopo
- Atribuir plano a um usuário profissional (ativa nova licença).
- Renovar a licença ativa do usuário (somar dias à validade).
- Comportamento de bloqueio do profissional quando não há licença ativa/válida.
- Regras de UI/UX para telas de usuário (admin) e impactos no login do profissional.

## Modelo de Dados (conceitual)
- Plano
  - Campos principais: `id`, `descricao`, `dias_acesso`, `ativo`.
- Licença de Usuário (histórico)
  - Tabela de histórico por usuário.
  - Campos: `id`, `usuario_id`, `plano_id`, `emitido_em`, `expira_em`, `ativo`.
  - “Licença ativa” = registro com `ativo=1` mais recente para o usuário.
- Usuário profissional
  - Dados de identificação e contato; relação 1:N com histórico de licenças.

Observações:
- Ao criar um usuário (admin), é obrigatório informar um `plano_id`. O backend desativa licenças anteriores (se existirem) e cria uma licença ativa conforme `dias_acesso` do plano.
- A atribuição de um novo plano substitui a licença ativa (encerra a anterior e cria outra com nova validade).

## Endpoints Envolvidos (Admin)
- Atribuir plano ao usuário
  - Método/rota: PUT `/planos/assign-user/{usuarioId}`
  - Requer corpo com `plano_id` (plano existente e ativo).
  - Efeito: desativa licenças ativas do usuário e cria uma nova com validade baseada em `dias_acesso` do plano.
  - Sucesso: retorna objeto da licença ativa após a operação.
- Renovar licença ativa
  - Método/rota: POST `/planos/renew-user/{usuarioId}`
  - Requer corpo com `add_days` (número de dias > 0).
  - Efeito: soma `add_days` à data `expira_em` da licença ativa.
  - Sucesso: retorna objeto da licença ativa após a operação.

Erros relevantes:
- `422` ao atribuir se `plano_id` inválido/inativo; ao renovar se `add_days <= 0`.
- `404` ao renovar quando não existe licença ativa para o usuário.
- `401/403` por falta de token ou sem permissão/admin.
- `500` para falhas internas.

## Regras de Negócio e Comportamento
- Atribuição
  - O plano precisa estar “ativo”.
  - Usuário pode ter várias licenças no histórico; apenas uma ativa.
  - Ao atribuir, a licença anterior ativa (se houver) é marcada como inativa e é emitida uma nova licença com `emitido_em=agora` e `expira_em=agora + dias_acesso`.
- Renovação
  - Exige licença ativa; se não houver, retorna `404`.
  - `add_days` é somado sobre a `expira_em` atual (não reinicia contagem a partir de “agora”).
- Bloqueio de acesso do profissional
  - Middleware de licença impede o uso de rotas privadas quando não há licença ativa ou quando a validade expirou.
  - O admin nunca é bloqueado por licença.
  - Há whitelist (login, troca de senha, health/metrics e inbox) para permitir fluxos mínimos mesmo sem licença.

## Integração no Front (Admin)

### Onde expor as ações
- Detalhe do usuário profissional: seção “Licença”.
- Ações principais:
  - “Atribuir plano” (seleção a partir dos planos ativos).
  - “Renovar licença” (entrada de dias a adicionar, ex.: 30/60/90).
- Informações úteis de contexto (se disponíveis):
  - Plano atualmente atribuído (se houver licença ativa).
  - Data de emissão e data de expiração.
  - Status “ativa/expirada”.

### Fluxos sugeridos
- Atribuir plano
  - Abrir modal com lista de planos ativos.
  - Confirmar operação exibindo o plano escolhido e o novo período de acesso (dias do plano).
  - No sucesso: exibir mensagem de confirmação e atualizar seção de licença (GET do detalhe do usuário e/ou reconsulta de dados do plano, caso a UI mostre informações agregadas).
- Renovar licença
  - Abrir modal para informar `add_days` (> 0).
  - No sucesso: exibir confirmação e atualizar a validade apresentada.
- Estados de carregamento/erro
  - Desabilitar botões durante requisição.
  - Exibir mensagens claras para `422/404/500` com instruções ao admin.

### UI/UX
- Exibir claramente o status da licença: “Ativa até DD/MM/AAAA” ou “Expirada em DD/MM/AAAA”.
- Mostrar o plano associado quando ativo.
- Em usuários sem licença ativa: destacar call‑to‑action “Atribuir plano”.
- Ao renovar: indicar quanto tempo foi adicionado, sem esconder a data anterior (ex.: “+30 dias”).

## Impactos no Fluxo do Profissional
- Login do profissional pode retornar:
  - `403` com `mustResetPassword=true` (primeiro acesso) e `resetToken` para troca de senha.
  - `403` com `mustRenew=true` quando a licença estiver inativa/expirada (não libera token normal).
- Após atribuição/renovação pelo admin, o profissional volta a conseguir autenticar e acessar as rotas protegidas.

## Auditoria e Observabilidade
- Atribuição e renovação geram logs/auditoria no backend (recurso relacionado a planos), incluindo usuário alvo e novas datas.
- Para suporte, recomenda‑se exibir mensagens de erro com `X-Request-Id` (quando disponível) para correlação com os logs de servidor.

## Considerações e Extensões
- Consultar licença ativa do usuário
  - Atualmente a API retorna a licença ativa indiretamente via respostas de atribuição/renovação e no login do profissional.
  - Caso o frontend precise exibir a licença ativa diretamente no detalhe do usuário sem acionar uma operação, recomenda‑se adicionar um endpoint dedicado (ex.: `GET /usuarios/{id}/licenca/ativa`).
- Filtros e paginação
  - Caso seja necessário listar usuários filtrando por status da licença (ativa/expirada), considerar uma rota de busca específica no backend.
- Internacionalização
  - Datas e mensagens de status devem respeitar o locale do frontend.
