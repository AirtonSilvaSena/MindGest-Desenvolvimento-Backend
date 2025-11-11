# Planos — Integração Frontend (Admin)

Este guia descreve como integrar o CRUD de Planos e as ações de licenças (atribuir e renovar) no frontend. Todas as rotas são administrativas e protegidas por autenticação JWT, exigem que o admin tenha trocado a senha (middleware de reset) e passam por `requireAdmin`.

- Base da API: `/api/v1`
- Autorização: `Authorization: Bearer <token>`
- Prefixo: `/planos`

Observação: Profissionais não acessam estas rotas. A lógica de licença que bloqueia profissionais não se aplica ao admin nestes endpoints.

## Modelo de Dados (Plano)

Campos principais:
- `id: number`
- `descricao: string`
- `dias_acesso: number` (quantidade de dias da licença ativada ao atribuir este plano)
- `ativo: boolean` (0/1 no banco)

Campos agregados em listagem/detalhe:
- `ativos_count: number` (quantidade de usuários com licença ativa deste plano)

## Endpoints

Todos exigem token de admin e passam por `autenticar`, `enforcePasswordReset()` e `requireAdmin`.

1) Criar plano
- POST `/planos`
- Body: `{ descricao: string, dias_acesso: number, ativo?: boolean }`
- Respostas: `201` com o plano criado.
- Validação: `descricao` e `dias_acesso` obrigatórios.

2) Listar planos (com contagem de ativos)
- GET `/planos`
- Resposta: `200` com lista de planos; cada item inclui `ativos_count`.

3) Detalhar plano (com contagem)
- GET `/planos/{id}`
- Resposta: `200` com `{ ...plano, ativos_count }` ou `404` se não encontrado.

4) Atualizar plano
- PUT `/planos/{id}`
- Body parcial: `{ descricao?, dias_acesso?, ativo? }`
- Respostas: `200` com o plano atualizado (sem `ativos_count`); use GET para re-obter a contagem.

5) Atribuir plano a usuário (nova licença)
- PUT `/planos/assign-user/{usuarioId}`
- Body: `{ plano_id: number }`
- Efeito: desativa licenças ativas do usuário e cria nova licença com `dias_acesso` do plano informado.
- Resposta: `200` `{ message: 'Plano atribuído', licenca }`; `422` para plano inválido/inativo.

6) Renovar licença ativa do usuário (somar dias)
- POST `/planos/renew-user/{usuarioId}`
- Body: `{ add_days: number }` (deve ser > 0)
- Efeito: adiciona dias em `expira_em` da licença ativa; erro `404` se o usuário não tiver licença ativa.
- Resposta: `200` `{ message: 'Licença renovada', licenca }`; `422` para `add_days` inválido.

## Padrões de Erro

- `401` `{ message: 'Token não fornecido' }`
- `403` `{ message: 'Necessário alterar a senha...', mustResetPassword: true }` (troca de senha pendente)
- `404` `{ message: 'Plano não encontrado' | 'Licença ativa não encontrada' }`
- `422` `{ message: '...' }` (validações de payload)
- `500` `{ message: 'Erro ...' }` (falhas internas)

## Recomendações de UI/UX

- Listagem de planos: mostrar `descricao`, `dias_acesso`, `ativo` e `ativos_count`.
- Criação/Edição: formulário com validação para `descricao` e `dias_acesso` numérico > 0; toggle de `ativo`.
- Atribuir plano: ação no contexto de um usuário (detalhe do usuário); requer seleção de um plano ativo.
- Renovar licença: ação no contexto de um usuário com licença ativa; input de `add_days` > 0.
- Após atualizar plano: se exibe `ativos_count` na mesma tela, refazer GET do plano (detalhe) para recompor contagem.

## Exemplo de Integração (Axios + React)

Tipos utilitários:
```ts
export type Plano = {
  id: number;
  descricao: string;
  dias_acesso: number;
  ativo: boolean | 0 | 1;
  ativos_count?: number;
};

export type LicencaAtiva = {
  id: number;
  usuario_id: number;
  plano_id: number;
  emitido_em: string;
  expira_em: string;
  ativo: boolean | 0 | 1;
  // campos do join
  descricao?: string;
  dias_acesso?: number;
  plano_ativo?: boolean | 0 | 1;
};
```

