export interface ValidationError {
  field: string;
  message: string;
}

export interface FormFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  onChange?: (value: any) => void;
  onBlur?: () => void;
  value?: any;
}
