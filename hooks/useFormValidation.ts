'use client';

import { useState, useCallback } from 'react';

/** Values a form field can hold. */
type FormValue = string | number | boolean | null | undefined;
type FormValues = Record<string, FormValue>;

interface UseFormValidationProps {
  onSubmit: (data: FormValues) => Promise<void>;
}

interface UseFormValidationReturn {
  values: FormValues;
  errors: Record<string, string>;
  isSubmitting: boolean;
  handleChange: (name: string, value: FormValue) => void;
  handleBlur: (name: string) => Promise<void>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  setFieldValue: (name: string, value: FormValue) => void;
}

export function useFormValidation({
  onSubmit,
}: UseFormValidationProps): UseFormValidationReturn {
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (name: string, value: FormValue) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      if (errors[name]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleBlur = useCallback(
    async (name: string) => {
      // Simple client-side validation for empty fields
      const value = values[name];
      if (!value || String(value).trim() === '') {
        setErrors((prev) => ({ ...prev, [name]: `${name} is required` }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    },
    [values]
  );

  const setFieldValue = useCallback((name: string, value: FormValue) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      console.log('Form submitted with values:', values);

      // Client-side validation
      const newErrors: Record<string, string> = {};
      if (!values.username) newErrors.username = 'Username is required';
      if (!values.email) newErrors.email = 'Email is required';
      if (!values.password) newErrors.password = 'Password is required';
      if (!values.role) newErrors.role = 'Role is required';
      if (!values.bio) newErrors.bio = 'Bio is required';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        console.log('Validation failed:', newErrors);
        return;
      }

      setIsSubmitting(true);

      try {
        await onSubmit(values);
        console.log('Form submitted successfully!');
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, onSubmit]
  );

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
  };
}
