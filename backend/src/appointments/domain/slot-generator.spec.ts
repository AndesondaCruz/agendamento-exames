import { generateSlots, type MinuteRange } from './slot-generator.js';

/** "08:40" -> 520. Só para deixar os testes legíveis. */
const m = (hhmm: string): number => {
  const [h, min] = hhmm.split(':').map(Number);
  return h * 60 + min;
};
/** 520 -> "08:40". */
const hhmm = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const range = (start: string, end: string): MinuteRange => ({
  start: m(start),
  end: m(end),
});

const MORNING = [range('08:00', '12:00')];

describe('generateSlots', () => {
  describe('exemplos do enunciado (turno 08:00–12:00)', () => {
    it('exame de 40 min', () => {
      const slots = generateSlots({ shifts: MORNING, durationMinutes: 40 });

      expect(slots.map(hhmm)).toEqual([
        '08:00',
        '08:40',
        '09:20',
        '10:00',
        '10:40',
        '11:20',
      ]);
    });

    it('exame de 30 min', () => {
      const slots = generateSlots({ shifts: MORNING, durationMinutes: 30 });

      expect(slots.map(hhmm)).toEqual([
        '08:00',
        '08:30',
        '09:00',
        '09:30',
        '10:00',
        '10:30',
        '11:00',
        '11:30',
      ]);
    });

    it('exame de 20 min: 12 horários, de 08:00 a 11:40', () => {
      const slots = generateSlots({ shifts: MORNING, durationMinutes: 20 });

      expect(slots).toHaveLength(12);
      expect(hhmm(slots[0])).toBe('08:00');
      expect(hhmm(slots.at(-1)!)).toBe('11:40');
    });

    it('o último horário termina exatamente no fim do turno', () => {
      const slots = generateSlots({ shifts: MORNING, durationMinutes: 40 });

      expect(slots.at(-1)! + 40).toBe(m('12:00'));
    });
  });

  describe('agendamento existente das 09:20 às 10:00', () => {
    const busy = [range('09:20', '10:00')];

    it('exame de 40 min: remove só o 09:20', () => {
      const slots = generateSlots({
        shifts: MORNING,
        durationMinutes: 40,
        busy,
      });

      expect(slots.map(hhmm)).toEqual([
        '08:00',
        '08:40',
        '10:00',
        '10:40',
        '11:20',
      ]);
    });

    it('exame de 30 min: remove 09:00 (termina 09:30) e 09:30 (começa dentro)', () => {
      const slots = generateSlots({
        shifts: MORNING,
        durationMinutes: 30,
        busy,
      });

      expect(slots.map(hhmm)).not.toContain('09:00');
      expect(slots.map(hhmm)).not.toContain('09:30');
      expect(slots.map(hhmm)).toContain('08:30'); // 08:30–09:00 não encosta
      expect(slots.map(hhmm)).toContain('10:00'); // começa quando o outro termina
    });

    it('exame de 20 min: remove 09:20 e 09:40, mantém 09:00 e 10:00 (adjacentes)', () => {
      const slots = generateSlots({
        shifts: MORNING,
        durationMinutes: 20,
        busy,
      }).map(hhmm);

      expect(slots).toContain('09:00'); // 09:00–09:20 encosta no início
      expect(slots).not.toContain('09:20');
      expect(slots).not.toContain('09:40');
      expect(slots).toContain('10:00'); // 10:00–10:20 encosta no fim
    });
  });

  describe('turnos', () => {
    it('gera horários em todos os turnos do dia, na ordem', () => {
      const slots = generateSlots({
        shifts: [range('14:00', '15:00'), range('08:00', '09:00')],
        durationMinutes: 30,
      });

      expect(slots.map(hhmm)).toEqual(['08:00', '08:30', '14:00', '14:30']);
    });

    it('cada turno recomeça a grade no próprio início (não herda o passo do anterior)', () => {
      // Dra. Beatriz: 09:00–12:00 e 18:00–22:00
      const slots = generateSlots({
        shifts: [range('09:00', '12:00'), range('18:00', '22:00')],
        durationMinutes: 40,
      }).map(hhmm);

      expect(slots).toEqual([
        '09:00',
        '09:40',
        '10:20',
        '11:00', // 11:40 + 40 = 12:20 estouraria o turno
        '18:00',
        '18:40',
        '19:20',
        '20:00',
        '20:40',
        '21:20', // termina 22:00
      ]);
    });

    it('turno menor que a duração do exame não gera horários', () => {
      expect(
        generateSlots({
          shifts: [range('08:00', '08:30')],
          durationMinutes: 40,
        }),
      ).toEqual([]);
    });

    it('sem turnos no dia (médico não atende), nenhum horário', () => {
      expect(generateSlots({ shifts: [], durationMinutes: 20 })).toEqual([]);
    });
  });

  describe('sem passado (notBefore)', () => {
    it('remove horários que começam antes do instante informado', () => {
      const slots = generateSlots({
        shifts: MORNING,
        durationMinutes: 40,
        notBefore: m('09:21'),
      }).map(hhmm);

      expect(slots).toEqual(['10:00', '10:40', '11:20']);
    });

    it('um horário que começa exatamente agora ainda é oferecido', () => {
      const slots = generateSlots({
        shifts: MORNING,
        durationMinutes: 40,
        notBefore: m('10:00'),
      }).map(hhmm);

      expect(slots[0]).toBe('10:00');
    });
  });

  describe('validação de entrada', () => {
    it.each([0, -20, 12.5])(
      'rejeita duração inválida (%s)',
      (durationMinutes) => {
        expect(() =>
          generateSlots({ shifts: MORNING, durationMinutes }),
        ).toThrow(RangeError);
      },
    );
  });
});
