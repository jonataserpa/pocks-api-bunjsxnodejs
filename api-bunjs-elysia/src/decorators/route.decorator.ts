import { Elysia, t, type TSchema } from 'elysia';

export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

export interface RouteOptions {
  path: string;
  method: HttpMethod;
  summary?: string;
  tags?: string[];
  params?: TSchema;
  body?: TSchema;
  query?: TSchema;
  response?: Record<number, TSchema>;
  handler?: string;
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
    });
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
 * Função auxiliar para registrar rotas de uma classe no Elysia
 */
export function registerRoutes(elysia: Elysia, controllerClass: any): Elysia {
  const className = controllerClass.name;
  const routes = routesMetadata.get(className) || [];
  const prefix = controllerPrefixes.get(className) || '';
  
  const instance = new controllerClass();
  let router = prefix ? new Elysia({ prefix }) : new Elysia();
  
  for (const route of routes) {
    if (!route.handler) continue;
    
    const handler = instance[route.handler].bind(instance);
    
    const routeConfig: any = {};
    if (route.params) routeConfig.params = route.params;
    if (route.body) routeConfig.body = route.body;
    if (route.query) routeConfig.query = route.query;
    if (route.response) routeConfig.response = route.response;
    
    routeConfig.detail = {
      summary: route.summary || route.handler,
      tags: route.tags || [],
    };
    
    // Usar type assertion para chamar o método dinamicamente
    const method = route.method as keyof Elysia;
    router = (router[method] as any)(route.path, handler, routeConfig);
  }
  
  return elysia.use(router);
}

export function getRoutesMetadata(className: string): RouteOptions[] {
  return routesMetadata.get(className) || [];
}

