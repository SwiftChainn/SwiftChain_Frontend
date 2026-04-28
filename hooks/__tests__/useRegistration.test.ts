import { renderHook, act } from '@testing-library/react';
import { useRegistration } from '@/hooks/useRegistration';
import * as registrationService from '@/services/registrationService';
import { useRegistrationStore } from '@/store/registrationStore';

// Mock the services
jest.mock('@/services/registrationService');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('useRegistration Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store
    const store = useRegistrationStore.getState();
    store.reset();
  });

  test('should initialize with default values', () => {
    const { result } = renderHook(() => useRegistration());

    expect(result.current.errors).toEqual({});
  });

  test('should handle role selection', () => {
    const { result } = renderHook(() => useRegistration());

    act(() => {
      result.current.handleRoleSelect('driver');
    });

    const state = useRegistrationStore.getState();
    expect(state.role).toBe('driver');
    expect(state.currentStep).toBe(2);
  });

  test('should validate email format', async () => {
    const { result } = renderHook(() => useRegistration());

    act(() => {
      result.current.handleRoleSelect('customer');
    });

    const success = await act(async () => {
      return await result.current.handlePersonalDetailsSubmit({
        email: 'invalid-email',
        password: 'ValidPass123',
        confirmPassword: 'ValidPass123',
        fullName: 'John Doe',
        phone: '1234567890',
      });
    });

    expect(success).toBe(false);
    expect(result.current.errors.email).toBeDefined();
  });

  test('should validate password strength', async () => {
    const { result } = renderHook(() => useRegistration());

    act(() => {
      result.current.handleRoleSelect('customer');
    });

    const success = await act(async () => {
      return await result.current.handlePersonalDetailsSubmit({
        email: 'test@example.com',
        password: 'weakpass',
        confirmPassword: 'weakpass',
        fullName: 'John Doe',
        phone: '1234567890',
      });
    });

    expect(success).toBe(false);
    expect(result.current.errors.password).toBeDefined();
  });

  test('should validate password confirmation', async () => {
    const { result } = renderHook(() => useRegistration());

    act(() => {
      result.current.handleRoleSelect('customer');
    });

    const success = await act(async () => {
      return await result.current.handlePersonalDetailsSubmit({
        email: 'test@example.com',
        password: 'ValidPass123',
        confirmPassword: 'DifferentPass123',
        fullName: 'John Doe',
        phone: '1234567890',
      });
    });

    expect(success).toBe(false);
    expect(result.current.errors.confirmPassword).toBeDefined();
  });

  test('should accept valid personal details for customer', async () => {
    const { result } = renderHook(() => useRegistration());

    act(() => {
      result.current.handleRoleSelect('customer');
    });

    const mockRegister = jest.fn().mockResolvedValue({
      success: true,
      data: { id: 'user_123', email: 'test@example.com', role: 'customer', status: 'active' },
    });
    (registrationService.registrationService.register as jest.Mock) = mockRegister;

    const success = await act(async () => {
      return await result.current.handlePersonalDetailsSubmit({
        email: 'test@example.com',
        password: 'ValidPass123',
        confirmPassword: 'ValidPass123',
        fullName: 'John Doe',
        phone: '1234567890',
      });
    });

    expect(success).toBe(true);
  });

  test('should validate driver license details', async () => {
    const { result } = renderHook(() => useRegistration());

    act(() => {
      result.current.handleRoleSelect('driver');
    });

    const success = await act(async () => {
      return await result.current.handleDriverDetailsSubmit({
        licenseExpiry: '',
        vehicleType: '',
        vehicleRegistration: '',
        vehicleModel: '',
      });
    });

    expect(success).toBe(false);
    expect(result.current.errors.licenseExpiry).toBeDefined();
    expect(result.current.errors.vehicleType).toBeDefined();
  });

  test('should handle registration error', async () => {
    const { result } = renderHook(() => useRegistration());

    act(() => {
      result.current.handleRoleSelect('customer');
    });

    const mockError = {
      response: { data: { message: 'Email already exists' } },
    };
    (registrationService.registrationService.register as jest.Mock).mockRejectedValue(
      mockError
    );

    await act(async () => {
      await result.current.handleFinalSubmit();
    });

    expect(result.current.errors.form).toBeDefined();
  });
});
