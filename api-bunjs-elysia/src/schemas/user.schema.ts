import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255, 'Nome deve ter no máximo 255 caracteres'),
  email: z.string().email('Email inválido'),
  age: z.number().int('Idade deve ser um número inteiro').min(1, 'Idade deve ser maior que 0').max(150, 'Idade deve ser menor que 150'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255, 'Nome deve ter no máximo 255 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  age: z.number().int('Idade deve ser um número inteiro').min(1, 'Idade deve ser maior que 0').max(150, 'Idade deve ser menor que 150').optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID deve ser um número'),
});

