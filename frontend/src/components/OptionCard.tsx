import type { ReactNode } from 'react';

interface OptionCardProps {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  children: ReactNode;
  /** Rótulo completo para leitores de tela, quando o visual é abreviado. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Opção selecionável com aparência de cartão, mas implementada com um
 * <input type="radio"> nativo. Ganhos de acessibilidade "de graça":
 * navegação por setas dentro do grupo, foco, e o leitor de tela anuncia
 * "opção 2 de 6, selecionada".
 */
export function OptionCard({
  name,
  value,
  checked,
  disabled = false,
  onChange,
  children,
  ariaLabel,
  className = '',
}: OptionCardProps) {
  return (
    <label
      className={`relative block rounded-xl border px-4 py-3 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600 ${
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
          : checked
            ? 'cursor-pointer border-brand-600 bg-brand-50 ring-1 ring-brand-600'
            : 'cursor-pointer border-slate-200 bg-white hover:border-brand-500 hover:bg-brand-50/50'
      } ${className}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={ariaLabel}
        className="sr-only"
      />
      {children}
    </label>
  );
}
