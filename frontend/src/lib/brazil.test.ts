import {
  formatCpf,
  formatPhone,
  isValidBirthDate,
  isValidBrazilianPhone,
  isValidCpf,
} from './brazil';

describe('CPF', () => {
  it('aceita CPF válido com ou sem pontuação', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('recusa dígito verificador errado e dígitos repetidos', () => {
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('aplica a máscara enquanto o paciente digita', () => {
    expect(formatCpf('529')).toBe('529');
    expect(formatCpf('52998')).toBe('529.98');
    expect(formatCpf('5299822')).toBe('529.982.2');
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
    expect(formatCpf('529982247251234')).toBe('529.982.247-25');
  });
});

describe('Telefone', () => {
  it('aceita celular e fixo com DDD', () => {
    expect(isValidBrazilianPhone('(85) 98765-4321')).toBe(true);
    expect(isValidBrazilianPhone('(84) 3317-8200')).toBe(true);
  });

  it('recusa telefone sem DDD ou celular sem o 9', () => {
    expect(isValidBrazilianPhone('98765-4321')).toBe(false);
    expect(isValidBrazilianPhone('(85) 88765-4321')).toBe(false);
  });

  it('aplica a máscara de celular e de fixo', () => {
    expect(formatPhone('8')).toBe('(8');
    expect(formatPhone('859876')).toBe('(85) 9876');
    expect(formatPhone('85987654321')).toBe('(85) 98765-4321');
    expect(formatPhone('8433178200')).toBe('(84) 3317-8200');
  });
});

describe('Data de nascimento', () => {
  const today = '2030-01-07';

  it('aceita data real no passado e o próprio dia de hoje', () => {
    expect(isValidBirthDate('1990-05-20', today)).toBe(true);
    expect(isValidBirthDate(today, today)).toBe(true);
  });

  it('recusa futuro, data inexistente e mais de 130 anos', () => {
    expect(isValidBirthDate('2030-01-08', today)).toBe(false);
    expect(isValidBirthDate('1990-02-31', today)).toBe(false);
    expect(isValidBirthDate('1899-12-31', today)).toBe(false);
  });
});
