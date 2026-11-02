/**
 * Regras de documentos brasileiros como funções PURAS: sem framework, fáceis
 * de testar e reaproveitadas pelos validadores dos DTOs.
 */

/** Mantém só os dígitos: "529.982.247-25" -> "52998224725". */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * CPF válido = 11 dígitos, não todos iguais, e os dois últimos (dígitos
 * verificadores) batendo com o cálculo oficial da Receita Federal.
 * "111.111.111-11" passa no cálculo, mas é recusado de propósito.
 */
export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;

  const numbers = digits.split('').map(Number);
  const checkDigit = (length: number): number => {
    // Pesos decrescentes: 10..2 para o 1º dígito, 11..2 para o 2º.
    const sum = numbers
      .slice(0, length)
      .reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return checkDigit(9) === numbers.at(9) && checkDigit(10) === numbers.at(10);
}

/** "52998224725" -> "***.982.247-**": mostra o suficiente para conferir, sem expor. */
export function maskCpf(cpf: string): string {
  const digits = onlyDigits(cpf);
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

/**
 * Telefone brasileiro com DDD: 10 dígitos (fixo, começa com 2 a 5) ou
 * 11 dígitos (celular, começa com 9). DDDs começam e terminam de 1 a 9.
 */
export function isValidBrazilianPhone(value: string): boolean {
  const digits = onlyDigits(value);
  if (!/^[1-9][1-9]/.test(digits)) return false;
  if (digits.length === 11) return digits.at(2) === '9';
  if (digits.length === 10) return /^[2-5]$/.test(digits.at(2) ?? '');
  return false;
}

/**
 * Data de nascimento "YYYY-MM-DD": precisa existir no calendário, não pode
 * estar no futuro e a pessoa não pode ter mais de 130 anos.
 */
export function isValidBirthDate(value: string, today: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  const existsInCalendar =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!existsInCalendar) return false;

  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const oldest = Date.UTC(
    today.getUTCFullYear() - 130,
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return date.getTime() <= todayUtc && date.getTime() >= oldest;
}
