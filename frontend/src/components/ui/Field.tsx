import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";
import { cx } from "@/lib/util";

/* Generic wrapper: label + arbitrary control + hint/error. */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="sh-field">
      <label className="sh-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="sh-field__error">{error}</p>
      ) : hint ? (
        <p className="sh-field__hint">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
  data?: boolean;
  unit?: string;
}

export function InputField({
  label,
  hint,
  error,
  data = false,
  unit,
  id,
  className,
  ...rest
}: InputFieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const input = (
    <input
      id={inputId}
      className={cx("sh-input", data && "sh-input--data", className)}
      aria-invalid={error ? "true" : undefined}
      {...rest}
    />
  );
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId}>
      {unit ? (
        <div className="sh-inputgroup">
          {input}
          <span className="sh-inputgroup__unit">{unit}</span>
        </div>
      ) : (
        input
      )}
    </Field>
  );
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string | null;
}

export function TextareaField({
  label,
  hint,
  error,
  id,
  className,
  ...rest
}: TextareaFieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId}>
      <textarea
        id={inputId}
        className={cx("sh-textarea", className)}
        aria-invalid={error ? "true" : undefined}
        {...rest}
      />
    </Field>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}

export function SelectField({
  label,
  hint,
  error,
  id,
  className,
  children,
  ...rest
}: SelectFieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId}>
      <select id={inputId} className={cx("sh-select", className)} {...rest}>
        {children}
      </select>
    </Field>
  );
}
