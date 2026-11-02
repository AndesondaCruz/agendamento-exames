import { ValidateBy, type ValidationOptions } from 'class-validator';
import {
  isValidBirthDate,
  isValidBrazilianPhone,
  isValidCpf,
  onlyDigits,
} from './brazilian-documents.js';

/**
 * Decorators de validação para os DTOs. A regra mora nas funções puras de
 * brazilian-documents.ts; aqui só as ligamos ao class-validator.
 */

export function IsCpf(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isCpf',
      validator: {
        validate: (value) => typeof value === 'string' && isValidCpf(value),
        defaultMessage: () => 'patientCpf inválido.',
      },
    },
    options,
  );
}

export function IsBrazilianPhone(
  options?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isBrazilianPhone',
      validator: {
        validate: (value) =>
          typeof value === 'string' && isValidBrazilianPhone(value),
        defaultMessage: () =>
          'patientPhone deve ser um telefone com DDD (ex.: (85) 98765-4321).',
      },
    },
    options,
  );
}

export function IsBirthDate(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isBirthDate',
      validator: {
        validate: (value) =>
          typeof value === 'string' && isValidBirthDate(value, new Date()),
        defaultMessage: () =>
          'patientBirthDate deve ser uma data real no formato YYYY-MM-DD, que não esteja no futuro.',
      },
    },
    options,
  );
}

/** Para @Transform: aceita "529.982.247-25" e guarda "52998224725". */
export const toDigits = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? onlyDigits(value) : value;
