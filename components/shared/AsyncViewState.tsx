import { AlertCircle, Inbox, LoaderCircle, RefreshCw } from 'lucide-react';

interface AsyncViewStateProps {
  state: 'loading' | 'error' | 'empty';
  message?: string;
  onRetry?: () => void;
}

export function AsyncViewState({ state, message, onRetry }: AsyncViewStateProps) {
  const Icon = state === 'loading' ? LoaderCircle : state === 'error' ? AlertCircle : Inbox;
  const label = message ?? (state === 'loading' ? 'Loading…' : state === 'error' ? 'Unable to load data.' : 'Nothing to show yet.');
  return (
    <div role={state === 'error' ? 'alert' : 'status'} className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center text-slate-600 dark:text-slate-300">
      <Icon className={`h-6 w-6 ${state === 'loading' ? 'animate-spin' : ''}`} aria-hidden />
      <p>{label}</p>
      {onRetry && state === 'error' ? (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium">
          <RefreshCw className="h-4 w-4" aria-hidden /> Retry
        </button>
      ) : null}
    </div>
  );
}
