import { API_URL } from '../config';
import type { ApiErrorBody } from './types';

/**
 * Erro de uma resposta da API (4xx/5xx), com o `code` estável do back-end.
 * A interface decide o que mostrar pelo código, nunca pelo texto.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorBody['details'];

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = body.statusCode;
    this.code = body.code;
    this.details = body.details;
  }
}

/** Falha de rede: o servidor nem chegou a responder. */
export class NetworkError extends Error {
  constructor() {
    super('Falha de conexão com o servidor.');
    this.name = 'NetworkError';
  }
}

type QueryParams = Record<string, string | number | undefined>;

function buildUrl(path: string, params?: QueryParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const qs = query.toString();
  return `${API_URL}${path}${qs ? `?${qs}` : ''}`;
}

/**
 * Wrapper fino sobre fetch: monta a URL, serializa JSON, converte respostas
 * de erro em ApiError e falhas de rede em NetworkError. Os componentes nunca
 * lidam com Response/status diretamente.
 */
export async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST';
    params?: QueryParams;
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.params), {
      method: options.method ?? 'GET',
      headers: options.body
        ? { 'Content-Type': 'application/json' }
        : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    // Cancelamento (ex.: o usuário continuou digitando) não é erro de rede.
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    throw new NetworkError();
  }

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      body ?? {
        statusCode: response.status,
        code: `HTTP_${response.status}`,
        message: 'Resposta inesperada do servidor.',
      },
    );
  }

  return (await response.json()) as T;
}
