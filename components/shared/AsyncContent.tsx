import type { ReactNode } from 'react';

interface AsyncContentProps {
  children: ReactNode;
  isLoading?: boolean;
  error?: Error | string | null;
  isEmpty?: boolean;
  loadingLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
}

export function AsyncContent({
  children,
  isLoading = false,
  error,
  isEmpty = false,
  loadingLabel = 'Loading content',
  emptyTitle = 'Nothing to show',
  emptyDescription,
  onRetry,
}: AsyncContentProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-gray-200 bg-white p-8 text-center text-sm text-gray-500" role="status" aria-live="polite">
        {loadingLabel}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-6 text-center" role="alert">
        <p className="font-medium text-red-800">Unable to load this content</p>
        <p className="mt-1 text-sm text-red-700">{typeof error === 'string' ? error : error.message}</p>
        {onRetry ? (
          <button type="button" onClick={onRetry} className="mt-4 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800">
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 bg-white p-8 text-center" role="status">
        <p className="font-medium text-gray-800">{emptyTitle}</p>
        {emptyDescription ? <p className="mt-1 text-sm text-gray-500">{emptyDescription}</p> : null}
      </div>
    );
  }

  return <>{children}</>;
}
