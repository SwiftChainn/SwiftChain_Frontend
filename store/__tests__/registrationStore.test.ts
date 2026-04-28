import { renderHook, act } from '@testing-library/react';
import { useRegistrationStore } from '@/store/registrationStore';

describe('useRegistrationStore', () => {
  beforeEach(() => {
    const store = useRegistrationStore.getState();
    store.reset();
  });

  test('should initialize with default state', () => {
    const store = useRegistrationStore.getState();

    expect(store.role).toBeNull();
    expect(store.currentStep).toBe(1);
    expect(store.isSubmitting).toBe(false);
    expect(store.email).toBe('');
    expect(store.password).toBe('');
  });

  test('should set role and move to step 2', () => {
    const store = useRegistrationStore.getState();

    act(() => {
      store.setRole('driver');
    });

    expect(store.role).toBe('driver');
    expect(store.currentStep).toBe(2);
  });

  test('should set personal details', () => {
    const store = useRegistrationStore.getState();

    const details = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'John Doe',
    };

    act(() => {
      store.setPersonalDetails(details);
    });

    expect(store.email).toBe('test@example.com');
    expect(store.password).toBe('password123');
    expect(store.fullName).toBe('John Doe');
  });

  test('should set driver details', () => {
    const store = useRegistrationStore.getState();

    const details = {
      licenseNumber: 'DL123456',
      vehicleType: 'car',
      vehicleRegistration: 'ABC123',
    };

    act(() => {
      store.setDriverDetails(details);
    });

    expect(store.licenseNumber).toBe('DL123456');
    expect(store.vehicleType).toBe('car');
    expect(store.vehicleRegistration).toBe('ABC123');
  });

  test('should move to next step for driver', () => {
    const store = useRegistrationStore.getState();

    act(() => {
      store.setRole('driver');
    });

    act(() => {
      store.nextStep();
    });

    expect(store.currentStep).toBe(3);
  });

  test('should move to previous step', () => {
    const store = useRegistrationStore.getState();

    act(() => {
      store.setRole('driver');
    });

    act(() => {
      store.nextStep();
      store.nextStep();
    });

    act(() => {
      store.previousStep();
    });

    expect(store.currentStep).toBe(2);
  });

  test('should set specific step', () => {
    const store = useRegistrationStore.getState();

    act(() => {
      store.setStep(2);
    });

    expect(store.currentStep).toBe(2);
  });

  test('should set submitting state', () => {
    const store = useRegistrationStore.getState();

    act(() => {
      store.setIsSubmitting(true);
    });

    expect(store.isSubmitting).toBe(true);

    act(() => {
      store.setIsSubmitting(false);
    });

    expect(store.isSubmitting).toBe(false);
  });

  test('should reset to initial state', () => {
    const store = useRegistrationStore.getState();

    act(() => {
      store.setRole('driver');
      store.setPersonalDetails({
        email: 'test@example.com',
        fullName: 'John Doe',
      });
      store.setStep(3);
    });

    act(() => {
      store.reset();
    });

    expect(store.role).toBeNull();
    expect(store.currentStep).toBe(1);
    expect(store.email).toBe('');
    expect(store.fullName).toBe('');
  });

  test('should limit steps for non-driver roles', () => {
    const store = useRegistrationStore.getState();

    act(() => {
      store.setRole('customer');
    });

    act(() => {
      store.nextStep();
    });

    // Should not go beyond step 2 for customers
    expect(store.currentStep).toBe(2);
  });
});
