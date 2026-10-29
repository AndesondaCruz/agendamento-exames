import {
  addDays,
  clinicDateOf,
  clinicToday,
  dateRange,
  describeWeekdays,
  formatClinicTime,
  formatDayMonth,
  formatDayNumber,
  formatMonthShort,
  formatLongDate,
  formatWeekdayShort,
  isoWeekday,
} from './dates';

describe('dates', () => {
  it('clinicToday usa o fuso da clínica: 01:00 UTC ainda é "ontem" em São Paulo', () => {
    expect(clinicToday(new Date('2030-01-08T01:00:00Z'))).toBe('2030-01-07');
    expect(clinicToday(new Date('2030-01-08T03:00:00Z'))).toBe('2030-01-08');
  });

  it('addDays atravessa meses e anos', () => {
    expect(addDays('2030-01-31', 1)).toBe('2030-02-01');
    expect(addDays('2030-12-31', 1)).toBe('2031-01-01');
    expect(addDays('2030-03-01', -1)).toBe('2030-02-28');
  });

  it('isoWeekday segue o padrão da API (1 = segunda, 7 = domingo)', () => {
    expect(isoWeekday('2030-01-07')).toBe(1);
    expect(isoWeekday('2030-01-13')).toBe(7);
  });

  it('dateRange gera datas consecutivas', () => {
    expect(dateRange('2030-01-30', 3)).toEqual([
      '2030-01-30',
      '2030-01-31',
      '2030-02-01',
    ]);
  });

  it('formata em português sem deslocar o dia', () => {
    expect(formatWeekdayShort('2030-01-07')).toBe('seg');
    expect(formatDayMonth('2030-01-07')).toBe('07 de jan');
    expect(formatDayNumber('2030-01-07')).toBe('07');
    expect(formatMonthShort('2030-01-07')).toBe('jan');
    expect(formatLongDate('2030-01-07')).toBe(
      'segunda-feira, 07 de janeiro de 2030',
    );
  });

  it('converte o ISO da API para hora e data locais da clínica', () => {
    expect(formatClinicTime('2030-01-07T08:40:00.000-03:00')).toBe('08:40');
    expect(clinicDateOf('2030-01-07T23:00:00.000-03:00')).toBe('2030-01-07');
  });

  it.each([
    [[1, 2, 3, 4, 5], 'seg a sex'],
    [[2, 3, 4, 5, 6], 'ter a sáb'],
    [[1, 3, 5], 'seg, qua, sex'],
    [[2, 4], 'ter, qui'],
    [[], 'sem atendimento'],
  ])('describeWeekdays(%j) = "%s"', (days, expected) => {
    expect(describeWeekdays(days)).toBe(expected);
  });

  it('rejeita formato inválido', () => {
    expect(() => addDays('07/01/2030', 1)).toThrow(RangeError);
  });
});
