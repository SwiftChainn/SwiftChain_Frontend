/**
 * Reusable Zod building blocks for form validation.
 * Compose these instead of re-writing ad hoc checks in each form.
 */

import { z } from 'zod';

export const requiredString = (label: string) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`);

export const emailSchema = requiredString('Email').email('Enter a valid email address');

export const passwordSchema = z
  .string({ required_error: 'Password is required', invalid_type_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

/** Stellar public key: "G" + 55 base32 characters. */
export const stellarAddressSchema = requiredString('Wallet address').regex(
  /^G[A-Z2-7]{55}$/,
  'Enter a valid Stellar public key',
);

export const roleSchema = z.enum(['customer', 'driver', 'admin'], {
  errorMap: () => ({ message: 'Role is required' }),
});

/**
 * Schema backing the generic `useFormValidation` hook. Preserves the
 * hook's historical rules: every field is required.
 */
export const genericProfileFormSchema = z.object({
  username: requiredString('Username'),
  email: requiredString('Email'),
  password: requiredString('Password'),
  role: requiredString('Role'),
  bio: requiredString('Bio'),
});

export const loginFormSchema = z.object({
  email: emailSchema,
  password: requiredString('Password'),
});
