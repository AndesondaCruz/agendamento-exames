import { useId, useState, type FormEvent } from 'react';
import { ErrorState } from '../../../components/StatusViews';
import { normalizeName, validatePatientName } from '../bookingRules';

interface PatientFormProps {
  /** Controlado pela página: o nome sobrevive se o paciente precisar trocar o horário. */
  name: string;
  onNameChange: (name: string) => void;
  isSubmitting: boolean;
  submitError: unknown;
  onSubmit: (patientName: string) => void;
}

export function PatientForm({
  name,
  onNameChange,
  isSubmitting,
  submitError,
  onSubmit,
}: PatientFormProps) {
  const inputId = useId();
  const errorId = useId();
  const [touched, setTouched] = useState(false);

  const validationError = validatePatientName(name);
  const showValidation = touched && validationError !== null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (validationError || isSubmitting) return;
    onSubmit(normalizeName(name));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label
          htmlFor={inputId}
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Nome completo do paciente
        </label>
        <input
          id={inputId}
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          onBlur={() => setTouched(true)}
          autoComplete="name"
          maxLength={120}
          aria-invalid={showValidation}
          aria-describedby={showValidation ? errorId : undefined}
          className={`w-full rounded-xl border bg-white px-4 py-2.5 text-base ${
            showValidation
              ? 'border-red-400'
              : 'border-slate-300 focus:border-brand-600'
          }`}
        />
        {showValidation && (
          <p id={errorId} className="mt-1 text-sm text-red-700">
            {validationError}
          </p>
        )}
      </div>

      {submitError != null && <ErrorState error={submitError} />}

      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        {isSubmitting ? 'Agendando…' : 'Confirmar agendamento'}
      </button>
    </form>
  );
}
