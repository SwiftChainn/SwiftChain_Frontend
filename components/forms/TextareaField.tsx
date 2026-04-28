import { FormFieldProps } from './type';

interface TextareaFieldProps extends FormFieldProps {
  rows?: number;
  maxLength?: number;
}

export function TextareaField({
  name,
  label,
  placeholder,
  required = false,
  disabled = false,
  rows = 4,
  maxLength,
  className = '',
  error,
  value,
  onChange,
  onBlur,
}: TextareaFieldProps) {
  const textareaId = `field-${name}`;
  const hasError = !!error;

  return (
    <div className="mb-4">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <textarea
        id={textareaId}
        name={name}
        value={value || ''}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${
            hasError
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500'
          }
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          ${className}
        `}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${textareaId}-error` : undefined}
      />

      {maxLength && (
        <div className="text-xs text-gray-500 mt-1">
          {`${(value || '').length}/${maxLength} characters`}
        </div>
      )}

      {hasError && (
        <p
          id={`${textareaId}-error`}
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
