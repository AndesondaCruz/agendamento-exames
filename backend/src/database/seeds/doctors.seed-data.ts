/**
 * Transcrição estruturada de data/medicos.md.
 *
 * Decisão: o Markdown é documentação para humanos, não um formato de dados.
 * Fazer parsing dele em runtime seria frágil (qualquer ajuste de texto
 * quebraria o seed). A transcrição é feita uma vez, aqui, tipada e revisável.
 *
 * Dias no padrão ISO 8601: 1 = segunda ... 7 = domingo.
 */

export const Weekday = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 7,
} as const;

export type IsoWeekday = (typeof Weekday)[keyof typeof Weekday];

export interface ShiftSeed {
  weekdays: IsoWeekday[];
  start: `${number}:${number}`;
  end: `${number}:${number}`;
}

export interface DoctorSeed {
  name: string;
  crm: string;
  shifts: ShiftSeed[];
}

const { MON, TUE, WED, THU, FRI, SAT } = Weekday;
const WEEKDAYS: IsoWeekday[] = [MON, TUE, WED, THU, FRI];

export const doctorsSeedData: DoctorSeed[] = [
  {
    name: 'Dra. Helena Marques',
    crm: 'CRM-MG 11111',
    shifts: [
      { weekdays: WEEKDAYS, start: '08:00', end: '12:00' },
      { weekdays: WEEKDAYS, start: '14:00', end: '18:00' },
    ],
  },
  {
    name: 'Dr. Rafael Teixeira',
    crm: 'CRM-MG 22222',
    shifts: [
      { weekdays: [MON, WED, FRI], start: '07:00', end: '13:00' },
      { weekdays: [TUE, THU], start: '13:00', end: '19:00' },
    ],
  },
  {
    name: 'Dra. Beatriz Nogueira',
    crm: 'CRM-MG 33333',
    shifts: [
      { weekdays: [MON, TUE, WED, THU], start: '09:00', end: '12:00' },
      { weekdays: [MON, TUE, WED, THU], start: '18:00', end: '22:00' },
    ],
  },
  {
    name: 'Dr. Thiago Fontes',
    crm: 'CRM-MG 44444',
    shifts: [
      { weekdays: [TUE, WED, THU, FRI, SAT], start: '08:00', end: '12:00' },
      // Quarta e sexta têm DOIS turnos: manhã (linha acima) e noite.
      { weekdays: [WED, FRI], start: '19:00', end: '22:00' },
    ],
  },
  {
    name: 'Dra. Camila Andrade',
    crm: 'CRM-MG 55555',
    shifts: [
      { weekdays: WEEKDAYS, start: '10:00', end: '14:00' },
      { weekdays: [SAT], start: '08:00', end: '12:00' },
    ],
  },
];

/** "08:30" -> 510 (minutos desde 00:00). */
export function timeToMinutes(time: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    throw new Error(`Horário inválido: "${time}". Use HH:MM (24h).`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}
