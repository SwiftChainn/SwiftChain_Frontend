import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useLogin } from '@/hooks/useLogin';
import { renderHook, act } from '@testing-library/react';
import * as authService from '@/services/authService';

// Mock the authService
jest.mock('@/services/authService');

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('useLogin Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with empty email and password', () => {
    const { result } = renderHook(() => useLogin());

    expect(result.current.values.email).toBe('');
    expect(result.current.values.password).toBe('');
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });

  test('should update email value on handleChange', () => {
    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.handleChange('email', 'test@example.com');
    });

    expect(result.current.values.email).toBe('test@example.com');
  });

  test('should update password value on handleChange', () => {
    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.handleChange('password', 'password123');
    });

    expect(result.current.values.password).toBe('password123');
  });

  test('should validate empty email on blur', async () => {
    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.handleBlur('email');
    });

    expect(result.current.errors.email).toBe('Email is required');
  });

  test('should validate invalid email format on blur', async () => {
    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.handleChange('email', 'invalid-email');
    });

    await act(async () => {
      await result.current.handleBlur('email');
    });

    expect(result.current.errors.email).toBe('Please enter a valid email address');
  });

  test('should validate valid email on blur', async () => {
    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.handleChange('email', 'test@example.com');
    });

    await act(async () => {
      await result.current.handleBlur('email');
    });

    expect(result.current.errors.email).toBeUndefined();
  });

  test('should validate empty password on blur', async () => {
    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.handleBlur('password');
    });

    expect(result.current.errors.password).toBe('Password is required');
  });

  test('should clear errors when typing', () => {
    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.handleChange('email', '');
    });

    act(() => {
      result.current.handleChange('email', 'test@example.com');
    });

    expect(result.current.errors.email).toBeUndefined();
  });

  test('should reject submit with empty email and password', async () => {
    const { result } = renderHook(() => useLogin());

    const mockPreventDefault = jest.fn();
    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: mockPreventDefault,
      } as any);
    });

    expect(result.current.errors.email).toBe('Email is required');
    expect(result.current.errors.password).toBe('Password is required');
    expect(mockPreventDefault).toHaveBeenCalled();
  });

  test('should reject submit with invalid email', async () => {
    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.handleChange('email', 'invalid-email');
      result.current.handleChange('password', 'password123');
    });

    const mockPreventDefault = jest.fn();
    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: mockPreventDefault,
      } as any);
    });

    expect(result.current.errors.email).toBe('Please enter a valid email address');
  });

  test('should call authService.login with valid credentials', async () => {
    const mockLogin = jest.fn().mockResolvedValue({
      success: true,
      data: {
        token: 'mock-token',
        user: { id: '1', email: 'test@example.com', name: 'Test User', role: 'customer' },
      },
    });
    (authService.authService.login as jest.Mock) = mockLogin;

    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.handleChange('email', 'test@example.com');
      result.current.handleChange('password', 'password123');
    });

    const mockPreventDefault = jest.fn();
    const mockLocalStorage = { setItem: jest.fn() };
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
    });

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: mockPreventDefault,
      } as any);
    });

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  test('should handle login error gracefully', async () => {
    const mockLogin = jest.fn().mockRejectedValue({
      response: {
        data: { message: 'Invalid credentials' },
      },
    });
    (authService.authService.login as jest.Mock) = mockLogin;

    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.handleChange('email', 'test@example.com');
      result.current.handleChange('password', 'wrongpassword');
    });

    const mockPreventDefault = jest.fn();
    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: mockPreventDefault,
      } as any);
    });

    expect(result.current.errors.form).toBe('Invalid credentials');
  });
});
