import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { initializeDatabase } from './config/database';
import { userRoutes } from './routes/user.routes';

const swaggerConfig = {
  documentation: {
    info: {
      title: 'API Bun.js Elysia',
      version: '1.0.0',
      description: 'API de exemplo com CRUD de usuários',
    },
    tags: [
      { name: 'users', description: 'Endpoints relacionados a usuários' },
    ],
  },
  autoDarkMode: false,
};

console.log('🔧 Configurando Swagger com:', JSON.stringify(swaggerConfig, null, 2));

const app = new Elysia()
  .use(cors())
  .get('/health', () => ({ status: 'ok', service: 'api-bunjs-elysia' }))
  .use(userRoutes)
  .use(swagger(swaggerConfig))
  .onError(({ code, error, set, path }) => {
    // Log de erros para debug
    if (path?.startsWith('/swagger')) {
      console.log('🔍 Swagger route accessed:', path, 'Code:', code);
      return;
    }
    
    console.log('❌ Error handler triggered:', { code, path, error: error?.message || error });
    
    if (code === 'VALIDATION') {
      set.status = 400;
      return { error: error.message };
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
  // Carregar variáveis de ambiente
  const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Variável de ambiente ${envVar} não encontrada`);
      process.exit(1);
    }
  }

  // Inicializar banco de dados
  await initializeDatabase();

  const port = parseInt(process.env.PORT || '3001');
  
  // Adicionar middleware para logar requisições ao Swagger
  app.onBeforeHandle(({ path, method }) => {
    if (path?.startsWith('/swagger')) {
      console.log(`📥 Requisição Swagger: ${method} ${path}`);
    }
  });
  
  app.onAfterHandle(({ path, response }) => {
    if (path?.startsWith('/swagger')) {
      console.log(`📤 Resposta Swagger: ${path}`, typeof response === 'object' ? 'Object' : typeof response);
    }
  });
  
  app.listen(port, () => {
    console.log(`🚀 Elysia server running on http://0.0.0.0:${port}`);
    console.log(`📚 Swagger docs available at http://localhost:${port}/swagger`);
    console.log(`⚠️  IMPORTANTE: Acesse via localhost (não 0.0.0.0) para o Swagger funcionar corretamente!`);
    console.log(`   O erro 'digest' ocorre porque crypto.subtle requer contexto seguro (localhost/HTTPS)`);
    console.log(`📋 Swagger JSON available at http://localhost:${port}/swagger/json`);
  });
}

start();

