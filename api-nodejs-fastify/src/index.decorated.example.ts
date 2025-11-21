/**
 * EXEMPLO: Como usar decorators no Fastify
 * 
 * Para usar este exemplo, renomeie este arquivo para index.ts
 * ou copie o conteúdo para o index.ts existente
 */

import 'reflect-metadata'; // IMPORTANTE: Importar no início para decorators funcionarem
import Fastify from 'fastify';
import cors from '@fastify/cors';
import env from '@fastify/env';
import { initializeDatabase } from './config/database';
import { registerRoutes } from './decorators';
import { UserController } from './controllers/user.controller';

const fastify = Fastify({
  logger: true,
});

async function start() {
  try {
    // Registrar plugin de variáveis de ambiente
    await fastify.register(env, {
      schema: {
        type: 'object',
        required: ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'],
        properties: {
          DB_HOST: { type: 'string' },
          DB_PORT: { type: 'string' },
          DB_NAME: { type: 'string' },
          DB_USER: { type: 'string' },
          DB_PASSWORD: { type: 'string' },
          PORT: { type: 'string', default: '3000' },
        },
      },
      dotenv: true,
    });

    // Registrar CORS
    await fastify.register(cors, {
      origin: true,
    });

    // Inicializar banco de dados
    await initializeDatabase();

    // Registrar rotas usando decorators
    await registerRoutes(fastify, UserController);

    // Health check
    fastify.get('/health', async () => {
      return { status: 'ok', service: 'api-nodejs-fastify' };
    });

    const port = parseInt(process.env.PORT || '3000');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Fastify server running on http://0.0.0.0:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();

