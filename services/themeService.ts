import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemePreferenceResponse {
  theme: ThemePreference;
}

/**
 * Handles theme preference API communication.
 * Hooks consume this service; UI components do not.
 */
export const themeService = {
  async getThemePreference(): Promise<ThemePreferenceResponse> {
    const { data } = await axios.get<ThemePreferenceResponse>(
      `${API_BASE_URL}/api/user/preferences/theme`
    );
    return data;
  },

  async saveThemePreference(
    theme: ThemePreference
  ): Promise<ThemePreferenceResponse> {
    const { data } = await axios.post<ThemePreferenceResponse>(
      `${API_BASE_URL}/api/user/preferences/theme`,
      { theme }
    );
    return data;
  },
};
