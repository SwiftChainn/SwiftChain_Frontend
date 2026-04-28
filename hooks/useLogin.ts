'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';

interface LoginCredentials {
  email: string;
  password: string;
}

interface UseLoginReturn {
  values: LoginCredentials;
  errors: Record<string, string>;
  isSubmitting: boolean;
  handleChange: (name: string, value: string) => void;
  handleBlur: (name: string) => Promise<void>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

/**
 * useLogin — Custom hook for handling login form logic and API communication.
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export function useLogin(): UseLoginReturn {
  const router = useRouter();
  const [values, setValues] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (name: string, value: string) => {
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

  /**
   * Validates email format using regex pattern
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleBlur = useCallback(
    async (name: string) => {
      const value = name === 'email' ? values.email : name === 'password' ? values.password : '';
      const newErrors: Record<string, string> = { ...errors };

      if (name === 'email') {
        if (!value || value.trim() === '') {
          newErrors.email = 'Email is required';
        } else if (!isValidEmail(value)) {
          newErrors.email = 'Please enter a valid email address';
        } else {
          delete newErrors.email;
        }
      } else if (name === 'password') {
        if (!value || value.trim() === '') {
          newErrors.password = 'Password is required';
        } else {
          delete newErrors.password;
        }
      }

      setErrors(newErrors);
    },
    [values, errors]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Client-side validation
      const newErrors: Record<string, string> = {};

      if (!values.email || values.email.trim() === '') {
        newErrors.email = 'Email is required';
      } else if (!isValidEmail(values.email)) {
        newErrors.email = 'Please enter a valid email address';
      }

      if (!values.password || values.password.trim() === '') {
        newErrors.password = 'Password is required';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setIsSubmitting(true);

      try {
        // Call authentication service
        const response = await authService.login(values.email, values.password);

        if (response.success && response.data?.token) {
          // Store token in localStorage
          localStorage.setItem('authToken', response.data.token);

          // Redirect to dashboard
          router.push('/dashboard');
        } else {
          setErrors({ form: response.message || 'Login failed' });
        }
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.message || error?.message || 'An error occurred during login';
        setErrors({ form: errorMessage });
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, router]
  );

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}
