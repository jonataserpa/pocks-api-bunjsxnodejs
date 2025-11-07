import { FastifyInstance } from 'fastify';
import { getPool } from '../config/database';
import { createUserSchema, updateUserSchema, userIdParamSchema } from '../schemas/user.schema';

export async function userRoutes(fastify: FastifyInstance) {
  // GET /users - Listar todos os usuários
  fastify.get('/users', async (request, reply) => {
    const db = getPool();
    const result = await db.query('SELECT id, name, email, age, created_at, updated_at FROM users ORDER BY created_at DESC');
    return reply.send({ users: result.rows });
  });

  // GET /users/:id - Buscar usuário por ID
  fastify.get('/users/:id', async (request, reply) => {
    const params = userIdParamSchema.parse(request.params);
    const db = getPool();
    const result = await db.query('SELECT id, name, email, age, created_at, updated_at FROM users WHERE id = $1', [params.id]);
    
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Usuário não encontrado' });
    }
    
    return reply.send({ user: result.rows[0] });
  });

  // POST /users - Criar usuário
  fastify.post('/users', async (request, reply) => {
    const data = createUserSchema.parse(request.body);
    const db = getPool();
    
    try {
      const result = await db.query(
        'INSERT INTO users (name, email, age) VALUES ($1, $2, $3) RETURNING id, name, email, age, created_at, updated_at',
        [data.name, data.email, data.age]
      );
      return reply.code(201).send({ user: result.rows[0] });
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        return reply.code(409).send({ error: 'Email já cadastrado' });
      }
      throw error;
    }
  });

  // PUT /users/:id - Atualizar usuário
  fastify.put('/users/:id', async (request, reply) => {
    const params = userIdParamSchema.parse(request.params);
    const data = updateUserSchema.parse(request.body);
    const db = getPool();
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.age !== undefined) {
      fields.push(`age = $${paramIndex++}`);
      values.push(data.age);
    }
    
    if (fields.length === 0) {
      return reply.code(400).send({ error: 'Nenhum campo para atualizar' });
    }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(params.id);
    
    try {
      const result = await db.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, email, age, created_at, updated_at`,
        values
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Usuário não encontrado' });
      }
      
      return reply.send({ user: result.rows[0] });
    } catch (error: any) {
      if (error.code === '23505') {
        return reply.code(409).send({ error: 'Email já cadastrado' });
      }
      throw error;
    }
  });

  // DELETE /users/:id - Deletar usuário
  fastify.delete('/users/:id', async (request, reply) => {
    const params = userIdParamSchema.parse(request.params);
    const db = getPool();
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [params.id]);
    
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Usuário não encontrado' });
    }
    
    return reply.code(204).send();
  });
}

