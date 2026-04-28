import { authService, ApiResponse, LoginResponse } from '@/services/authService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    test('should successfully login with valid credentials', async () => {
      const mockResponse: ApiResponse<LoginResponse> = {
        success: true,
        message: 'Login successful',
        data: {
          token: 'mock-jwt-token',
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'customer',
          },
        },
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await authService.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data?.token).toBe('mock-jwt-token');
      expect(result.data?.user.email).toBe('test@example.com');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        {
          email: 'test@example.com',
          password: 'password123',
        }
      );
    });

    test('should handle login error', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            message: 'Invalid credentials',
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      try {
        await authService.login('test@example.com', 'wrongpassword');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.data.message).toBe('Invalid credentials');
      }
    });

    test('should call correct API endpoint', async () => {
      const mockResponse: ApiResponse<LoginResponse> = {
        success: true,
        message: 'Login successful',
        data: {
          token: 'mock-token',
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'customer',
          },
        },
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      await authService.login('test@example.com', 'password123');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.any(Object)
      );
    });
  });

  describe('logout', () => {
    test('should successfully logout', async () => {
      const mockResponse: ApiResponse<null> = {
        success: true,
        message: 'Logout successful',
        data: null,
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await authService.logout();

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/api/auth/logout'));
    });
  });

  describe('requestPasswordReset', () => {
    test('should request password reset', async () => {
      const mockResponse: ApiResponse<null> = {
        success: true,
        message: 'Password reset email sent',
        data: null,
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await authService.requestPasswordReset('test@example.com');

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/forgot-password'),
        { email: 'test@example.com' }
      );
    });
  });

  describe('resetPassword', () => {
    test('should reset password with valid token', async () => {
      const mockResponse: ApiResponse<null> = {
        success: true,
        message: 'Password reset successful',
        data: null,
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await authService.resetPassword('reset-token', 'newpassword123');

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/reset-password'),
        { token: 'reset-token', newPassword: 'newpassword123' }
      );
    });
  });

  describe('getCurrentUser', () => {
    test('should get current authenticated user', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer' as const,
      };

      const mockResponse: ApiResponse<typeof mockUser> = {
        success: true,
        message: 'User retrieved',
        data: mockUser,
      };

      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('test@example.com');
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/api/auth/me'));
    });
  });
});
