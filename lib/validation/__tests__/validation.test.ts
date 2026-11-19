import { z } from 'zod';
import {
  emailSchema,
  genericProfileFormSchema,
  loginFormSchema,
  passwordSchema,
  stellarAddressSchema,
  validateField,
  validateWithSchema,
} from '..';

const VALID_KEY = `G${'A'.repeat(55)}`;

describe('field schemas', () => {
  it('validates email', () => {
    expect(emailSchema.safeParse('a@b.co').success).toBe(true);
    expect(emailSchema.safeParse('  ').success).toBe(false);
    expect(emailSchema.safeParse('nope').success).toBe(false);
  });

  it('enforces password rules', () => {
    expect(passwordSchema.safeParse('abcdefg1').success).toBe(true);
    expect(passwordSchema.safeParse('short1').success).toBe(false);
    expect(passwordSchema.safeParse('onlyletters').success).toBe(false);
    expect(passwordSchema.safeParse('12345678').success).toBe(false);
  });

  it('validates Stellar public keys', () => {
    expect(stellarAddressSchema.safeParse(VALID_KEY).success).toBe(true);
    expect(stellarAddressSchema.safeParse(`S${'A'.repeat(55)}`).success).toBe(false);
    expect(stellarAddressSchema.safeParse('GABC').success).toBe(false);
  });
});

describe('validateWithSchema', () => {
  it('returns data on success', () => {
    const result = validateWithSchema(loginFormSchema, { email: 'a@b.co', password: 'x' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ email: 'a@b.co', password: 'x' });
  });

  it('returns first error per field keyed by path', () => {
    const result = validateWithSchema(loginFormSchema, { email: 'bad' });
    expect(result.success).toBe(false);
    expect(result.errors).toEqual({
      email: 'Enter a valid email address',
      password: 'Password is required',
    });
  });

  it('uses dotted paths for nested fields and _root for top-level issues', () => {
    const schema = z.object({ a: z.object({ b: z.string().min(2, 'too short') }) });
    expect(validateWithSchema(schema, { a: { b: 'x' } }).errors).toEqual({ 'a.b': 'too short' });
    expect(validateWithSchema(schema, 'str').errors).toHaveProperty('_root');
  });
});

describe('validateField / genericProfileFormSchema', () => {
  it('keeps the legacy "required" messages', () => {
    expect(validateField(genericProfileFormSchema, {}, 'username')).toBe('Username is required');
    expect(validateField(genericProfileFormSchema, { bio: '   ' }, 'bio')).toBe('Bio is required');
    expect(validateField(genericProfileFormSchema, { bio: 'hi' }, 'bio')).toBeUndefined();
  });
});
