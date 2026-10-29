import type { Doctor, Exam, Slot } from '../../api/types';
import {
  bookingReducer,
  currentStep,
  initialBookingState,
  type BookingState,
} from './bookingReducer';

const exam40: Exam = {
  id: 7,
  name: 'Ultrassonografia Abdominal Total',
  durationMinutes: 40,
};
const exam20: Exam = { id: 1, name: 'Raio-X de Tórax', durationMinutes: 20 };
const helena: Doctor = {
  id: 1,
  name: 'Dra. Helena',
  crm: 'CRM-MG 11111',
  workingWeekdays: [1],
  shifts: [],
};
const camila: Doctor = {
  id: 5,
  name: 'Dra. Camila',
  crm: 'CRM-MG 55555',
  workingWeekdays: [1],
  shifts: [],
};
const slot: Slot = {
  time: '08:00',
  startsAt: '2030-01-07T08:00:00.000-03:00',
  endsAt: '2030-01-07T08:40:00.000-03:00',
};

const complete: BookingState = {
  exam: exam40,
  doctor: helena,
  date: '2030-01-07',
  slot,
};

describe('bookingReducer', () => {
  it('trocar o exame limpa só o horário (a grade muda com a duração)', () => {
    const next = bookingReducer(complete, { type: 'selectExam', exam: exam20 });

    expect(next).toEqual({
      exam: exam20,
      doctor: helena,
      date: '2030-01-07',
      slot: undefined,
    });
  });

  it('trocar o médico limpa data e horário', () => {
    const next = bookingReducer(complete, {
      type: 'selectDoctor',
      doctor: camila,
    });

    expect(next).toEqual({
      exam: exam40,
      doctor: camila,
      date: undefined,
      slot: undefined,
    });
  });

  it('trocar a data limpa o horário', () => {
    const next = bookingReducer(complete, {
      type: 'selectDate',
      date: '2030-01-08',
    });

    expect(next.slot).toBeUndefined();
    expect(next.date).toBe('2030-01-08');
  });

  it('escolher de novo a mesma opção não apaga nada (mesma referência)', () => {
    expect(bookingReducer(complete, { type: 'selectExam', exam: exam40 })).toBe(
      complete,
    );
    expect(
      bookingReducer(complete, { type: 'selectDoctor', doctor: helena }),
    ).toBe(complete);
    expect(
      bookingReducer(complete, { type: 'selectDate', date: '2030-01-07' }),
    ).toBe(complete);
  });

  it('reset volta ao início', () => {
    expect(bookingReducer(complete, { type: 'reset' })).toEqual(
      initialBookingState,
    );
  });

  it('currentStep acompanha o progresso', () => {
    expect(currentStep({})).toBe(1);
    expect(currentStep({ exam: exam40 })).toBe(2);
    expect(currentStep({ exam: exam40, doctor: helena })).toBe(3);
    expect(
      currentStep({ exam: exam40, doctor: helena, date: '2030-01-07' }),
    ).toBe(4);
    expect(currentStep(complete)).toBe(5);
  });
});
