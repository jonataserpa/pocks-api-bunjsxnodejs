import { Elysia, t } from 'elysia';
import { getPool } from '../config/database';

const UserSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  email: t.String(),
  age: t.Number(),
  created_at: t.String(),
  updated_at: t.String(),
});

export const userRoutes = new Elysia({ prefix: '/users' })
  // GET /users - Listar todos os usuários
  .get('/', async () => {
    const db = getPool();
    const result = await db.query('SELECT id, name, email, age, created_at, updated_at FROM users ORDER BY created_at DESC');
    return { users: result.rows };
  }, {
    detail: {
      summary: 'Listar todos os usuários',
      tags: ['users'],
    },
    response: {
      200: t.Object({
        users: t.Array(UserSchema),
      }),
    },
  })
  
  // GET /users/:id - Buscar usuário por ID
  .get('/:id', async ({ params: { id }, error }) => {
    const db = getPool();
    const result = await db.query('SELECT id, name, email, age, created_at, updated_at FROM users WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return error(404, { error: 'Usuário não encontrado' });
    }
    
    return { user: result.rows[0] };
  }, {
    params: t.Object({
      id: t.String({ pattern: '^\\d+$', description: 'ID do usuário' }),
    }),
    detail: {
      summary: 'Buscar usuário por ID',
      tags: ['users'],
    },
    response: {
      200: t.Object({
        user: UserSchema,
      }),
      404: t.Object({
        error: t.String(),
      }),
    },
  })
  
  // POST /users - Criar usuário
  .post('/', async ({ body, error }) => {
    const db = getPool();
    
    try {
      const result = await db.query(
        'INSERT INTO users (name, email, age) VALUES ($1, $2, $3) RETURNING id, name, email, age, created_at, updated_at',
        [body.name, body.email, body.age]
      );
      return { user: result.rows[0] };
    } catch (err: any) {
      if (err.code === '23505') { // Unique violation
        return error(409, { error: 'Email já cadastrado' });
      }
      throw err;
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 2, maxLength: 255, description: 'Nome do usuário' }),
      email: t.String({ format: 'email', description: 'Email do usuário' }),
      age: t.Number({ minimum: 1, maximum: 150, description: 'Idade do usuário' }),
    }),
    detail: {
      summary: 'Criar usuário',
      tags: ['users'],
    },
    response: {
      200: t.Object({
        user: UserSchema,
      }),
      409: t.Object({
        error: t.String(),
      }),
    },
  })
  
  // PUT /users/:id - Atualizar usuário
  .put('/:id', async ({ params: { id }, body, error }) => {
    const db = getPool();
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (body.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(body.name);
    }
    if (body.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(body.email);
    }
    if (body.age !== undefined) {
      fields.push(`age = $${paramIndex++}`);
      values.push(body.age);
    }
    
    if (fields.length === 0) {
      return error(400, { error: 'Nenhum campo para atualizar' });
    }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    try {
      const result = await db.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, email, age, created_at, updated_at`,
        values
      );
      
      if (result.rows.length === 0) {
        return error(404, { error: 'Usuário não encontrado' });
      }
      
      return { user: result.rows[0] };
    } catch (err: any) {
      if (err.code === '23505') {
        return error(409, { error: 'Email já cadastrado' });
      }
      throw err;
    }
  }, {
    params: t.Object({
      id: t.String({ pattern: '^\\d+$', description: 'ID do usuário' }),
    }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 2, maxLength: 255, description: 'Nome do usuário' })),
      email: t.Optional(t.String({ format: 'email', description: 'Email do usuário' })),
      age: t.Optional(t.Number({ minimum: 1, maximum: 150, description: 'Idade do usuário' })),
    }),
    detail: {
      summary: 'Atualizar usuário',
      tags: ['users'],
    },
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
  
  // DELETE /users/:id - Deletar usuário
  .delete('/:id', async ({ params: { id }, error }) => {
    const db = getPool();
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return error(404, { error: 'Usuário não encontrado' });
    }
    
    return new Response(null, { status: 204 });
  }, {
    params: t.Object({
      id: t.String({ pattern: '^\\d+$', description: 'ID do usuário' }),
    }),
    detail: {
      summary: 'Deletar usuário',
      tags: ['users'],
    },
    response: {
      204: t.Null(),
      404: t.Object({
        error: t.String(),
      }),
    },
  });

