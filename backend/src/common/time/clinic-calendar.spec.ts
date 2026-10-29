import {
  clinicDateOf,
  formatMinutes,
  instantAtMinute,
  minutesSinceDayStart,
  parseClinicDay,
  toClinicIso,
} from './clinic-calendar.js';

const TZ = 'America/Sao_Paulo';

describe('clinic-calendar', () => {
  describe('parseClinicDay', () => {
    it('interpreta a data no fuso da clínica (00:00 BRT = 03:00 UTC)', () => {
      const day = parseClinicDay('2030-01-07', TZ)!;

      expect(day.start.toISOString()).toBe('2030-01-07T03:00:00.000Z');
      expect(day.end.toISOString()).toBe('2030-01-08T03:00:00.000Z');
    });

    it('calcula o dia da semana ISO (2030-01-07 é segunda = 1)', () => {
      expect(parseClinicDay('2030-01-07', TZ)!.isoWeekday).toBe(1);
      expect(parseClinicDay('2030-01-13', TZ)!.isoWeekday).toBe(7);
    });

    it.each([
      '2030-02-30',
      '2030-13-01',
      '07/01/2030',
      '2030-1-7',
      'amanhã',
      '',
    ])('rejeita data inválida "%s"', (date) => {
      expect(parseClinicDay(date, TZ)).toBeNull();
    });
  });

  it('converte minutos do dia em instante e de volta', () => {
    const day = parseClinicDay('2030-01-07', TZ)!;
    const eightAm = instantAtMinute(day, 480, TZ);

    expect(eightAm.toISOString()).toBe('2030-01-07T11:00:00.000Z');
    expect(minutesSinceDayStart(eightAm, day)).toBe(480);
  });

  it('a data local depende do fuso: 01:00 UTC ainda é "ontem" em São Paulo', () => {
    expect(clinicDateOf(new Date('2030-01-08T01:00:00Z'), TZ)).toBe(
      '2030-01-07',
    );
  });

  it('serializa com o offset da clínica', () => {
    expect(toClinicIso(new Date('2030-01-07T11:00:00Z'), TZ)).toBe(
      '2030-01-07T08:00:00.000-03:00',
    );
  });

  it('formata minutos como HH:MM', () => {
    expect(formatMinutes(0)).toBe('00:00');
    expect(formatMinutes(560)).toBe('09:20');
    expect(formatMinutes(1320)).toBe('22:00');
  });
});
