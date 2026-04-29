'use client';

import { useState, useCallback } from 'react';
import { kycService } from '@/services/kycService';

export interface UploadedFile {
  filename: string;
  fileSize: number;
  status: 'uploading' | 'completed' | 'failed';
  uploadedAt?: string;
}

interface UseKycUploadReturn {
  uploadProgress: number;
  isUploading: boolean;
  uploadedFiles: UploadedFile[];
  errors: string[];
  handleFileUpload: (file: File) => Promise<void>;
}

/**
 * useKycUpload — Custom hook for handling KYC file uploads.
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export function useKycUpload(): UseKycUploadReturn {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadProgress(0);
      setErrors([]);

      try {
        // Add file to uploaded files list with uploading status
        const uploadingFile: UploadedFile = {
          filename: file.name,
          fileSize: file.size,
          status: 'uploading',
        };

        setUploadedFiles((prev) => [...prev, uploadingFile]);

        // Create FormData for multipart upload
        const formData = new FormData();
        formData.append('document', file);
        formData.append('documentType', 'identification');

        // Upload file with progress tracking
        const response = await kycService.uploadDocument(
          formData,
          (progressEvent: any) => {
            const progress = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            );
            setUploadProgress(progress);
          }
        );

        if (response.success && response.data) {
          // Update uploaded file status
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.filename === file.name
                ? {
                    ...f,
                    status: 'completed',
                    uploadedAt: new Date().toISOString(),
                  }
                : f
            )
          );
        } else {
          throw new Error(response.message || 'Upload failed');
        }
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          'Failed to upload document';

        setErrors((prev) => [...prev, errorMessage]);

        // Update uploaded file status to failed
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.filename === file.name ? { ...f, status: 'failed' } : f
          )
        );
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    []
  );

  return {
    uploadProgress,
    isUploading,
    uploadedFiles,
    errors,
    handleFileUpload,
  };
}
