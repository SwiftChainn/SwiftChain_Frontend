import { act, renderHook } from '@testing-library/react';
import type { FormEvent } from 'react';
import { z } from 'zod';
import { useFormValidation } from '../useFormValidation';

const submitEvent = () => ({ preventDefault: jest.fn() }) as unknown as FormEvent;
const full = { username: 'u', email: 'e', password: 'p', role: 'r', bio: 'b' };

describe('useFormValidation', () => {
  it('blocks submit and reports required errors with the default schema', async () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() => useFormValidation({ onSubmit }));
    await act(async () => result.current.handleSubmit(submitEvent()));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.username).toBe('Username is required');
    expect(Object.keys(result.current.errors)).toHaveLength(5);
  });

  it('submits valid values and clears errors', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFormValidation({ onSubmit }));
    act(() => Object.entries(full).forEach(([k, v]) => result.current.setFieldValue(k, v)));
    await act(async () => result.current.handleSubmit(submitEvent()));
    expect(onSubmit).toHaveBeenCalledWith(full);
    expect(result.current.errors).toEqual({});
  });

  it('validates on blur and clears the error once fixed', async () => {
    const { result } = renderHook(() => useFormValidation({ onSubmit: jest.fn() }));
    await act(async () => result.current.handleBlur('email'));
    expect(result.current.errors.email).toBe('Email is required');
    act(() => result.current.handleChange('email', 'a@b.co'));
    expect(result.current.errors.email).toBeUndefined();
  });

  it('accepts a custom schema', async () => {
    const schema = z.object({ email: z.string().email('bad email') });
    const onSubmit = jest.fn();
    const { result } = renderHook(() => useFormValidation({ schema, onSubmit }));
    act(() => result.current.setFieldValue('email', 'nope'));
    await act(async () => result.current.handleSubmit(submitEvent()));
    expect(result.current.errors).toEqual({ email: 'bad email' });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
