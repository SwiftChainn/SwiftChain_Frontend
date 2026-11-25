const requestUse = jest.fn();
const responseUse = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: requestUse },
      response: { use: responseUse },
    },
  },
}));

import httpClient, { AUTH_REQUIRED_EVENT } from '@/lib/httpClient';

describe('httpClient', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('configures the shared Axios client and installs both interceptors', () => {
    expect(httpClient.defaults.headers.common['Content-Type']).toBe('application/json');
    expect(requestUse).toHaveBeenCalledTimes(1);
    expect(responseUse).toHaveBeenCalledTimes(1);
  });

  it('adds the stored auth token to requests', () => {
    localStorage.setItem('authToken', 'token-123');
    const requestInterceptor = requestUse.mock.calls[0][0] as (config: {
      headers: Record<string, string>;
    }) => { headers: Record<string, string> };

    const config = requestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer token-123');
  });

  it('removes the token and emits an auth event on 401', async () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    const responseInterceptor = responseUse.mock.calls[0][1] as (
      error: { response: { status: number } },
    ) => Promise<never>;
    const error = { response: { status: 401 } };

    localStorage.setItem('authToken', 'expired-token');

    await expect(responseInterceptor(error)).rejects.toBe(error);

    expect(localStorage.getItem('authToken')).toBeNull();
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: AUTH_REQUIRED_EVENT,
        detail: { status: 401 },
      }),
    );

    dispatchSpy.mockRestore();
  });
});
