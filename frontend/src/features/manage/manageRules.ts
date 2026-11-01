import { isValidCpf } from '../../lib/brazil';

const PROTOCOL_PATTERN = /^[0-9A-F]{8}$/;

export interface LookupForm {
  protocol: string;
  cpf: string;
}

export type LookupErrors = Partial<Record<keyof LookupForm, string>>;

/** Regras da tela, puras: testáveis sem renderizar nada. */
export function validateLookup(form: LookupForm): LookupErrors {
  const errors: LookupErrors = {};
  if (!PROTOCOL_PATTERN.test(form.protocol)) {
    errors.protocol =
      'O protocolo tem 8 caracteres, letras de A a F e números (ex.: A1B2C3D4).';
  }
  if (!isValidCpf(form.cpf)) errors.cpf = 'Informe um CPF válido.';
  return errors;
}

/** Protocolo em maiúsculas e só com caracteres possíveis, enquanto digita. */
export function normalizeProtocol(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^0-9A-F]/g, '')
    .slice(0, 8);
}
