import { doctorsSeedData, timeToMinutes } from './doctors.seed-data.js';

describe('timeToMinutes', () => {
  it.each([
    ['00:00', 0],
    ['08:00', 480],
    ['09:20', 560],
    ['22:00', 1320],
    ['23:59', 1439],
  ])('%s -> %i', (time, expected) => {
    expect(timeToMinutes(time)).toBe(expected);
  });

  it.each(['8:00', '24:00', '12:60', '12h00', ''])('rejeita "%s"', (time) => {
    expect(() => timeToMinutes(time)).toThrow(/Horário inválido/);
  });
});

describe('doctorsSeedData', () => {
  it('tem CRMs únicos', () => {
    const crms = doctorsSeedData.map((doctor) => doctor.crm);
    expect(new Set(crms).size).toBe(crms.length);
  });

  it('todo turno começa antes de terminar', () => {
    for (const doctor of doctorsSeedData) {
      for (const shift of doctor.shifts) {
        expect(timeToMinutes(shift.start)).toBeLessThan(
          timeToMinutes(shift.end),
        );
      }
    }
  });

  it('não tem turnos sobrepostos no mesmo dia para o mesmo médico', () => {
    for (const doctor of doctorsSeedData) {
      const byDay = new Map<number, Array<[number, number]>>();

      for (const shift of doctor.shifts) {
        for (const day of shift.weekdays) {
          const ranges = byDay.get(day) ?? [];
          ranges.push([timeToMinutes(shift.start), timeToMinutes(shift.end)]);
          byDay.set(day, ranges);
        }
      }

      for (const ranges of byDay.values()) {
        ranges.sort((a, b) => a[0] - b[0]);
        for (let i = 1; i < ranges.length; i++) {
          expect(ranges[i][0]).toBeGreaterThanOrEqual(ranges[i - 1][1]);
        }
      }
    }
  });
});
