import type { Doctor, Exam, Slot } from '../../api/types';

/**
 * Estado das escolhas do paciente. Cada passo depende dos anteriores, então
 * trocar uma escolha limpa APENAS o que ela invalida:
 *
 * - trocar o exame   -> limpa o horário (a duração muda a grade), mantém médico e data
 * - trocar o médico  -> limpa data e horário (os dias de atendimento mudam)
 * - trocar a data    -> limpa o horário
 *
 * Reducer puro (sem React, sem rede): testável isoladamente.
 */
export interface BookingState {
  exam?: Exam;
  doctor?: Doctor;
  date?: string;
  slot?: Slot;
}

export type BookingAction =
  | { type: 'selectExam'; exam: Exam }
  | { type: 'selectDoctor'; doctor: Doctor }
  | { type: 'selectDate'; date: string }
  | { type: 'selectSlot'; slot: Slot }
  | { type: 'clearSlot' }
  | { type: 'reset' };

export const initialBookingState: BookingState = {};

export function bookingReducer(
  state: BookingState,
  action: BookingAction,
): BookingState {
  switch (action.type) {
    case 'selectExam':
      if (state.exam?.id === action.exam.id) return state;
      return { ...state, exam: action.exam, slot: undefined };

    case 'selectDoctor':
      if (state.doctor?.id === action.doctor.id) return state;
      return {
        ...state,
        doctor: action.doctor,
        date: undefined,
        slot: undefined,
      };

    case 'selectDate':
      if (state.date === action.date) return state;
      return { ...state, date: action.date, slot: undefined };

    case 'selectSlot':
      return { ...state, slot: action.slot };

    case 'clearSlot':
      return { ...state, slot: undefined };

    case 'reset':
      return initialBookingState;
  }
}

/** Passo atual (1 a 5), usado para destacar onde o paciente está. */
export function currentStep(state: BookingState): 1 | 2 | 3 | 4 | 5 {
  if (!state.exam) return 1;
  if (!state.doctor) return 2;
  if (!state.date) return 3;
  if (!state.slot) return 4;
  return 5;
}
