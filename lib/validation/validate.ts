import type { ZodType } from 'zod';

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> =
  | { success: true; data: T; errors: Record<string, never> }
  | { success: false; data?: undefined; errors: FieldErrors };

/**
 * Validate `values` against a Zod schema. Returns the first error message
 * per field, keyed by dotted path (e.g. `address.city`).
 */
export function validateWithSchema<T>(
  schema: ZodType<T, any, any>,
  values: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(values);
  if (result.success) return { success: true, data: result.data, errors: {} };

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_root';
    if (!(key in errors)) errors[key] = issue.message;
  }
  return { success: false, errors };
}

/** Validate a single field: runs the whole schema and returns that field's error, if any. */
export function validateField(
  schema: ZodType<any, any, any>,
  values: Record<string, unknown>,
  name: string,
): string | undefined {
  return validateWithSchema(schema, values).errors[name];
}
