# CRUD de Usuários (Admin) – Integração Frontend

Documento descritivo para implementação da visão administrativa de usuários no frontend. Foca em fluxos, campos, estados e validações, sem trechos de código.

- Base da API: `/api/v1`
- Autenticação: `Authorization: Bearer <token>` (JWT)
- Perfil alvo: `admin`
- Middlewares nas rotas: `autenticar`, `requireAdmin`, `enforcePasswordReset`

## Escopo e Premissas
- O admin realiza o CRUD completo de usuários profissionais (PF/PJ).
- Primeiro acesso de profissionais usa senha temporária e exige troca (must_reset_password=1).
- Licença é obrigatória na criação (plano) e pode ser gerida depois (atribuir/renovar) via módulo de planos.
- E-mails (boas‑vindas/reset) são enviados se o mailer estiver habilitado no backend.

## Modelo de Dados (exibição)
- Identificação: `id`, `tipo` (sempre `profissional` aqui), `pessoa_tipo` (`PF`/`PJ`).
- PF: `nome`, `cpf` (mascarado na listagem/detalhe), `telefone`, `email`.
- PJ: `empresa_nome` (exibido como nome), `cnpj` (mascarado), `telefone`, `email`.
- Estado: `ativo` (booleano); `must_reset_password` (na API, não exibir em card público), timestamps `criado_em`, `atualizado_em`.

## Endpoints Utilizados (Admin)
- Listar: `GET /usuarios?tipo=profissional`.
- Detalhar: `GET /usuarios/{id}`.
- Criar: `POST /usuarios`.
- Atualizar: `PUT /usuarios/{id}` (somente admin).
- Remover: `DELETE /usuarios/{id}` (somente admin).
- Resetar senha: `POST /usuarios/{id}/reset-password` (somente admin).
- Autenticação admin: `POST /usuarios/login-admin` (para obter o token do painel admin).

Observação sobre licenças:
- Atribuir plano: `PUT /planos/assign-user/{usuarioId}`.
- Renovar licença: `POST /planos/renew-user/{usuarioId}`.
- Ver detalhes de planos/renovações: ver documento “Planos – Integração Frontend (Admin)”.

## Fluxos e Regras

### 1) Listagem de Usuários
- Filtro recomendado: `tipo=profissional` (lista apenas profissionais).
- Colunas sugeridas: Nome/Empresa, Pessoa (PF/PJ), Email, Telefone, Ativo, Criado em, Ações.
- Ordenação: por padrão o backend retorna por `id DESC`; pode-se exibir o mais recente primeiro.
- Pesquisa: não há endpoint de busca dedicada; caso necessário, abrir issue para incluir filtros (q, email, cpf/cnpj, ativo, datas).

### 2) Detalhamento do Usuário
- Exibir todos os dados públicos retornados, com CPF/CNPJ mascarados.
- Ações disponíveis no detalhe: Atualizar dados, Resetar senha, Atribuir plano, Renovar licença, Ativar/Desativar, Excluir.
- Licença ativa: não é retornada neste endpoint; para UI, oferecer ações de plano/renovação e feedback via resposta dos endpoints de planos.

### 3) Criação (PF/PJ)
- PF: campos obrigatórios: `pessoa_tipo=PF`, `nome`, `cpf` (11 dígitos), `telefone`, `email`, `plano_id`.
- PJ: campos obrigatórios: `pessoa_tipo=PJ`, `empresa_nome`, `cnpj` (14 dígitos), `telefone`, `email`, `plano_id`.
- Efeitos no backend:
  - Gera senha temporária, define `must_reset_password=1`.
  - Atribui licença ativa com base em `plano_id` (usa `dias_acesso` do plano).
  - Envia e-mail de boas‑vindas se configurado.
- Respostas e erros:
  - Sucesso: 201 com dados públicos do usuário (sem senha) e `tempPasswordSent: true`.
  - Validação: 422.
  - Duplicidade: 409 (email/cpf/cnpj já cadastrados).

### 4) Atualização (Admin)
- Campos permitidos para admin: `nome` (PF), `empresa_nome` (PJ), `email`, `senha`, `telefone`, `ativo`.
- Regra de exibição: para PJ, o “nome” exibido pode ser `empresa_nome`.
- Conflitos: e-mail duplicado retorna 409.
- Dica de UX: indicar claramente quando o usuário for desativado (`ativo=false`).

### 5) Reset de Senha (Admin)
- Gera nova senha temporária e marca `must_reset_password=1`.
- Retorno inclui `tempPassword` (tratar como dado sensível; exibir apenas no momento da ação e permitir copiar).
- E-mail de reset pode ser enviado automaticamente se mailer ativo.

### 6) Exclusão
- Restrições: não é permitido remover o último admin nem o próprio admin autenticado.
- Para profissionais, não há restrição especial além de existir o registro.
- Respostas: 204 sucesso; 404 se não encontrado; 409 ao tentar remover o último admin (aplica-se ao tipo admin).

### 7) Licenças (via Planos)
- Atribuir novo plano ao usuário: encerra licenças ativas anteriores, cria nova licença ativa com `expira_em` recalculado.
- Renovar licença ativa: soma dias em `expira_em`.
- Respostas incluem o objeto de licença ativa após a operação.

## Estados, Mensagens e Erros (UI)
- Estados: carregando (listagem/detalhe), salvando, sucesso, erro.
- Alertas:
  - Sucesso ao criar/atualizar/excluir/resetar senha/atribuir/renovar.
  - Erros 401/403: sessão expirada ou sem permissão; redirecionar ao login admin.
  - Erros 422: mensagens de validação sob os campos.
  - Erros 409: destacar duplicidades (email/cpf/cnpj).
- MustResetPassword (para admin): se `login-admin` retornar `mustResetPassword=true`, restringir UI até concluir `PUT /usuarios/me/senha`.

## Navegação e Componentização
- Lista de usuários (com filtro por PF/PJ, ativo) → ao clicar: detalhe do usuário.
- Ações no detalhe:
  - Editar dados (PF/PJ)
  - Resetar senha (exibe temporária)
  - Atribuir plano (seleção de plano ativo)
  - Renovar licença (entrada de dias)
  - Alternar ativo (toggle)
  - Excluir (confirmação dupla)
- Pós‑ação: recarregar detalhe/lista conforme necessário para refletir estado atualizado.

## Segurança e Auditoria
- Todas as rotas passam por `autenticar` e `requireAdmin` (salvo `/me`).
- O backend registra auditoria em CRUD de usuários, login, troca de senha e ações de licenças.
- Exibir `X-Request-Id` nas mensagens de erro pode ajudar na correlação de logs.

## Considerações Finais
- Para paginação/ordenação/filtros adicionais, abrir issue detalhando parâmetros e respostas desejadas.
- Para exibir informações da licença ativa diretamente no detalhe do usuário, sugerir endpoint dedicado (`GET /usuarios/{id}/licenca/ativa`).

