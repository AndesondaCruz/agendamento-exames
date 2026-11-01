import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useCancelAppointment, useLookupAppointment } from '../../api/hooks';
import type { Appointment } from '../../api/types';
import { AppointmentDetails } from '../../components/AppointmentDetails';
import { ErrorState } from '../../components/StatusViews';
import { formatCpf, onlyDigits } from '../../lib/brazil';
import {
  normalizeProtocol,
  validateLookup,
  type LookupForm,
} from './manageRules';

export function ManageAppointmentPage({ now = () => new Date() }) {
  const lookup = useLookupAppointment();
  const cancel = useCancelAppointment();

  const [form, setForm] = useState<LookupForm>({ protocol: '', cpf: '' });
  const [submitted, setSubmitted] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleLookup(found: Appointment) {
    setAppointment(found);
    setConfirming(false);
    cancel.reset();
  }

  function startOver() {
    setAppointment(null);
    setConfirming(false);
    setSubmitted(false);
    setForm({ protocol: '', cpf: '' });
    lookup.reset();
    cancel.reset();
  }

  if (appointment) {
    return (
      <AppointmentCard
        appointment={appointment}
        canCancel={
          appointment.status === 'SCHEDULED' &&
          new Date(appointment.startsAt).getTime() > now().getTime()
        }
        confirming={confirming}
        onAskCancel={() => setConfirming(true)}
        onKeep={() => setConfirming(false)}
        onConfirmCancel={() =>
          cancel.mutate(
            { id: appointment.id, patientCpf: onlyDigits(form.cpf) },
            {
              onSuccess: (cancelled) => {
                setAppointment(cancelled);
                setConfirming(false);
              },
            },
          )
        }
        isCancelling={cancel.isPending}
        cancelError={cancel.error}
        justCancelled={cancel.isSuccess}
        onStartOver={startOver}
      />
    );
  }

  return (
    <LookupFormView
      form={form}
      onChange={setForm}
      submitted={submitted}
      isSearching={lookup.isPending}
      error={lookup.error}
      onSubmit={() => {
        setSubmitted(true);
        if (Object.keys(validateLookup(form)).length > 0) return false;
        lookup.mutate(
          { protocol: form.protocol, patientCpf: onlyDigits(form.cpf) },
          { onSuccess: handleLookup },
        );
        return true;
      }}
    />
  );
}

function LookupFormView({
  form,
  onChange,
  submitted,
  isSearching,
  error,
  onSubmit,
}: {
  form: LookupForm;
  onChange: (form: LookupForm) => void;
  submitted: boolean;
  isSearching: boolean;
  error: unknown;
  /** Devolve false se o formulário ainda tem erro. */
  onSubmit: () => boolean;
}) {
  const baseId = useId();
  const errors = submitted ? validateLookup(form) : {};

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSearching) return;
    if (!onSubmit()) {
      const first = validateLookup(form).protocol ? 'protocol' : 'cpf';
      document.getElementById(`${baseId}-${first}`)?.focus();
    }
  }

  const fields = [
    {
      key: 'protocol' as const,
      label: 'Protocolo',
      hint: 'Está na confirmação do agendamento',
      inputMode: 'text' as const,
      maxLength: 8,
      autoCapitalize: 'characters',
      className: 'font-mono uppercase tracking-widest',
      format: normalizeProtocol,
    },
    {
      key: 'cpf' as const,
      label: 'CPF do paciente',
      inputMode: 'numeric' as const,
      maxLength: 14,
      autoCapitalize: 'off',
      className: '',
      format: formatCpf,
    },
  ];

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <h1 className="text-2xl font-semibold text-slate-900">Meu agendamento</h1>
      <p className="mt-1 text-sm text-slate-600">
        Consulte ou cancele um exame com o protocolo e o CPF do paciente.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {fields.map((field) => {
          const inputId = `${baseId}-${field.key}`;
          const errorId = `${inputId}-error`;
          const hintId = `${inputId}-hint`;
          const fieldError = errors[field.key];
          const describedBy =
            [field.hint ? hintId : null, fieldError ? errorId : null]
              .filter(Boolean)
              .join(' ') || undefined;
          return (
            <div key={field.key}>
              <label
                htmlFor={inputId}
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                {field.label}
              </label>
              {field.hint && (
                <p id={hintId} className="mb-1 text-xs text-slate-500">
                  {field.hint}
                </p>
              )}
              <input
                id={inputId}
                type="text"
                value={form[field.key]}
                onChange={(event) =>
                  onChange({
                    ...form,
                    [field.key]: field.format(event.target.value),
                  })
                }
                inputMode={field.inputMode}
                maxLength={field.maxLength}
                autoCapitalize={field.autoCapitalize}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={describedBy}
                className={`w-full rounded-xl border bg-white px-4 py-2.5 text-base ${field.className} ${
                  fieldError
                    ? 'border-red-400'
                    : 'border-slate-300 focus:border-brand-600'
                }`}
              />
              {fieldError && (
                <p id={errorId} className="mt-1 text-sm text-red-700">
                  {fieldError}
                </p>
              )}
            </div>
          );
        })}

        {error != null && <ErrorState error={error} />}

        <button
          type="submit"
          disabled={isSearching}
          aria-busy={isSearching}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
        >
          {isSearching ? 'Consultando…' : 'Consultar agendamento'}
        </button>
      </form>
    </section>
  );
}

