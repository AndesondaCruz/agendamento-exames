import type { ReactNode } from 'react';
import { userMessageFor } from '../lib/errors';

/** Placeholder animado enquanto os dados carregam (evita "pulo" de layout). */
export function Skeleton({
  rows = 3,
  className = 'h-14',
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-label="Carregando" className="space-y-2">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`}
        />
      ))}
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
    >
      <p>{userMessageFor(error)}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium text-red-700 hover:bg-red-100"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function InlineAlert({
  children,
  tone = 'warning',
}: {
  children: ReactNode;
  tone?: 'warning' | 'info';
}) {
  const styles =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-sky-200 bg-sky-50 text-sky-900';
  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}
