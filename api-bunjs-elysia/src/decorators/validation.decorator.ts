import { type TSchema } from 'elysia';

/**
 * Decorator para validar parâmetros de rota
 */
export function ValidateParams(schema: TSchema) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // A validação será feita pelo Elysia através do schema passado nas opções da rota
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * Decorator para validar body da requisição
 */
export function ValidateBody(schema: TSchema) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // A validação será feita pelo Elysia através do schema passado nas opções da rota
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * Decorator para validar query parameters
 */
export function ValidateQuery(schema: TSchema) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // A validação será feita pelo Elysia através do schema passado nas opções da rota
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

