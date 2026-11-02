import { normalizeProtocol, validateLookup } from './manageRules';

describe('normalizeProtocol', () => {
  it('converte para maiúsculas, descarta o que não é hexadecimal e limita a 8', () => {
    expect(normalizeProtocol('a1b2-c3d4 e5')).toBe('A1B2C3D4');
    expect(normalizeProtocol('xyz')).toBe('');
  });
});

describe('validateLookup', () => {
  it('aceita protocolo de 8 caracteres e CPF válido', () => {
    expect(
      validateLookup({ protocol: 'A1B2C3D4', cpf: '529.982.247-25' }),
    ).toEqual({});
  });

  it('aponta protocolo incompleto e CPF inválido', () => {
    expect(
      Object.keys(validateLookup({ protocol: 'A1B2', cpf: '111.111.111-11' })),
    ).toEqual(['protocol', 'cpf']);
  });
});
