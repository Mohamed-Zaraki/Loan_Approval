import type { ReactNode } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { CURRENCY_SYMBOL } from '../config';
import { AlertTriangle } from './Icons';

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, className = '', children }: FieldProps) {
  return (
    <div className={`field ${className}`}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="field-error" id={`${htmlFor}-error`}>
          <AlertTriangle size={13} />
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function TextInput({ invalid = false, className = '', ...props }: TextInputProps) {
  return (
    <input
      {...props}
      className={`input ${invalid ? 'invalid' : ''} ${className}`}
      aria-invalid={invalid || undefined}
    />
  );
}

interface MoneyInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function MoneyInput({ invalid = false, className = '', ...props }: MoneyInputProps) {
  return (
    <div className={`money ${invalid ? 'invalid' : ''} ${className}`}>
      <span aria-hidden="true">{CURRENCY_SYMBOL}</span>
      <input {...props} inputMode="decimal" aria-invalid={invalid || undefined} />
    </div>
  );
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function SelectInput({ invalid = false, className = '', children, ...props }: SelectInputProps) {
  return (
    <select
      {...props}
      className={`select ${invalid ? 'invalid' : ''} ${className}`}
      aria-invalid={invalid || undefined}
    >
      {children}
    </select>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function TextArea({ invalid = false, className = '', ...props }: TextAreaProps) {
  return (
    <textarea
      {...props}
      className={`textarea ${invalid ? 'invalid' : ''} ${className}`}
      aria-invalid={invalid || undefined}
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
        className="switch"
        onClick={() => onChange(!checked)}
      >
        <span className="sr-only">{label}</span>
      </button>
      <div className="switch-text">
        <strong id={`${id}-label`}>{label}</strong>
        <span>{description}</span>
      </div>
    </div>
  );
}
