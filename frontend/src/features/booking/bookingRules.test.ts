import type { Doctor } from '../../api/types';
import {
  firstWorkingDate,
  normalizeName,
  validatePatientName,
} from './bookingRules';

const doctor = (workingWeekdays: number[]): Doctor => ({
  id: 1,
  name: 'Dr. Teste',
  crm: 'CRM-MG 00000',
  workingWeekdays,
  shifts: [],
});

describe('firstWorkingDate', () => {
  it('é hoje quando o médico atende hoje (2030-01-07 é segunda)', () => {
    expect(firstWorkingDate(doctor([1, 2, 3, 4, 5]), '2030-01-07')).toBe(
      '2030-01-07',
    );
  });

  it('pula para o próximo dia de atendimento (sábado -> terça)', () => {
    expect(firstWorkingDate(doctor([2, 4]), '2030-01-12')).toBe('2030-01-15');
  });

  it('médico sem dias de atendimento: nenhuma data', () => {
    expect(firstWorkingDate(doctor([]), '2030-01-07')).toBeUndefined();
  });
});

describe('validatePatientName', () => {
  it.each(['Maria da Silva', "Joana D'Ávila", 'José Pereira-Lima', 'Dr. Ana'])(
    'aceita "%s"',
    (name) => {
      expect(validatePatientName(name)).toBeNull();
    },
  );

  it.each([
    ['Al', /pelo menos 3/],
    ['   ', /pelo menos 3/],
    ['<script>', /apenas letras/],
    ['Maria 123', /apenas letras/],
    ['a'.repeat(121), /no máximo 120/],
  ])('rejeita "%s"', (name, message) => {
    expect(validatePatientName(name)).toMatch(message);
  });

  it('normaliza espaços extras', () => {
    expect(normalizeName('  Maria   da  Silva ')).toBe('Maria da Silva');
  });
});