Serviço de API (reaproveite interceptors já configurados):
```ts
import axios from 'axios';

export const api = axios.create({ baseURL: '/api/v1' });

// Opcional: incluir Authorization via interceptor global conforme docs de autenticação
```

Serviços de Planos:
```ts
import { api } from './api';
import type { Plano, LicencaAtiva } from './types';

export async function listarPlanos(): Promise<Plano[]> {
  const { data } = await api.get('/planos');
  return data;
}

export async function detalharPlano(id: number): Promise<Plano> {
  const { data } = await api.get(`/planos/${id}`);
  return data; // inclui ativos_count
}

export async function criarPlano(body: { descricao: string; dias_acesso: number; ativo?: boolean }): Promise<Plano> {
  const { data } = await api.post('/planos', body);
  return data;
}

export async function atualizarPlano(id: number, body: Partial<{ descricao: string; dias_acesso: number; ativo: boolean }>): Promise<Plano> {
  const { data } = await api.put(`/planos/${id}`, body);
  return data; // sem ativos_count
}

export async function atribuirPlanoAoUsuario(usuarioId: number, plano_id: number): Promise<{ message: string; licenca: LicencaAtiva }> {
  const { data } = await api.put(`/planos/assign-user/${usuarioId}`, { plano_id });
  return data;
}

export async function renovarLicencaUsuario(usuarioId: number, add_days: number): Promise<{ message: string; licenca: LicencaAtiva }> {
  const { data } = await api.post(`/planos/renew-user/${usuarioId}`, { add_days });
  return data;
}
```

Exemplo de tela simples (lista + criação):
```tsx
import React, { useEffect, useState } from 'react';
import { listarPlanos, criarPlano, atualizarPlano } from '../services/planos';
import type { Plano } from '../services/types';

export default function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [form, setForm] = useState({ descricao: '', dias_acesso: 30, ativo: true });

  async function load() {
    const itens = await listarPlanos();
    setPlanos(itens);
  }

  useEffect(() => { load(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    await criarPlano({ ...form, dias_acesso: Number(form.dias_acesso) });
    setForm({ descricao: '', dias_acesso: 30, ativo: true });
    await load();
  }

  async function onToggleAtivo(p: Plano) {
    await atualizarPlano(p.id, { ativo: !(!!p.ativo) });
    await load();
  }

  return (
    <div>
      <h1>Planos</h1>
      <form onSubmit={onCreate}>
        <input placeholder="Descrição" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} required />
        <input type="number" min={1} value={form.dias_acesso} onChange={e => setForm({ ...form, dias_acesso: Number(e.target.value) })} required />
        <label>
          Ativo <input type="checkbox" checked={!!form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} />
        </label>
        <button type="submit">Criar</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>ID</th><th>Descrição</th><th>Dias</th><th>Ativo</th><th>Usuários ativos</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {planos.map(p => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.descricao}</td>
              <td>{p.dias_acesso}</td>
              <td>{!!p.ativo ? 'Sim' : 'Não'}</td>
              <td>{p.ativos_count ?? 0}</td>
              <td>
                <button onClick={() => onToggleAtivo(p)}>{!!p.ativo ? 'Desativar' : 'Ativar'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Exemplos de ações por usuário (atribuir e renovar) — normalmente na tela de detalhe do usuário:
```ts
// Atribuir
await atribuirPlanoAoUsuario(usuarioId, plano_idSelecionado);
// Renovar +30 dias
await renovarLicencaUsuario(usuarioId, 30);
```

## Notas Técnicas

- O update de plano retorna o registro atualizado sem `ativos_count`; para exibir contagem atualizada, chame `GET /planos/{id}` ou `GET /planos` após salvar.
- `assign-user` valida se o plano existe e está ativo; retorna `422` se inválido/inativo.
- `renew-user` retorna `404` quando o usuário não possui licença ativa.
- Considere tratativas de erro 422/404 no formulário (exibir mensagens amigáveis).

---

Para dúvidas de contrato ou necessidades adicionais (filtros, paginação, ordenação), sugira no frontend e abra uma issue com payloads e respostas esperadas para alinhamento.

