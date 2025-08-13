# MindGest - Backend

Backend completo do sistema MindGest, responsável por toda a lógica, armazenamento e APIs do sistema, preparado para suportar todas as funcionalidades que serão implementadas no frontend.

## Sobre o Projeto

O MindGest é um sistema pensado para profissionais da saúde mental e bem-estar, permitindo gerenciar agendas, pacientes, histórico de consultas e automações de atendimento de forma centralizada e eficiente.  
O backend fornece todas as APIs necessárias, garantindo autenticação, validação, segurança e integração com o banco de dados, além de servir como base para futuras funcionalidades do sistema.

## Funcionalidades Principais

- **APIs completas:** Endpoints preparados para suportar todas as funcionalidades do sistema.  
- **Segurança:** Autenticação via JWT e proteção de endpoints.  
- **Validação e regras de negócio:** Garantia de integridade e consistência dos dados.  
- **Integração com Banco de Dados:** Estrutura preparada para armazenar informações de agendas, pacientes, consultas e demais dados do sistema.  
- **Documentação via Swagger:** Endpoints documentados para fácil consumo pelo frontend.

## Tecnologias Utilizadas

- **Node.js** - Ambiente de execução do JavaScript no servidor.  
- **Express.js** - Framework para criação da API e gerenciamento de rotas.  
- **MySQL / PostgreSQL** - Banco de dados relacional para persistência dos dados.  
- **bcryptjs** - Criptografia de senhas.  
- **jsonwebtoken (JWT)** - Autenticação de usuários.  
- **Swagger** - Documentação de endpoints da API.
- **Url:** http://localhost:3000/docs/

## Estrutura do Projeto

```text
/src
 ├─ controllers/     # Lógica dos endpoints
 ├─ models/          # Modelos e consultas ao banco de dados
 ├─ routes/          # Rotas da API
 ├─ middlewares/     # Validações e autenticação
 ├─ config/          # Configurações gerais e do banco
 └─ app.js           # Inicialização do servidor


