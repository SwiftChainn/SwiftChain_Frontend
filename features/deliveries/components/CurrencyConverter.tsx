'use client';

import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';

const SUPPORTED_FIAT_CODES = ['USD', 'EUR', 'NGN', 'KES', 'GHS'] as const;

export function CurrencyConverter() {
  const {
    fiatCode,
    setFiatCode,
    fiatAmount,
    setFiatAmount,
    rate,
    lastUpdated,
    xlmEstimate,
    isLoading,
    isError,
    refetch,
  } = useCurrencyConverter();

  return (
    <section className="mt-6 rounded-lg border border-secondary/30 p-4">
      <h2 className="text-lg font-semibold">
        Cross-Border Fiat-to-XLM Preview
      </h2>
      <p className="mt-1 text-sm text-secondary">
        Enter your local amount to estimate the equivalent XLM in real time.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span>Local currency</span>
          <select
            value={fiatCode}
            onChange={(event) => setFiatCode(event.target.value)}
            className="rounded-md border border-secondary/40 bg-transparent px-3 py-2"
          >
            {SUPPORTED_FIAT_CODES.map((code) => (
              <option key={code} value={code} className="text-black">
                {code}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>Amount ({fiatCode})</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={fiatAmount}
            onChange={(event) => setFiatAmount(event.target.value)}
            className="rounded-md border border-secondary/40 bg-transparent px-3 py-2"
            placeholder={`Enter amount in ${fiatCode}`}
          />
        </label>
      </div>

      <div className="mt-4 rounded-md bg-secondary/10 p-3 text-sm">
        {isLoading && <p>Loading current exchange rate...</p>}

        {!isLoading && isError && (
          <div className="space-y-2">
            <p className="text-red-600 dark:text-red-400">
              Rate unavailable, try again.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded border border-secondary/40 px-2 py-1 text-xs"
            >
              Retry rate lookup
            </button>
          </div>
        )}

        {!isLoading && !isError && xlmEstimate !== null && (
          <div className="space-y-1">
            <p>
              Estimated total: <strong>{xlmEstimate.toFixed(6)} XLM</strong>
            </p>
            <p className="text-xs text-secondary">
              Live rate: 1 XLM = {rate?.toFixed(6)} {fiatCode}
            </p>
            {lastUpdated && (
              <p className="text-xs text-secondary">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
