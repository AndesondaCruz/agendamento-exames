import {
  isValidBirthDate,
  isValidBrazilianPhone,
  isValidCpf,
  maskCpf,
  onlyDigits,
} from './brazilian-documents.js';

describe('CPF', () => {
  it.each(['529.982.247-25', '52998224725', '111.444.777-35'])(
    'aceita CPF válido, com ou sem pontuação: %s',
    (cpf) => expect(isValidCpf(cpf)).toBe(true),
  );

  it.each([
    ['dígito verificador errado', '529.982.247-24'],
    ['todos os dígitos iguais', '111.111.111-11'],
    ['curto demais', '5299822472'],
    ['longo demais', '529982247251'],
    ['vazio', ''],
  ])('recusa: %s', (_, cpf) => expect(isValidCpf(cpf)).toBe(false));

  it('mascara o CPF mostrando só os dígitos do meio', () => {
    expect(maskCpf('52998224725')).toBe('***.982.247-**');
  });

  it('extrai só os dígitos', () => {
    expect(onlyDigits('(85) 98765-4321')).toBe('85987654321');
  });
});

describe('Telefone', () => {
  it.each([
    ['celular com DDD', '(85) 98765-4321'],
    ['celular só com dígitos', '11987654321'],
    ['fixo com DDD', '(84) 3317-8200'],
  ])('aceita %s', (_, phone) =>
    expect(isValidBrazilianPhone(phone)).toBe(true),
  );

  it.each([
    ['sem DDD', '98765-4321'],
    ['DDD começando com 0', '(05) 98765-4321'],
    ['celular sem o 9', '(85) 88765-4321'],
    ['fixo começando com 9 e 10 dígitos', '(85) 9876-5432'],
    ['dígitos demais', '859876543210'],
  ])('recusa %s', (_, phone) =>
    expect(isValidBrazilianPhone(phone)).toBe(false),
  );
});

describe('Data de nascimento', () => {
  const today = new Date('2030-01-07T13:00:00Z');

  it('aceita uma data real no passado', () => {
    expect(isValidBirthDate('1990-05-20', today)).toBe(true);
  });

  it('aceita quem nasceu hoje', () => {
    expect(isValidBirthDate('2030-01-07', today)).toBe(true);
  });

  it.each([
    ['no futuro', '2030-01-08'],
    ['inexistente (31 de fevereiro)', '1990-02-31'],
    ['mais de 130 anos', '1899-12-31'],
    ['formato errado', '20/05/1990'],
  ])('recusa data %s', (_, date) =>
    expect(isValidBirthDate(date, today)).toBe(false),
  );
});
