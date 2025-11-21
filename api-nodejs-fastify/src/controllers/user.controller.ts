import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDb } from '../config/database';
import { users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { Route, Get, Post, Put, Delete } from '../decorators';
import { createUserSchema, updateUserSchema, userIdParamSchema } from '../schemas/user.schema';

// Função auxiliar para converter dados do Drizzle para o formato da API
function formatUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    age: user.age,
    created_at: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
    updated_at: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt,
  };
}

@Route('/users')
export class UserController {
  @Get('', {
    summary: 'Listar todos os usuários',
    tags: ['users'],
  })
  async listUsers(request: FastifyRequest, reply: FastifyReply) {
    const db = getDb();
    const result = await db.select().from(users).orderBy(desc(users.createdAt));
    return reply.send({ users: result.map(formatUser) });
  }

  @Get('/:id', {
    summary: 'Buscar usuário por ID',
    tags: ['users'],
    schema: {
      params: userIdParamSchema,
    },
  })
  async getUserById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const params = userIdParamSchema.parse(request.params);
    const db = getDb();
    const result = await db.select().from(users).where(eq(users.id, parseInt(params.id))).limit(1);
    
    if (result.length === 0) {
      return reply.code(404).send({ error: 'Usuário não encontrado' });
    }
    
    return reply.send({ user: formatUser(result[0]) });
  }

  @Post('', {
    summary: 'Criar usuário',
    tags: ['users'],
    schema: {
      body: createUserSchema,
    },
  })
  async createUser(request: FastifyRequest<{ Body: z.infer<typeof createUserSchema> }>, reply: FastifyReply) {
    const data = createUserSchema.parse(request.body);
    const db = getDb();
    
    try {
      const result = await db.insert(users).values({
        name: data.name,
        email: data.email,
        age: data.age,
      }).returning();
      return reply.code(201).send({ user: formatUser(result[0]) });
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        return reply.code(409).send({ error: 'Email já cadastrado' });
      }
      throw error;
    }
  }

  @Put('/:id', {
    summary: 'Atualizar usuário',
    tags: ['users'],
    schema: {
      params: userIdParamSchema,
      body: updateUserSchema,
    },
  })
  async updateUser(
    request: FastifyRequest<{ 
      Params: { id: string };
      Body: z.infer<typeof updateUserSchema>;
    }>, 
    reply: FastifyReply
  ) {
    const params = userIdParamSchema.parse(request.params);
    const data = updateUserSchema.parse(request.body);
    const db = getDb();
    
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.age !== undefined) updateData.age = data.age;
    
    if (Object.keys(updateData).length === 0) {
      return reply.code(400).send({ error: 'Nenhum campo para atualizar' });
    }
    
    updateData.updatedAt = new Date();
    
    try {
      const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, parseInt(params.id)))
        .returning();
      
      if (result.length === 0) {
        return reply.code(404).send({ error: 'Usuário não encontrado' });
      }
      
      return reply.send({ user: formatUser(result[0]) });
    } catch (error: any) {
      if (error.code === '23505') {
        return reply.code(409).send({ error: 'Email já cadastrado' });
      }
      throw error;
    }
  }

  @Delete('/:id', {
    summary: 'Deletar usuário',
    tags: ['users'],
    schema: {
      params: userIdParamSchema,
    },
  })
  async deleteUser(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const params = userIdParamSchema.parse(request.params);
    const db = getDb();
    const result = await db.delete(users).where(eq(users.id, parseInt(params.id))).returning({ id: users.id });
    
    if (result.length === 0) {
      return reply.code(404).send({ error: 'Usuário não encontrado' });
    }
    
    return reply.code(204).send();
  }
}