const STATUS_BADGE = {
  SCHEDULED: { label: 'Agendado', className: 'bg-brand-100 text-brand-800' },
  CANCELLED: { label: 'Cancelado', className: 'bg-slate-200 text-slate-700' },
} as const;

function AppointmentCard({
  appointment,
  canCancel,
  confirming,
  onAskCancel,
  onKeep,
  onConfirmCancel,
  isCancelling,
  cancelError,
  justCancelled,
  onStartOver,
}: {
  appointment: Appointment;
  canCancel: boolean;
  confirming: boolean;
  onAskCancel: () => void;
  onKeep: () => void;
  onConfirmCancel: () => void;
  isCancelling: boolean;
  cancelError: unknown;
  justCancelled: boolean;
  onStartOver: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const questionId = useId();
  const badge = STATUS_BADGE[appointment.status];

  // Ao abrir o resultado e depois de cancelar, o foco vai ao título: o
  // leitor de tela anuncia o que mudou.
  useEffect(() => {
    headingRef.current?.focus();
  }, [appointment.status]);

  // Ao pedir para cancelar, o foco vai à pergunta de confirmação.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold text-slate-900 outline-none"
          >
            {justCancelled ? 'Agendamento cancelado' : 'Seu agendamento'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Protocolo{' '}
            <span className="font-mono font-semibold text-slate-700">
              {appointment.protocol}
            </span>
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="mt-6">
        <AppointmentDetails appointment={appointment} />
      </div>

      {justCancelled && (
        <p className="mt-4 text-sm text-slate-600">
          O horário foi liberado para outros pacientes.
        </p>
      )}

      {appointment.status === 'SCHEDULED' && !canCancel && (
        <p className="mt-4 text-sm text-slate-600">
          Este exame já começou ou já passou, então não pode mais ser cancelado.
        </p>
      )}

      {cancelError != null && (
        <div className="mt-4">
          <ErrorState error={cancelError} />
        </div>
      )}

      {confirming ? (
        <div
          role="group"
          aria-labelledby={questionId}
          className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <p id={questionId} className="text-sm font-medium text-red-900">
            Cancelar este exame? O horário será liberado e não fica reservado
            para você.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirmCancel}
              disabled={isCancelling}
              aria-busy={isCancelling}
              className="rounded-xl bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:cursor-wait disabled:opacity-70"
            >
              {isCancelling ? 'Cancelando…' : 'Sim, cancelar exame'}
            </button>
            <button
              type="button"
              onClick={onKeep}
              disabled={isCancelling}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Manter agendamento
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          {canCancel && (
            <button
              type="button"
              onClick={onAskCancel}
              className="rounded-xl border border-red-300 px-4 py-2.5 font-semibold text-red-700 hover:bg-red-50"
            >
              Cancelar exame
            </button>
          )}
          <button
            type="button"
            onClick={onStartOver}
            className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Consultar outro agendamento
          </button>
        </div>
      )}
    </section>
  );
}
