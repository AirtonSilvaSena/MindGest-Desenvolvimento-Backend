# MindGest Backend

API Node.js/Express com MySQL, JWT, documentação Swagger, logging estruturado, auditoria e métricas básicas.

## Requisitos
- Node.js 16+
- MySQL/MariaDB

## Configuração
1. Copie `.env.example` para `.env` e ajuste as variáveis.
2. Importe o schema SQL: `Banco de Dados/bdSql.sql` no seu banco (`mindgest`).
3. Instale dependências: `npm install` (o projeto usa apenas dependências já listadas).

## Executar
- Dev: `npm run dev`
- Prod: `npm start`

## Principais Endpoints
- Health: `GET /health`
- Docs Swagger: `GET /docs`
- Métricas: `GET /metrics`
- Usuários: `POST /api/v1/usuarios`, `POST /api/v1/usuarios/login`, etc.
- Pacientes: `GET/POST/PUT/DELETE /api/v1/pacientes`
- Consultas: `GET/POST/PUT/PATCH/DELETE /api/v1/consultas`
- Auditoria (admin): `GET /api/v1/auditoria`, `GET /api/v1/auditoria/:id`

## Logging
- Logs em `./logs`: `app.log`, `error.log`, `audit.log` (JSONL)
- Cada request recebe `X-Request-Id` para rastreabilidade.

## Auditoria
Tabela `auditoria` registra ações de CREATE/UPDATE/DELETE/LOGIN em recursos.
Filtros por `recurso`, `acao`, `usuario_id`, `entidade_id` e datas.

## Segurança
- Headers básicos via middleware
- Rate limit simples no login
- CORS configurável via `CORS_ORIGINS`

