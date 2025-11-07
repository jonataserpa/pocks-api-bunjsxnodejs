# POC: Fastify vs Elysia - Comparação de Performance

Projeto de Prova de Conceito (POC) comparando a performance entre duas APIs:
- **Fastify** (Node.js) - Framework web rápido para Node.js
- **Elysia** (Bun.js) - Framework web otimizado para Bun.js

## 📁 Estrutura do Projeto

```
.
├── api-nodejs-fastify/     # API com Fastify (Node.js)
├── api-bunjs-elysia/       # API com Elysia (Bun.js)
├── load-test/              # Scripts de teste de carga
├── docker-compose.yml      # Configuração do PostgreSQL
└── README.md              # Este arquivo
```

## 🚀 Quick Start

### 1. Subir o banco de dados PostgreSQL

```bash
docker-compose up -d
```

### 2. Configurar e executar Fastify (Node.js)

```bash
cd api-nodejs-fastify
cp .env.example .env
npm install
npm run dev
```

A API estará disponível em: `http://localhost:3000`

### 3. Configurar e executar Elysia (Bun.js)

```bash
cd api-bunjs-elysia
cp .env.example .env
bun install
bun run dev
```

A API estará disponível em: `http://localhost:3001`

### 4. Executar testes de carga

```bash
cd load-test
npm install
npm run test:both
```

## 📊 Funcionalidades

Ambas as APIs implementam um CRUD completo de usuários com:

- ✅ Validação de entrada (usando Zod)
- ✅ Conexão com PostgreSQL
- ✅ Tratamento de erros
- ✅ CORS habilitado
- ✅ Health check endpoint

### Endpoints disponíveis

- `GET /health` - Health check
- `GET /users` - Listar todos os usuários
- `GET /users/:id` - Buscar usuário por ID
- `POST /users` - Criar novo usuário
- `PUT /users/:id` - Atualizar usuário
- `DELETE /users/:id` - Deletar usuário

## 🧪 Validações

### Criar Usuário
```json
{
  "name": "string (2-255 caracteres)",
  "email": "string (email válido, único)",
  "age": "number (1-150, inteiro)"
}
```

### Atualizar Usuário
Todos os campos são opcionais:
```json
{
  "name": "string (opcional)",
  "email": "string (opcional, email válido)",
  "age": "number (opcional, 1-150)"
}
```

## 🔧 Tecnologias Utilizadas

### Fastify (Node.js)
- Node.js 18+
- Fastify 4.x
- TypeScript
- PostgreSQL (pg)
- Zod

### Elysia (Bun.js)
- Bun.js
- Elysia 1.x
- TypeScript
- PostgreSQL (pg)
- Zod

### Testes de Carga
- Autocannon

## 📈 Testes de Performance

Os scripts de teste de carga (`load-test/`) executam:

1. **GET /users**: 100 conexões, 30 segundos
2. **POST /users**: 50 conexões, 30 segundos
3. **GET /users/:id**: 100 conexões, 30 segundos

Métricas coletadas:
- Requests por segundo
- Latência (média, P50, P99)
- Taxa de sucesso
- Throughput

## 🐳 Docker Compose

O `docker-compose.yml` configura um PostgreSQL com:
- Porta: 5432
- Database: `pocks_db`
- User: `postgres`
- Password: `postgres`

## 📝 Notas

- Ambas as APIs usam a mesma estrutura de banco de dados
- As validações são idênticas em ambos os projetos
- Os testes de carga são executados nas mesmas condições para comparação justa

## 🔍 Comparação

Execute `npm run test:both` na pasta `load-test/` para obter uma comparação detalhada entre as duas APIs, incluindo:
- Diferença percentual em requests/s
- Comparação de latência
- Análise de throughput

