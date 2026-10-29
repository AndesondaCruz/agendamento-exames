import { useCallback, useReducer, useState } from 'react';
import { useCreateAppointment } from '../../api/hooks';
import type { Appointment, Doctor } from '../../api/types';
import { InlineAlert } from '../../components/StatusViews';
import { StepSection } from '../../components/StepSection';
import { clinicToday } from '../../lib/dates';
import { isSlotError, userMessageFor } from '../../lib/errors';
import {
  bookingReducer,
  currentStep,
  initialBookingState,
} from './bookingReducer';
import { BookingSuccess } from './components/BookingSuccess';
import { BookingSummary } from './components/BookingSummary';
import { firstWorkingDate } from './bookingRules';
import { DatePicker } from './components/DatePicker';
import { DoctorList } from './components/DoctorList';
import { ExamSearch } from './components/ExamSearch';
import { PatientForm } from './components/PatientForm';
import { SlotPicker } from './components/SlotPicker';

/**
 * Orquestra o fluxo: exame -> médico -> data -> horário -> dados do paciente.
 * As escolhas vivem num reducer puro; os dados do servidor, no TanStack Query.
 * Cada componente de passo só conhece o que precisa (props), sem estado global.
 */
export function BookingPage() {
  const [state, dispatch] = useReducer(bookingReducer, initialBookingState);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);
  const [patientName, setPatientName] = useState('');
  /** Aviso exibido no passo do horário quando o horário escolhido deixou de valer. */
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  const createAppointment = useCreateAppointment();
  const today = clinicToday();
  const step = currentStep(state);
  const { exam, doctor, date, slot } = state;

  const handleDoctorSelect = (selected: Doctor) => {
    dispatch({ type: 'selectDoctor', doctor: selected });
    // Pré-seleciona o primeiro dia em que o médico atende: um clique a menos.
    const firstDate = firstWorkingDate(selected, today);
    if (firstDate) dispatch({ type: 'selectDate', date: firstDate });
  };

  const clearSlot = useCallback(() => dispatch({ type: 'clearSlot' }), []);

  // Chamado quando a agenda recarregada não tem mais o horário escolhido.
  const handleSelectedSlotGone = useCallback(() => {
    setSlotNotice(
      'O horário que você escolheu acabou de ser reservado por outra pessoa. Escolha outro.',
    );
    dispatch({ type: 'clearSlot' });
  }, []);

  const handleSubmit = (patientName: string) => {
    if (!exam || !doctor || !slot) return;
    createAppointment.mutate(
      {
        patientName,
        examId: exam.id,
        doctorId: doctor.id,
        startsAt: slot.startsAt,
      },
      {
        onSuccess: (appointment) => setConfirmed(appointment),
        // Horário tomado/inválido: desmarca para o paciente escolher outro
        // (a agenda já é recarregada pelo onSettled do hook).
        onError: (error) => {
          if (isSlotError(error)) {
            setSlotNotice(userMessageFor(error));
            clearSlot();
          }
        },
      },
    );
  };

  const startOver = () => {
    dispatch({ type: 'reset' });
    createAppointment.reset();
    setPatientName('');
    setSlotNotice(null);
    setConfirmed(null);
  };

  if (confirmed) {
    return <BookingSuccess appointment={confirmed} onNewBooking={startOver} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            Agende seu exame
          </h1>
          <p className="mt-1 text-slate-600">
            Escolha o exame, o médico, o dia e o horário. Leva menos de um
            minuto.
          </p>
        </div>

        <StepSection step={1} title="Exame" isDone={step > 1} isLocked={false}>
          <ExamSearch
            selected={exam}
            onSelect={(selected) =>
              dispatch({ type: 'selectExam', exam: selected })
            }
          />
        </StepSection>

        <StepSection
          step={2}
          title="Médico"
          description="Todos os médicos realizam qualquer exame do catálogo."
          isDone={step > 2}
          isLocked={!exam}
          lockedHint="Escolha um exame para ver os médicos."
        >
          <DoctorList selected={doctor} onSelect={handleDoctorSelect} />
        </StepSection>

        <StepSection
          step={3}
          title="Data"
          isDone={step > 3}
          isLocked={!doctor}
          lockedHint="Escolha um médico para ver os dias de atendimento."
        >
          {doctor && (
            <DatePicker
              key={doctor.id}
              doctor={doctor}
              today={today}
              selected={date}
              onSelect={(selected) =>
                dispatch({ type: 'selectDate', date: selected })
              }
            />
          )}
        </StepSection>

        <StepSection
          step={4}
          title="Horário"
          isDone={step > 4}
          isLocked={!exam || !doctor || !date}
          lockedHint="Escolha a data para ver os horários livres."
        >
          {slotNotice && (
            <div className="mb-4">
              <InlineAlert>{slotNotice}</InlineAlert>
            </div>
          )}
          {exam && doctor && date && (
            <SlotPicker
              key={`${doctor.id}-${exam.id}-${date}`}
              exam={exam}
              doctor={doctor}
              date={date}
              selected={slot}
              onSelect={(selected) => {
                setSlotNotice(null);
                createAppointment.reset();
                dispatch({ type: 'selectSlot', slot: selected });
              }}
              onSelectedSlotGone={handleSelectedSlotGone}
            />
          )}
        </StepSection>

        <StepSection
          step={5}
          title="Seus dados"
          isDone={false}
          isLocked={!slot}
          lockedHint="Escolha um horário para confirmar."
        >
          <PatientForm
            name={patientName}
            onNameChange={setPatientName}
            isSubmitting={createAppointment.isPending}
            submitError={
              isSlotError(createAppointment.error)
                ? null
                : createAppointment.error
            }
            onSubmit={handleSubmit}
          />
        </StepSection>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <BookingSummary state={state} />
      </div>
    </div>
  );
}
