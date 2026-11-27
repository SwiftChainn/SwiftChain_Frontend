export interface ValidationError {
  field: string;
  message: string;
}

export interface FormFieldProps<TValue = string> {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  onChange?: (value: TValue) => void;
  onBlur?: () => void;
  value?: TValue;
}
