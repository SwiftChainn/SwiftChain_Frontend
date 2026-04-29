import { registrationService, ApiResponse, RegistrationResponse } from '@/services/registrationService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('registrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    test('should successfully register a customer', async () => {
      const mockResponse: ApiResponse<RegistrationResponse> = {
        success: true,
        message: 'Registration successful',
        data: {
          id: 'user_123',
          email: 'test@example.com',
          role: 'customer',
          status: 'active',
        },
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await registrationService.register({
        role: 'customer',
        email: 'test@example.com',
        password: 'ValidPass123',
        fullName: 'John Doe',
        phone: '1234567890',
      });

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('test@example.com');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/register'),
        expect.any(Object)
      );
    });

    test('should successfully register a driver with vehicle details', async () => {
      const mockResponse: ApiResponse<RegistrationResponse> = {
        success: true,
        message: 'Registration successful',
        data: {
          id: 'driver_123',
          email: 'driver@example.com',
          role: 'driver',
          status: 'pending_verification',
        },
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await registrationService.register({
        role: 'driver',
        email: 'driver@example.com',
        password: 'ValidPass123',
        fullName: 'Jane Driver',
        phone: '0987654321',
        licenseNumber: 'DL123456',
        licenseExpiry: '2025-12-31',
        vehicleType: 'car',
        vehicleRegistration: 'ABC-1234',
        vehicleModel: 'Toyota Corolla',
      });

      expect(result.success).toBe(true);
      expect(result.data?.role).toBe('driver');
    });

    test('should handle registration error', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            message: 'Email already exists',
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      try {
        await registrationService.register({
          role: 'customer',
          email: 'existing@example.com',
          password: 'ValidPass123',
          fullName: 'John Doe',
          phone: '1234567890',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.data.message).toBe('Email already exists');
      }
    });
  });

  describe('validateEmailAvailability', () => {
    test('should check if email is available', async () => {
      const mockResponse: ApiResponse<{ available: boolean }> = {
        success: true,
        message: 'Email is available',
        data: { available: true },
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await registrationService.validateEmailAvailability('new@example.com');

      expect(result.data?.available).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/validate-email'),
        { email: 'new@example.com' }
      );
    });

    test('should return false for existing email', async () => {
      const mockResponse: ApiResponse<{ available: boolean }> = {
        success: true,
        message: 'Email is not available',
        data: { available: false },
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await registrationService.validateEmailAvailability(
        'existing@example.com'
      );

      expect(result.data?.available).toBe(false);
    });
  });

  describe('validateLicense', () => {
    test('should validate driver license', async () => {
      const mockResponse: ApiResponse<{ valid: boolean }> = {
        success: true,
        message: 'License is valid',
        data: { valid: true },
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await registrationService.validateLicense('DL123456');

      expect(result.data?.valid).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/validate-license'),
        { licenseNumber: 'DL123456' }
      );
    });
  });
});
