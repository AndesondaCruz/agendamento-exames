/**
 * Configuração vinda do ambiente de build (Vite injeta as variáveis VITE_*).
 *
 * - Em dev: "/api", repassado pelo proxy do Vite para o NestJS.
 * - Em produção: a URL pública da API, ex.: https://api.exemplo.com/api
 */
export const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(
  /\/$/,
  '',
);

/** Fuso da clínica: o mesmo usado pela API para interpretar os turnos. */
export const CLINIC_TIMEZONE = 'America/Sao_Paulo';

/** Quantos dias o seletor de datas mostra por "página". */
export const DAYS_PER_PAGE = 14;

/** Até quantos dias à frente o paciente pode agendar. */
export const MAX_DAYS_AHEAD = 60;
