# Guia de Decorators

Este projeto implementa suporte a decorators TypeScript para ambas as APIs (Elysia e Fastify), permitindo uma abordagem mais orientada a classes e declarativa para definir rotas.

## Configuração

### TypeScript

Ambos os projetos já estão configurados com suporte a decorators:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Dependências

- **Elysia**: Não requer dependências adicionais (suporte nativo)
- **Fastify**: Requer `reflect-metadata` (já adicionado)

## Estrutura de Decorators

### Decorators Disponíveis

#### `@Route(prefix: string)`
Decorator de classe que define o prefixo para todas as rotas do controller.

```typescript
@Route('/users')
export class UserController {
  // Todas as rotas terão o prefixo /users
}
```

#### `@Get(path: string, options?: RouteOptions)`
Decorator para métodos GET.

#### `@Post(path: string, options?: RouteOptions)`
Decorator para métodos POST.

#### `@Put(path: string, options?: RouteOptions)`
Decorator para métodos PUT.

#### `@Delete(path: string, options?: RouteOptions)`
Decorator para métodos DELETE.

## Exemplos de Uso

### Elysia (Bun.js)

```typescript
import { Route, Get, Post, Put, Delete } from '../decorators';
import { t } from 'elysia';

@Route('/users')
export class UserController {
  @Get('/', {
    summary: 'Listar todos os usuários',
    tags: ['users'],
    response: {
      200: t.Object({
        users: t.Array(UserSchema),
      }),
    },
  })
  async listUsers() {
    // Implementação
  }

  @Post('/', {
    summary: 'Criar usuário',
    tags: ['users'],
    body: t.Object({
      name: t.String(),
      email: t.String({ format: 'email' }),
    }),
  })
  async createUser({ body }: any) {
    // Implementação
  }
}
```

**Registrando no Elysia:**

```typescript
import { registerRoutes } from './decorators';
import { UserController } from './controllers/user.controller';

const app = new Elysia()
  .use(registerRoutes(new Elysia(), UserController));
```

### Fastify (Node.js)

```typescript
import { Route, Get, Post, Put, Delete } from '../decorators';
import { z } from 'zod';
import { FastifyRequest, FastifyReply } from 'fastify';

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

@Route('/users')
export class UserController {
  @Get('', {
    summary: 'Listar todos os usuários',
    tags: ['users'],
  })
  async listUsers(request: FastifyRequest, reply: FastifyReply) {
    // Implementação
  }

  @Post('', {
    summary: 'Criar usuário',
    tags: ['users'],
    schema: {
      body: createUserSchema,
    },
  })
  async createUser(
    request: FastifyRequest<{ Body: z.infer<typeof createUserSchema> }>,
    reply: FastifyReply
  ) {
    // Implementação
  }
}
```

**Registrando no Fastify:**

```typescript
import { registerRoutes } from './decorators';
import { UserController } from './controllers/user.controller';

await registerRoutes(fastify, UserController);
```

## Opções de Rota

### Elysia

```typescript
interface RouteOptions {
  path: string;
  method: HttpMethod;
  summary?: string;           // Descrição para Swagger
  tags?: string[];            // Tags para Swagger
  params?: TSchema;           // Schema de validação de parâmetros
  body?: TSchema;             // Schema de validação do body
  query?: TSchema;            // Schema de validação de query params
  response?: Record<number, TSchema>; // Schemas de resposta por status code
}
```

### Fastify

```typescript
interface RouteOptions {
  path: string;
  method: HttpMethod;
  summary?: string;           // Descrição para documentação
  tags?: string[];            // Tags para documentação
  schema?: {
    params?: ZodSchema;       // Schema Zod para parâmetros
    body?: ZodSchema;         // Schema Zod para body
    querystring?: ZodSchema;  // Schema Zod para query params
    response?: Record<number, ZodSchema>; // Schemas de resposta
  };
}
```

## Vantagens dos Decorators

1. **Organização**: Código mais organizado e fácil de manter
2. **Reutilização**: Controllers podem ser facilmente reutilizados
3. **Type Safety**: Melhor suporte a tipos do TypeScript
4. **Declarativo**: Rotas definidas de forma mais declarativa
5. **Documentação**: Integração fácil com ferramentas de documentação (Swagger)

## Migração

Para migrar rotas existentes para decorators:

1. Crie um controller com a classe decorada
2. Mova a lógica dos handlers para métodos da classe
3. Adicione os decorators apropriados
4. Registre o controller usando `registerRoutes`

Veja os exemplos em:
- `api-bunjs-elysia/src/controllers/user.controller.ts`
- `api-nodejs-fastify/src/controllers/user.controller.ts`

## Notas

- Os decorators são processados em tempo de compilação
- A validação é feita automaticamente baseada nos schemas fornecidos
- Para Fastify, a validação Zod é executada antes do handler
- Para Elysia, a validação é feita pelo próprio framework através dos schemas

