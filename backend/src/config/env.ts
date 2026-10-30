import { z } from 'zod';

/**
 * Contrato das variáveis de ambiente da API.
 *
 * Validar no boot faz a aplicação falhar cedo e com uma mensagem clara
 * ("DATABASE_URL: Required") em vez de quebrar minutos depois, na primeira
 * query, com um erro genérico de conexão.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  /** Habilita SSL na conexão com o banco (necessário em Neon/Railway). */
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  /** Origem do front autorizada no CORS. */
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  /** Fuso em que os turnos dos médicos são interpretados. */
  CLINIC_TIMEZONE: z.string().default('America/Sao_Paulo'),
  /**
   * Opcional. Com ela, o cache fica no Redis; sem ela, em memória.
   * Vazia conta como ausente (facilita desligar no docker-compose).
   */
  REDIS_URL: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.url({ protocol: /^rediss?$/ }).optional(),
  ),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${details}`);
  }

  return result.data;
}
