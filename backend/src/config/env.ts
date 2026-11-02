import { z } from 'zod';

/**
 * Contrato das variáveis de ambiente da API.
 *
 * Validar no boot faz a aplicação falhar cedo e com uma mensagem clara
 * ("DATABASE_URL: Required") em vez de quebrar minutos depois, na primeira
 * query, com um erro genérico de conexão.
 */
/**
 * Inteiro do ambiente com limites e padrão. Vazio conta como ausente: sem
 * isso, o z.coerce transformaria "" em 0 (ex.: TRUST_PROXY_HOPS= desligaria
 * a confiança no proxy sem aviso).
 */
const intFromEnv = (min: number, max: number, fallback: number) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce.number().int().min(min).max(max).default(fallback),
  );

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
  /**
   * Quantos proxies confiáveis existem entre o cliente e a API. Define de
   * onde sai o IP do cliente (usado no rate limiting): o cabeçalho
   * X-Forwarded-For só vale para os últimos N saltos.
   *   - 1 (padrão): nosso Nginx do docker-compose, direto na frente da API.
   *   - Em outro deploy (ex.: Render), conte os proxies da plataforma: se o
   *     valor for MENOR que o real, todos os clientes aparecem com o IP do
   *     proxy e dividem o mesmo limite; se for MAIOR, o cliente consegue
   *     forjar o IP e escapar do limite.
   *   - 0: a API recebe conexões diretas (ignora X-Forwarded-For).
   */
  TRUST_PROXY_HOPS: intFromEnv(0, 10, 1),
  /** Janela de contagem do rate limiting, em segundos. */
  RATE_LIMIT_WINDOW_SECONDS: intFromEnv(1, 86_400, 60),
  /** Máximo de requisições por IP na janela, em cada rota limitada. */
  RATE_LIMIT_LOOKUP: intFromEnv(1, 1_000_000, 10),
  RATE_LIMIT_CANCEL: intFromEnv(1, 1_000_000, 10),
  RATE_LIMIT_CREATE: intFromEnv(1, 1_000_000, 100),
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
