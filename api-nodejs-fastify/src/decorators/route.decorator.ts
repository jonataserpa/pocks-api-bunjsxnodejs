import 'reflect-metadata';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema } from 'zod';

export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

export interface RouteOptions {
  path: string;
  method: HttpMethod;
  summary?: string;
  tags?: string[];
  schema?: {
    params?: ZodSchema;
    body?: ZodSchema;
    querystring?: ZodSchema;
    response?: Record<number, ZodSchema>;
  };
}

const routesMetadata = new Map<string, RouteOptions[]>();
const controllerPrefixes = new Map<string, string>();

/**
 * Decorator para registrar rotas em uma classe
 */
export function Route(prefix: string = '') {
  return function (target: any) {
    const className = target.name;
    if (!routesMetadata.has(className)) {
      routesMetadata.set(className, []);
    }
    controllerPrefixes.set(className, prefix);
  };
}

/**
 * Decorator para métodos HTTP (GET, POST, PUT, DELETE, etc)
 */
export function HttpMethod(options: RouteOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const className = target.constructor.name;
    if (!routesMetadata.has(className)) {
      routesMetadata.set(className, []);
    }
    
    routesMetadata.get(className)!.push({
      ...options,
      handler: propertyKey,
    } as RouteOptions & { handler: string });
  };
}

/**
 * Decorators específicos para cada método HTTP
 */
export function Get(path: string, options?: Omit<RouteOptions, 'path' | 'method'>) {
  return HttpMethod({ ...options, path, method: 'get' });
}

export function Post(path: string, options?: Omit<RouteOptions, 'path' | 'method'>) {
  return HttpMethod({ ...options, path, method: 'post' });
}

export function Put(path: string, options?: Omit<RouteOptions, 'path' | 'method'>) {
  return HttpMethod({ ...options, path, method: 'put' });
}

export function Delete(path: string, options?: Omit<RouteOptions, 'path' | 'method'>) {
  return HttpMethod({ ...options, path, method: 'delete' });
}

/**
 * Função auxiliar para registrar rotas de uma classe no Fastify
 */
export async function registerRoutes(fastify: FastifyInstance, controllerClass: any): Promise<void> {
  const className = controllerClass.name;
  const routes = routesMetadata.get(className) || [];
  const prefix = controllerPrefixes.get(className) || '';
  
  const instance = new controllerClass();
  
  for (const route of routes) {
    const routeOptions = route as RouteOptions & { handler: string };
    if (!routeOptions.handler) continue;
    
    const handler = instance[routeOptions.handler].bind(instance);
    const fullPath = prefix ? `${prefix}${routeOptions.path}` : routeOptions.path;
    
    // Converter schemas Zod para formato Fastify JSON Schema
    const fastifySchema: any = {};
    
    if (routeOptions.schema) {
      if (routeOptions.schema.params) {
        fastifySchema.params = convertZodToJsonSchema(routeOptions.schema.params);
      }
      if (routeOptions.schema.body) {
        fastifySchema.body = convertZodToJsonSchema(routeOptions.schema.body);
      }
      if (routeOptions.schema.querystring) {
        fastifySchema.querystring = convertZodToJsonSchema(routeOptions.schema.querystring);
      }
      if (routeOptions.schema.response) {
        fastifySchema.response = {};
        for (const [statusCode, schema] of Object.entries(routeOptions.schema.response)) {
          fastifySchema.response[statusCode] = convertZodToJsonSchema(schema);
        }
      }
    }
    
    // Wrapper para validar com Zod antes de executar o handler
    const wrappedHandler = async (request: any, reply: any) => {
      try {
        // Validar params se existir schema
        if (routeOptions.schema?.params) {
          request.params = routeOptions.schema.params.parse(request.params);
        }
        
        // Validar body se existir schema
        if (routeOptions.schema?.body) {
          request.body = routeOptions.schema.body.parse(request.body);
        }
        
        // Validar query se existir schema
        if (routeOptions.schema?.querystring) {
          request.query = routeOptions.schema.querystring.parse(request.query);
        }
        
        return await handler(request, reply);
      } catch (error: any) {
        if (error.errors) {
          return reply.code(400).send({ error: 'Validação falhou', details: error.errors });
        }
        throw error;
      }
    };
    
    // Registrar a rota no Fastify
    await fastify[routeOptions.method](fullPath, { schema: fastifySchema }, wrappedHandler);
  }
}

/**
 * Função auxiliar para converter Zod Schema para JSON Schema (simplificado)
 * Nota: Para produção, considere usar uma biblioteca como zod-to-json-schema
 */
function convertZodToJsonSchema(zodSchema: ZodSchema): any {
  // Esta é uma implementação simplificada
  // Para produção, use uma biblioteca como 'zod-to-json-schema'
  return {
    type: 'object',
    properties: {},
  };
}

export function getRoutesMetadata(className: string): RouteOptions[] {
  return routesMetadata.get(className) || [];
}

