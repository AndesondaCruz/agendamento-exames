/**
 * Regras e máscaras de documentos brasileiros. As regras espelham as do
 * back-end (brazilian-documents.ts): o front valida para responder na hora,
 * mas quem decide é a API.
 */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** 11 dígitos, não todos iguais, e dígitos verificadores corretos. */
export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;

  const numbers = digits.split('').map(Number);
  const checkDigit = (length: number): number => {
    const sum = numbers
      .slice(0, length)
      .reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return checkDigit(9) === numbers[9] && checkDigit(10) === numbers[10];
}

/** DDD + 8 dígitos (fixo, começa com 2 a 5) ou + 9 dígitos (celular, começa com 9). */
export function isValidBrazilianPhone(value: string): boolean {
  const digits = onlyDigits(value);
  if (!/^[1-9][1-9]/.test(digits)) return false;
  if (digits.length === 11) return digits[2] === '9';
  if (digits.length === 10) return /^[2-5]$/.test(digits[2] ?? '');
  return false;
}

/** Máscara progressiva enquanto o paciente digita: "52998" -> "529.98". */
export function formatCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** "85987654321" -> "(85) 98765-4321"; com 10 dígitos, "(84) 3317-8200". */
export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = d.length === 11 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** "YYYY-MM-DD" real, entre hoje e 130 anos atrás. `today` também em "YYYY-MM-DD". */
export function isValidBirthDate(value: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  const exists =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  const oldest = `${Number(today.slice(0, 4)) - 130}${today.slice(4)}`;
  // Comparação de texto é segura no formato YYYY-MM-DD.
  return exists && value <= today && value >= oldest;
}
