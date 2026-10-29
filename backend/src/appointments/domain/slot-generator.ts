/**
 * Núcleo da regra de negócio: geração de horários livres.
 *
 * Função PURA: não acessa banco, relógio nem framework. Recebe tudo como
 * parâmetro e devolve um resultado determinístico. Isso permite testá-la
 * exaustivamente em milissegundos e reutilizá-la em dois lugares:
 * - na consulta de disponibilidade (GET), para listar os horários;
 * - no agendamento (POST), para validar que o horário pedido existe na grade.
 *
 * Todos os valores são "minutos desde 00:00" no fuso da clínica.
 */

/** Intervalo semiaberto [start, end), em minutos do dia. */
export interface MinuteRange {
  start: number;
  end: number;
}

export interface GenerateSlotsInput {
  /** Turnos do médico no dia. */
  shifts: readonly MinuteRange[];
  /** Duração do exame: também é o passo entre um horário e outro. */
  durationMinutes: number;
  /** Agendamentos já marcados para o médico no dia. */
  busy?: readonly MinuteRange[];
  /** Horários que começam antes deste minuto são descartados ("sem passado"). */
  notBefore?: number;
}

/** Dois intervalos semiabertos se cruzam? 09:00–09:20 e 09:20–10:00 NÃO. */
export function overlaps(a: MinuteRange, b: MinuteRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Regra 2 do enunciado: a partir do início de cada turno, gera horários em
 * passos iguais à duração do exame. Um horário vale se o bloco inteiro cabe
 * no turno e não se sobrepõe a nenhum agendamento existente.
 *
 * @returns minutos de início, em ordem crescente.
 */
export function generateSlots({
  shifts,
  durationMinutes,
  busy = [],
  notBefore = Number.NEGATIVE_INFINITY,
}: GenerateSlotsInput): number[] {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new RangeError(
      `durationMinutes deve ser um inteiro positivo (recebido: ${durationMinutes}).`,
    );
  }

  const orderedShifts = [...shifts].sort((a, b) => a.start - b.start);
  const slots: number[] = [];

  for (const shift of orderedShifts) {
    // Cada turno recomeça a grade no próprio início.
    for (
      let start = shift.start;
      start + durationMinutes <= shift.end;
      start += durationMinutes
    ) {
      const candidate = { start, end: start + durationMinutes };

      if (start < notBefore) continue;
      if (busy.some((taken) => overlaps(candidate, taken))) continue;

      slots.push(start);
    }
  }

  return slots;
}
