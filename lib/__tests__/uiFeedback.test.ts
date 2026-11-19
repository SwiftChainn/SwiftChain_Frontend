import { confirmAction, notify } from '../uiFeedback';
import { toastService } from '../toast';
import { modalService } from '@/services/modalService';
import { ApiError } from '../apiResponse';

beforeEach(() => {
  jest.restoreAllMocks();
  modalService.closeAll();
});

describe('notify', () => {
  it('delegates to toastService', () => {
    const success = jest.spyOn(toastService, 'success').mockImplementation();
    notify.success('Saved', 'ok');
    expect(success).toHaveBeenCalledWith('Saved', 'ok', undefined);
  });

  it('apiError shows a normalised message and returns the ApiError', () => {
    const error = jest.spyOn(toastService, 'error').mockImplementation();
    const result = notify.apiError(
      new ApiError('Not allowed', { code: 'FORBIDDEN' }),
      'Save failed',
    );
    expect(error).toHaveBeenCalledWith('Save failed', 'Not allowed');
    expect(result.code).toBe('FORBIDDEN');
  });

  it('promise shows loading then success and returns the value', async () => {
    const loading = jest.spyOn(toastService, 'loading').mockImplementation();
    const success = jest.spyOn(toastService, 'success').mockImplementation();
    await expect(
      notify.promise(Promise.resolve(2), { loading: 'Working', success: (n) => `Got ${n}` }),
    ).resolves.toBe(2);
    expect(loading).toHaveBeenCalledWith('Working');
    expect(success).toHaveBeenCalledWith('Got 2');
  });

  it('promise shows an error toast and re-throws', async () => {
    const error = jest.spyOn(toastService, 'error').mockImplementation();
    jest.spyOn(toastService, 'loading').mockImplementation();
    await expect(
      notify.promise(Promise.reject(new Error('bad')), {
        loading: 'Working',
        success: 'Done',
        error: 'Failed',
      }),
    ).rejects.toThrow('bad');
    expect(error).toHaveBeenCalledWith('Failed', 'bad');
  });
});

describe('confirmAction', () => {
  it('resolves true on confirm and closes the modal', async () => {
    const pending = confirmAction({ title: 'Sure?', message: 'msg' });
    const config = modalService.getCurrentModal()!;
    expect(config.title).toBe('Sure?');
    expect(config.confirmLabel).toBe('Confirm');
    await config.onConfirm?.();
    await expect(pending).resolves.toBe(true);
    expect(modalService.isOpen()).toBe(false);
  });

  it('resolves false when dismissed', async () => {
    const pending = confirmAction({ title: 'Sure?' });
    modalService.close();
    await expect(pending).resolves.toBe(false);
  });

  it('settles only once and uses unique ids', async () => {
    const first = confirmAction({ title: 'A' });
    const idA = modalService.getCurrentModal()!.id;
    await modalService.getCurrentModal()!.onConfirm?.();
    await expect(first).resolves.toBe(true);
    confirmAction({ title: 'B' });
    expect(modalService.getCurrentModal()!.id).not.toBe(idA);
  });
});
