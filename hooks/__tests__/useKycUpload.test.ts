import { renderHook, act } from '@testing-library/react';
import { useKycUpload } from '@/hooks/useKycUpload';
import * as kycService from '@/services/kycService';

// Mock the kycService
jest.mock('@/services/kycService');

describe('useKycUpload Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with default values', () => {
    const { result } = renderHook(() => useKycUpload());

    expect(result.current.uploadProgress).toBe(0);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadedFiles).toEqual([]);
    expect(result.current.errors).toEqual([]);
  });

  test('should handle successful file upload', async () => {
    const mockFile = new File(['test'], 'test.pdf', {
      type: 'application/pdf',
    });

    const mockResponse = {
      success: true,
      data: {
        id: 'doc_123',
        filename: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 4,
        uploadedAt: new Date().toISOString(),
        status: 'pending' as const,
      },
    };

    (kycService.kycService.uploadDocument as jest.Mock).mockResolvedValue(
      mockResponse
    );

    const { result } = renderHook(() => useKycUpload());

    await act(async () => {
      await result.current.handleFileUpload(mockFile);
    });

    expect(result.current.uploadedFiles.length).toBe(1);
    expect(result.current.uploadedFiles[0].filename).toBe('test.pdf');
    expect(result.current.uploadedFiles[0].status).toBe('completed');
    expect(result.current.errors.length).toBe(0);
  });

  test('should handle upload error', async () => {
    const mockFile = new File(['test'], 'test.pdf', {
      type: 'application/pdf',
    });

    const mockError = {
      response: {
        data: { message: 'File too large' },
      },
    };

    (kycService.kycService.uploadDocument as jest.Mock).mockRejectedValue(
      mockError
    );

    const { result } = renderHook(() => useKycUpload());

    await act(async () => {
      await result.current.handleFileUpload(mockFile);
    });

    expect(result.current.errors.length).toBeGreaterThan(0);
    expect(result.current.errors[0]).toBe('File too large');
    expect(result.current.uploadedFiles[0].status).toBe('failed');
  });

  test('should track upload progress', async () => {
    const mockFile = new File(['test'], 'test.pdf', {
      type: 'application/pdf',
    });

    const mockResponse = {
      success: true,
      data: {
        id: 'doc_123',
        filename: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 4,
        uploadedAt: new Date().toISOString(),
        status: 'pending' as const,
      },
    };

    let progressCallback: any;
    (kycService.kycService.uploadDocument as jest.Mock).mockImplementation(
      (formData, onProgress) => {
        progressCallback = onProgress;
        return Promise.resolve(mockResponse);
      }
    );

    const { result } = renderHook(() => useKycUpload());

    await act(async () => {
      const uploadPromise = result.current.handleFileUpload(mockFile);

      // Simulate progress
      if (progressCallback) {
        progressCallback({ loaded: 50, total: 100 });
      }

      await uploadPromise;
    });

    expect(kycService.kycService.uploadDocument).toHaveBeenCalled();
  });

  test('should handle multiple file uploads', async () => {
    const mockFile1 = new File(['test1'], 'test1.pdf', {
      type: 'application/pdf',
    });
    const mockFile2 = new File(['test2'], 'test2.png', {
      type: 'image/png',
    });

    const mockResponse = {
      success: true,
      data: {
        id: 'doc_123',
        filename: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 4,
        uploadedAt: new Date().toISOString(),
        status: 'pending' as const,
      },
    };

    (kycService.kycService.uploadDocument as jest.Mock).mockResolvedValue(
      mockResponse
    );

    const { result } = renderHook(() => useKycUpload());

    await act(async () => {
      await result.current.handleFileUpload(mockFile1);
      await result.current.handleFileUpload(mockFile2);
    });

    expect(result.current.uploadedFiles.length).toBe(2);
  });

  test('should reset upload progress after completion', async () => {
    const mockFile = new File(['test'], 'test.pdf', {
      type: 'application/pdf',
    });

    const mockResponse = {
      success: true,
      data: {
        id: 'doc_123',
        filename: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 4,
        uploadedAt: new Date().toISOString(),
        status: 'pending' as const,
      },
    };

    (kycService.kycService.uploadDocument as jest.Mock).mockResolvedValue(
      mockResponse
    );

    const { result } = renderHook(() => useKycUpload());

    await act(async () => {
      await result.current.handleFileUpload(mockFile);
    });

    expect(result.current.uploadProgress).toBe(0);
    expect(result.current.isUploading).toBe(false);
  });
});
