/**
 * Standardised UI feedback: one entry point for toasts and confirm modals,
 * replacing ad hoc `toastService.*` / `modalService.open(...)` calls.
 *
 *   notify.success('Saved');
 *   notify.apiError(error);                       // maps any error via toApiError
 *   await notify.promise(save(), { loading, success, error });
 *   if (await confirmAction({ title: 'Cancel shipment?' })) { ... }
 */

import { toastService } from '@/lib/toast';
import { modalService } from '@/services/modalService';
import { toApiError, DEFAULT_ERROR_MESSAGE } from '@/lib/apiResponse';

export const notify = {
  success: (message: string, description?: string, duration?: number) =>
    toastService.success(message, description, duration),
  error: (message: string, description?: string, duration?: number) =>
    toastService.error(message, description, duration),
  info: (message: string, description?: string, duration?: number) =>
    toastService.info(message, description, duration),
  loading: (message: string, description?: string) => toastService.loading(message, description),

  /** Show a normalised error toast for anything thrown. Returns the `ApiError`. */
  apiError(error: unknown, title: string = DEFAULT_ERROR_MESSAGE) {
    const apiError = toApiError(error);
    // Use the title as headline only when the error message adds detail.
    if (apiError.message && apiError.message !== title) {
      toastService.error(title, apiError.message);
    } else {
      toastService.error(title);
    }
    return apiError;
  },

  /** Loading -> success/error toast flow around a promise. Re-throws on failure. */
  async promise<T>(
    promise: Promise<T>,
    messages: { loading: string; success: string | ((value: T) => string); error?: string },
  ): Promise<T> {
    toastService.loading(messages.loading);
    try {
      const value = await promise;
      toastService.success(
        typeof messages.success === 'function' ? messages.success(value) : messages.success,
      );
      return value;
    } catch (error) {
      notify.apiError(error, messages.error);
      throw error;
    }
  },
};

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}

let confirmCounter = 0;

/**
 * Open a confirmation modal and resolve `true` on confirm, `false` on
 * cancel/dismiss. Always settles exactly once.
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    modalService.open({
      id: `confirm-${++confirmCounter}`,
      title: options.title,
      content: options.message,
      size: options.size ?? 'sm',
      closeable: true,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      onConfirm: () => {
        settle(true);
        modalService.close();
      },
      onClose: () => settle(false),
    });
  });
}
