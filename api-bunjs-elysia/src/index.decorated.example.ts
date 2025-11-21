/**
 * EXEMPLO: Como usar decorators no Elysia
 * 
 * Para usar este exemplo, renomeie este arquivo para index.ts
 * ou copie o conteúdo para o index.ts existente
 */

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { initializeDatabase } from './config/database';
import { registerRoutes } from './decorators';
import { UserController } from './controllers/user.controller';

const swaggerConfig = {
  documentation: {
    info: {
      title: 'API Bun.js Elysia',
      version: '1.0.0',
      description: 'API de exemplo com CRUD de usuários usando decorators',
    },
    tags: [
      { name: 'users', description: 'Endpoints relacionados a usuários' },
    ],
  },
  autoDarkMode: false,
};

const app = new Elysia()
  .use(cors())
  .get('/health', () => ({ status: 'ok', service: 'api-bunjs-elysia' }))
  // Registrar rotas usando decorators
  .use(registerRoutes(new Elysia(), UserController))
  .use(swagger(swaggerConfig))
  .onError(({ code, error, set, path }) => {
    if (path?.startsWith('/swagger')) {
      console.log('🔍 Swagger route accessed:', path, 'Code:', code);
      return;
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('❌ Error handler triggered:', { code, path, error: errorMessage });
    
    if (code === 'VALIDATION') {
      set.status = 400;
      return { error: error instanceof Error ? error.message : String(error) };
    }
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { error: 'Rota não encontrada' };
    }
    console.error('Error:', code, error);
    set.status = 500;
    return { error: 'Internal server error' };
  });

async function start() {
  const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Variável de ambiente ${envVar} não encontrada`);
      process.exit(1);
    }
  }

  await initializeDatabase();

  const port = parseInt(process.env.PORT || '3001');
  
  app.listen(port, () => {
    console.log(`🚀 Elysia server running on http://0.0.0.0:${port}`);
    console.log(`📚 Swagger docs available at http://localhost:${port}/swagger`);
  });
}

start();

