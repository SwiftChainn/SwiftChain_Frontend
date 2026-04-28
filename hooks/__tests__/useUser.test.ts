import { renderHook, act } from '@testing-library/react';
import { useUser } from '../useUser';
import { userService } from '@/services/userService';
import { toast } from 'sonner';

// Mock the userService and sonner
jest.mock('@/services/userService');
jest.mock('sonner');

describe('useUser Hook', () => {
  const mockProfile = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch profile on mount', async () => {
    (userService.getUserProfile as jest.Mock).mockResolvedValue({
      success: true,
      data: mockProfile,
    });

    const { result } = renderHook(() => useUser());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for the hook to finish fetching
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.isLoading).toBe(false);
    expect(userService.getUserProfile).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch profile error', async () => {
    (userService.getUserProfile as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useUser());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe('An error occurred while fetching profile');
    expect(result.current.isLoading).toBe(false);
  });

  it('should update profile successfully', async () => {
    (userService.getUserProfile as jest.Mock).mockResolvedValue({
      success: true,
      data: mockProfile,
    });
    
    (userService.updateProfile as jest.Mock).mockResolvedValue({
      success: true,
      data: { ...mockProfile, name: 'Jane Doe' },
    });

    const { result } = renderHook(() => useUser());

    await act(async () => {
      await result.current.updateProfile({ name: 'Jane Doe' });
    });

    expect(result.current.profile?.name).toBe('Jane Doe');
    expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
  });

  it('should change password successfully', async () => {
    (userService.changePassword as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Password changed',
    });

    const { result } = renderHook(() => useUser());

    let success;
    await act(async () => {
      success = await result.current.changePassword({
        currentPassword: 'old',
        newPassword: 'new',
        confirmPassword: 'new',
      });
    });

    expect(success).toBe(true);
    expect(toast.success).toHaveBeenCalledWith('Password changed successfully');
  });
});
