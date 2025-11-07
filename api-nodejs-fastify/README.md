# API Node.js com Fastify

API RESTful construída com Node.js, Fastify e TypeScript para POC de performance.

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **Fastify** - Framework web rápido e eficiente
- **TypeScript** - Superset do JavaScript com tipagem estática
- **PostgreSQL** - Banco de dados relacional
- **Zod** - Validação de schemas
- **pg** - Cliente PostgreSQL para Node.js

## 📋 Pré-requisitos

- Node.js 18+ ou superior
- PostgreSQL (via Docker Compose recomendado)

## 🔧 Instalação

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

3. Edite o arquivo `.env` com suas configurações do banco de dados.

## 🏃 Executando

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm start
```

## 📡 Endpoints

### Health Check
- `GET /health` - Verifica se a API está funcionando

### Usuários
- `GET /users` - Lista todos os usuários
- `GET /users/:id` - Busca um usuário por ID
- `POST /users` - Cria um novo usuário
- `PUT /users/:id` - Atualiza um usuário
- `DELETE /users/:id` - Deleta um usuário

## 📝 Validações

### Criar Usuário (POST /users)
```json
{
  "name": "string (min: 2, max: 255)",
  "email": "string (email válido, único)",
  "age": "number (inteiro, min: 1, max: 150)"
}
```

### Atualizar Usuário (PUT /users/:id)
Todos os campos são opcionais:
```json
{
  "name": "string (opcional)",
  "email": "string (opcional, email válido, único)",
  "age": "number (opcional, inteiro, min: 1, max: 150)"
}
```

## 🔍 Exemplo de Requisição

```bash
# Criar usuário
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "age": 30
  }'

# Listar usuários
curl http://localhost:3000/users

# Buscar usuário por ID
curl http://localhost:3000/users/1

# Atualizar usuário
curl -X PUT http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Santos",
    "age": 31
  }'

# Deletar usuário
curl -X DELETE http://localhost:3000/users/1
```

