import { inputClass, labelClass } from "./formFieldStyles";

export function FormField({ label, error, children, required }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}

export function TextInput({ error, className = "", ...props }) {
  return (
    <input
      className={`${inputClass} ${error ? "border-error" : ""} ${className}`}
      {...props}
    />
  );
}

export function SelectInput({ error, children, className = "", ...props }) {
  return (
    <select
      className={`${inputClass} ${error ? "border-error" : ""} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function TextAreaInput({ error, className = "", ...props }) {
  return (
    <textarea
      className={`${inputClass} resize-none ${error ? "border-error" : ""} ${className}`}
      rows={3}
      {...props}
    />
  );
}
