import { act, renderHook } from '@testing-library/react';
import { useTheme } from '@/hooks/useTheme';
import { themeService } from '@/services/themeService';

const mockSetTheme = jest.fn();
const mockUseNextTheme = jest.fn();

jest.mock('next-themes', () => ({
  useTheme: () => mockUseNextTheme(),
}));

jest.mock('@/services/themeService', () => ({
  themeService: {
    getThemePreference: jest.fn(),
    saveThemePreference: jest.fn(),
  },
}));

describe('useTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNextTheme.mockReturnValue({
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: mockSetTheme,
    });

    (themeService.getThemePreference as jest.Mock).mockResolvedValue({
      theme: 'system',
    });
    (themeService.saveThemePreference as jest.Mock).mockResolvedValue({
      theme: 'light',
    });
  });

  it('should toggle from light to dark and persist preference', async () => {
    const { result } = renderHook(() => useTheme());

    await act(async () => {
      await result.current.toggleTheme();
    });

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
    expect(themeService.saveThemePreference).toHaveBeenCalledWith('dark');
  });

  it('should toggle from dark to light and persist preference', async () => {
    mockUseNextTheme.mockReturnValue({
      theme: 'system',
      resolvedTheme: 'dark',
      setTheme: mockSetTheme,
    });

    const { result } = renderHook(() => useTheme());

    await act(async () => {
      await result.current.toggleTheme();
    });

    expect(mockSetTheme).toHaveBeenCalledWith('light');
    expect(themeService.saveThemePreference).toHaveBeenCalledWith('light');
  });

  it('should not throw when persistence fails', async () => {
    (themeService.saveThemePreference as jest.Mock).mockRejectedValueOnce(
      new Error('Persistence failed')
    );

    const { result } = renderHook(() => useTheme());

    await expect(
      act(async () => {
        await result.current.toggleTheme();
      })
    ).resolves.toBeUndefined();

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });
});
