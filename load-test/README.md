# Testes de Carga

Scripts de teste de carga usando `autocannon` para comparar a performance entre Fastify (Node.js) e Elysia (Bun.js).

## 🚀 Instalação

```bash
npm install
```

## 📊 Executando os Testes

### Testar apenas Fastify
```bash
npm run test:fastify
```

### Testar apenas Elysia
```bash
npm run test:elysia
```

### Testar ambos e comparar
```bash
npm run test:both
```

## ⚙️ Configuração

Você pode configurar as URLs das APIs através de variáveis de ambiente:

```bash
FASTIFY_URL=http://localhost:3000 ELYSIA_URL=http://localhost:3001 npm run test:both
```

## 📈 Métricas Coletadas

Os testes coletam as seguintes métricas:

- **Requests/s**: Taxa de requisições por segundo
- **Latência média**: Tempo médio de resposta
- **P50, P99**: Percentis de latência (mediana e 99º percentil)
- **Taxa de sucesso**: Porcentagem de requisições bem-sucedidas
- **Throughput**: Taxa de transferência de dados

## 🔍 Testes Executados

1. **GET /users**: Listar todos os usuários
   - 100 conexões simultâneas
   - Duração: 30 segundos

2. **POST /users**: Criar novos usuários
   - 50 conexões simultâneas
   - Duração: 30 segundos

3. **GET /users/:id**: Buscar usuário por ID
   - 100 conexões simultâneas
   - Duração: 30 segundos

## 💡 Dicas

- Certifique-se de que ambas as APIs estão rodando antes de executar os testes
- Os testes podem gerar muitos dados no banco. Considere limpar o banco entre execuções
- Para resultados mais precisos, execute os testes em um ambiente isolado

