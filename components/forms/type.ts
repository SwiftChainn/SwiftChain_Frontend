export interface ValidationError {
  field: string;
  message: string;
}

export interface FormFieldProps<T = string> {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  onChange?: (value: T) => void;
  onBlur?: () => void;
  value?: T;
}
