const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

export const env = Object.freeze({
  apiUrl: trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL ?? ''),
  websocketUrl: trimTrailingSlash(
    process.env.NEXT_PUBLIC_WS_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '',
  ),
  stellarNetwork: process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet',
  nodeEnv: process.env.NODE_ENV ?? 'development',
});

export type RuntimeEnvironment = typeof env;
