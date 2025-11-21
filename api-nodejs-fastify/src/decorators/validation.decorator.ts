import 'reflect-metadata';
import { ZodSchema } from 'zod';

/**
 * Decorator para validar parâmetros de rota
 */
export function ValidateParams(schema: ZodSchema) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (request: any, reply: any) {
      try {
        request.params = schema.parse(request.params);
        return originalMethod.apply(this, [request, reply]);
      } catch (error: any) {
        return reply.code(400).send({ error: 'Parâmetros inválidos', details: error.errors });
      }
    };
    
    return descriptor;
  };
}

/**
 * Decorator para validar body da requisição
 */
export function ValidateBody(schema: ZodSchema) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (request: any, reply: any) {
      try {
        request.body = schema.parse(request.body);
        return originalMethod.apply(this, [request, reply]);
      } catch (error: any) {
        return reply.code(400).send({ error: 'Body inválido', details: error.errors });
      }
    };
    
    return descriptor;
  };
}

/**
 * Decorator para validar query parameters
 */
export function ValidateQuery(schema: ZodSchema) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (request: any, reply: any) {
      try {
        request.query = schema.parse(request.query);
        return originalMethod.apply(this, [request, reply]);
      } catch (error: any) {
        return reply.code(400).send({ error: 'Query inválida', details: error.errors });
      }
    };
    
    return descriptor;
  };
}

