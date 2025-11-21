import { t } from 'elysia';
import { getDb } from '../config/database';
import { users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { Route, Get, Post, Put, Delete } from '../decorators';

const UserSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  email: t.String(),
  age: t.Number(),
  created_at: t.String(),
  updated_at: t.String(),
});

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
  @Get('/', {
    summary: 'Listar todos os usuários',
    tags: ['users'],
    response: {
      200: t.Object({
        users: t.Array(UserSchema),
      }),
    },
  })
  async listUsers() {
    const db = getDb();
    const result = await db.select().from(users).orderBy(desc(users.createdAt));
    return { users: result.map(formatUser) };
  }

  @Get('/:id', {
    summary: 'Buscar usuário por ID',
    tags: ['users'],
    params: t.Object({
      id: t.String({ pattern: '^\\d+$', description: 'ID do usuário' }),
    }),
    response: {
      200: t.Object({
        user: UserSchema,
      }),
      404: t.Object({
        error: t.String(),
      }),
    },
  })
  async getUserById({ params: { id }, set }: any) {
    const db = getDb();
    const result = await db.select().from(users).where(eq(users.id, parseInt(id))).limit(1);
    
    if (result.length === 0) {
      set.status = 404;
      return { error: 'Usuário não encontrado' };
    }
    
    return { user: formatUser(result[0]) };
  }

  @Post('/', {
    summary: 'Criar usuário',
    tags: ['users'],
    body: t.Object({
      name: t.String({ minLength: 2, maxLength: 255, description: 'Nome do usuário' }),
      email: t.String({ format: 'email', description: 'Email do usuário' }),
      age: t.Number({ minimum: 1, maximum: 150, description: 'Idade do usuário' }),
    }),
    response: {
      200: t.Object({
        user: UserSchema,
      }),
      409: t.Object({
        error: t.String(),
      }),
    },
  })
  async createUser({ body, set }: any) {
    const db = getDb();
    
    try {
      const result = await db.insert(users).values({
        name: body.name,
        email: body.email,
        age: body.age,
      }).returning();
      return { user: formatUser(result[0]) };
    } catch (err: any) {
      if (err.code === '23505') { // Unique violation
        set.status = 409;
        return { error: 'Email já cadastrado' };
      }
      throw err;
    }
  }

  @Put('/:id', {
    summary: 'Atualizar usuário',
    tags: ['users'],
    params: t.Object({
      id: t.String({ pattern: '^\\d+$', description: 'ID do usuário' }),
    }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 2, maxLength: 255, description: 'Nome do usuário' })),
      email: t.Optional(t.String({ format: 'email', description: 'Email do usuário' })),
      age: t.Optional(t.Number({ minimum: 1, maximum: 150, description: 'Idade do usuário' })),
    }),
    response: {
      200: t.Object({
        user: UserSchema,
      }),
      400: t.Object({
        error: t.String(),
      }),
      404: t.Object({
        error: t.String(),
      }),
      409: t.Object({
        error: t.String(),
      }),
    },
  })
  async updateUser({ params: { id }, body, set }: any) {
    const db = getDb();
    
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.age !== undefined) updateData.age = body.age;
    
    if (Object.keys(updateData).length === 0) {
      set.status = 400;
      return { error: 'Nenhum campo para atualizar' };
    }
    
    updateData.updatedAt = new Date();
    
    try {
      const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, parseInt(id)))
        .returning();
      
      if (result.length === 0) {
        set.status = 404;
        return { error: 'Usuário não encontrado' };
      }
      
      return { user: formatUser(result[0]) };
    } catch (err: any) {
      if (err.code === '23505') {
        set.status = 409;
        return { error: 'Email já cadastrado' };
      }
      throw err;
    }
  }

  @Delete('/:id', {
    summary: 'Deletar usuário',
    tags: ['users'],
    params: t.Object({
      id: t.String({ pattern: '^\\d+$', description: 'ID do usuário' }),
    }),
    response: {
      204: t.Null(),
      404: t.Object({
        error: t.String(),
      }),
    },
  })
  async deleteUser({ params: { id }, set }: any) {
    const db = getDb();
    const result = await db.delete(users).where(eq(users.id, parseInt(id))).returning({ id: users.id });
    
    if (result.length === 0) {
      set.status = 404;
      return { error: 'Usuário não encontrado' };
    }
    
    set.status = 204;
    return null;
  }
}

