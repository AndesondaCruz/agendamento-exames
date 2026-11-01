import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { apiRequest } from './client';
import type {
  Appointment,
  Availability,
  CancelAppointmentInput,
  CreateAppointmentInput,
  Doctor,
  Exam,
  LookupAppointmentInput,
} from './types';

/**
 * Chaves de cache centralizadas: evita string solta espalhada pelos
 * componentes e permite invalidar com precisão (ex.: só a agenda de um médico).
 */
export const queryKeys = {
  exams: (search: string) => ['exams', search] as const,
  doctors: ['doctors'] as const,
  availabilityRoot: ['availability'] as const,
  availability: (doctorId: number, examId: number, date: string) =>
    ['availability', doctorId, examId, date] as const,
};

export function useExamSearch(search: string) {
  return useQuery({
    queryKey: queryKeys.exams(search),
    queryFn: ({ signal }) =>
      apiRequest<Exam[]>('/exams', { params: { search }, signal }),
    // Mantém a lista anterior na tela enquanto a nova busca carrega (sem "piscar").
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000, // o catálogo quase nunca muda
  });
}

export function useDoctors() {
  return useQuery({
    queryKey: queryKeys.doctors,
    queryFn: ({ signal }) => apiRequest<Doctor[]>('/doctors', { signal }),
    staleTime: 5 * 60_000,
  });
}

export function useAvailability(
  doctorId?: number,
  examId?: number,
  date?: string,
) {
  const enabled =
    doctorId !== undefined && examId !== undefined && date !== undefined;

  return useQuery({
    queryKey: queryKeys.availability(doctorId ?? 0, examId ?? 0, date ?? ''),
    queryFn: ({ signal }) =>
      apiRequest<Availability>(`/doctors/${doctorId}/availability`, {
        params: { examId, date },
        signal,
      }),
    enabled,
    // Agenda muda com frequência (outros pacientes agendando): dado "velho" rápido.
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAppointmentInput) =>
      apiRequest<Appointment>('/appointments', { method: 'POST', body: input }),
    // Sucesso OU conflito: a agenda mudou, então recarrega a disponibilidade.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.availabilityRoot }),
  });
}

/**
 * Consulta por protocolo + CPF. É uma mutation, e não uma query, de
 * propósito: o CPF não vira chave de cache do TanStack Query (que fica em
 * memória e aparece no DevTools), e a consulta só roda quando o paciente
 * envia o formulário.
 */
export function useLookupAppointment() {
  return useMutation({
    mutationFn: (input: LookupAppointmentInput) =>
      apiRequest<Appointment>('/appointments/lookup', {
        method: 'POST',
        body: input,
      }),
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patientCpf }: CancelAppointmentInput) =>
      apiRequest<Appointment>(`/appointments/${id}/cancel`, {
        method: 'POST',
        body: { patientCpf },
      }),
    // O horário foi liberado: a agenda que outra aba mostra ficou velha.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.availabilityRoot }),
  });
}
