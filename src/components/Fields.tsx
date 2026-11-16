import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { CURRENCY_SYMBOL } from '../config';
import { AlertTriangle } from './Icons';

const FieldDescription = createContext<string | undefined>(undefined);

function joinIds(...ids: (string | undefined)[]): string | undefined {
  return ids.filter(Boolean).join(' ') || undefined;
}

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, className = '', children }: FieldProps) {
  const descriptionId = error
    ? `${htmlFor}-error`
    : hint
      ? `${htmlFor}-hint`
      : undefined;

  return (
    <div className={`field ${className}`}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      <FieldDescription.Provider value={descriptionId}>{children}</FieldDescription.Provider>
      {error ? (
        <span className="field-error" id={`${htmlFor}-error`}>
          <AlertTriangle size={13} />
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint" id={`${htmlFor}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function TextInput({
  invalid = false,
  className = '',
  'aria-describedby': ariaDescribedBy,
  ...props
}: TextInputProps) {
  const fieldDescription = useContext(FieldDescription);

  return (
    <input
      {...props}
      className={`input ${invalid ? 'invalid' : ''} ${className}`}
      aria-invalid={invalid || undefined}
      aria-describedby={joinIds(ariaDescribedBy, fieldDescription)}
    />
  );
}

interface MoneyInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function MoneyInput({
  invalid = false,
  className = '',
  'aria-describedby': ariaDescribedBy,
  ...props
}: MoneyInputProps) {
  const fieldDescription = useContext(FieldDescription);

  return (
    <div className={`money ${invalid ? 'invalid' : ''} ${className}`}>
      <span aria-hidden="true">{CURRENCY_SYMBOL}</span>
      <input
        {...props}
        inputMode="decimal"
        aria-invalid={invalid || undefined}
        aria-describedby={joinIds(ariaDescribedBy, fieldDescription)}
      />
    </div>
  );
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function SelectInput({
  invalid = false,
  className = '',
  'aria-describedby': ariaDescribedBy,
  children,
  ...props
}: SelectInputProps) {
  const fieldDescription = useContext(FieldDescription);

  return (
    <select
      {...props}
      className={`select ${invalid ? 'invalid' : ''} ${className}`}
      aria-invalid={invalid || undefined}
      aria-describedby={joinIds(ariaDescribedBy, fieldDescription)}
    >
      {children}
    </select>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function TextArea({
  invalid = false,
  className = '',
  'aria-describedby': ariaDescribedBy,
  ...props
}: TextAreaProps) {
  const fieldDescription = useContext(FieldDescription);

  return (
    <textarea
      {...props}
      className={`textarea ${invalid ? 'invalid' : ''} ${className}`}
      aria-invalid={invalid || undefined}
      aria-describedby={joinIds(ariaDescribedBy, fieldDescription)}
    />
  );
}

interface SwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}

export function Switch({ id, checked, onChange, label, description }: SwitchProps) {
  return (
    <div className="switch-card">
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description`}
        className="switch"
        onClick={() => onChange(!checked)}
      >
        <span className="sr-only">{label}</span>
      </button>
      <div className="switch-text">
        <strong id={`${id}-label`}>{label}</strong>
        <span id={`${id}-description`}>{description}</span>
      </div>
    </div>
  );
}
