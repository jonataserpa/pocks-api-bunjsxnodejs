/**
 * Exemplo de uso de rotas com decorators
 * 
 * Para usar este arquivo, substitua a importação em index.ts:
 * 
 * ANTES:
 * import { userRoutes } from './routes/user.routes';
 * 
 * DEPOIS:
 * import { registerRoutes } from './decorators';
 * import { UserController } from './controllers/user.controller';
 * 
 * E então registre o controller:
 * await registerRoutes(fastify, UserController);
 */

import { FastifyInstance } from 'fastify';
import { registerRoutes } from '../decorators';
import { UserController } from '../controllers/user.controller';

/**
 * Rotas de usuários usando decorators
 * Esta é uma alternativa ao arquivo user.routes.ts
 */
export async function userRoutesDecorated(fastify: FastifyInstance) {
  await registerRoutes(fastify, UserController);
}

