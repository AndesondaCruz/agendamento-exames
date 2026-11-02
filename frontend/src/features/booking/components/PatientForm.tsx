import { useId, useState, type FormEvent } from 'react';
import { ErrorState } from '../../../components/StatusViews';
import { formatCpf, formatPhone } from '../../../lib/brazil';
import {
  validatePatient,
  type PatientData,
  type PatientField,
} from '../bookingRules';

interface PatientFormProps {
  /** Controlado pela página: os dados sobrevivem se o paciente trocar o horário. */
  patient: PatientData;
  onPatientChange: (patient: PatientData) => void;
  today: string;
  isSubmitting: boolean;
  submitError: unknown;
  onSubmit: (patient: PatientData) => void;
}

interface FieldConfig {
  field: PatientField;
  label: string;
  hint?: string;
  type: 'text' | 'date' | 'tel' | 'email';
  autoComplete: string;
  inputMode?: 'numeric' | 'tel' | 'email';
  maxLength?: number;
  /** Máscara aplicada enquanto o paciente digita. */
  format?: (value: string) => string;
}

const FIELDS: FieldConfig[] = [
  {
    field: 'name',
    label: 'Nome completo do paciente',
    type: 'text',
    autoComplete: 'name',
    maxLength: 120,
  },
  {
    field: 'cpf',
    label: 'CPF',
    type: 'text',
    autoComplete: 'off',
    inputMode: 'numeric',
    maxLength: 14,
    format: formatCpf,
  },
  {
    field: 'birthDate',
    label: 'Data de nascimento',
    type: 'date',
    autoComplete: 'bday',
  },
  {
    field: 'phone',
    label: 'Telefone com DDD',
    type: 'tel',
    autoComplete: 'tel-national',
    inputMode: 'tel',
    maxLength: 15,
    format: formatPhone,
  },
  {
    field: 'email',
    label: 'E-mail',
    hint: 'Opcional',
    type: 'email',
    autoComplete: 'email',
    inputMode: 'email',
    maxLength: 254,
  },
];

export function PatientForm({
  patient,
  onPatientChange,
  today,
  isSubmitting,
  submitError,
  onSubmit,
}: PatientFormProps) {
  const baseId = useId();
  const [touched, setTouched] = useState<Partial<Record<PatientField, true>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);

  const errors = validatePatient(patient, today);
  // Mostra o erro de um campo depois que o paciente sai dele, ou ao enviar.
  const visibleError = (field: PatientField) =>
    submitted || touched[field] ? errors[field] : undefined;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (isSubmitting) return;

    const firstInvalid = FIELDS.find(({ field }) => errors[field]);
    if (firstInvalid) {
      // Leva o foco ao primeiro campo com erro: quem usa teclado ou leitor
      // de tela chega direto ao que precisa corrigir.
      document.getElementById(`${baseId}-${firstInvalid.field}`)?.focus();
      return;
    }
    onSubmit(patient);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((config) => {
          const inputId = `${baseId}-${config.field}`;
          const errorId = `${inputId}-error`;
          const error = visibleError(config.field);
          return (
            <div
              key={config.field}
              className={config.field === 'name' ? 'sm:col-span-2' : undefined}
            >
              <label
                htmlFor={inputId}
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                {config.label}
                {config.hint && (
                  <span className="ml-1 font-normal text-slate-500">
                    ({config.hint})
                  </span>
                )}
              </label>
              <input
                id={inputId}
                type={config.type}
                value={patient[config.field]}
                onChange={(event) =>
                  onPatientChange({
                    ...patient,
                    [config.field]: config.format
                      ? config.format(event.target.value)
                      : event.target.value,
                  })
                }
                onBlur={() =>
                  setTouched((current) => ({
                    ...current,
                    [config.field]: true,
                  }))
                }
                autoComplete={config.autoComplete}
                inputMode={config.inputMode}
                maxLength={config.maxLength}
                max={config.type === 'date' ? today : undefined}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={`w-full rounded-xl border bg-white px-4 py-2.5 text-base ${
                  error
                    ? 'border-red-400'
                    : 'border-slate-300 focus:border-brand-600'
                }`}
              />
              {error && (
                <p id={errorId} className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500">
        Usamos seus dados apenas para identificar o agendamento. O CPF é exibido
        mascarado na confirmação.
      </p>

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
