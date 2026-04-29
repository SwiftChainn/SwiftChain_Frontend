'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileCheck, AlertCircle, Loader } from 'lucide-react';
import { useKycUpload } from '@/hooks/useKycUpload';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

export default function KycUpload() {
  const {
    uploadProgress,
    isUploading,
    uploadedFiles,
    errors,
    handleFileUpload,
  } = useKycUpload();
  const [localErrors, setLocalErrors] = useState<string[]>([]);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} exceeds 5MB limit`;
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name} must be PDF, JPG, or PNG`;
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `${file.name} has invalid extension`;
    }

    return null;
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setLocalErrors([]);
      const newErrors: string[] = [];

      // Validate all files first
      const filesToUpload: File[] = [];
      for (const file of acceptedFiles) {
        const error = validateFile(file);
        if (error) {
          newErrors.push(error);
        } else {
          filesToUpload.push(file);
        }
      }

      if (newErrors.length > 0) {
        setLocalErrors(newErrors);
        return;
      }

      // Upload valid files
      for (const file of filesToUpload) {
        await handleFileUpload(file);
      }
    },
    [validateFile, handleFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: MAX_FILE_SIZE,
    disabled: isUploading,
  });

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Driver Identification</h1>
        <p className="text-gray-600">
          Upload a clear copy of your identification document (PDF, JPG, or PNG)
        </p>
      </div>

      {/* Drag and Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition duration-200 ease-in-out mb-6
          ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          {...getInputProps()}
          capture="environment"
          disabled={isUploading}
          aria-label="Upload identification document"
        />

        <div className="flex flex-col items-center justify-center">
          <Upload className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-lg font-semibold text-gray-700 mb-2">
            {isDragActive
              ? 'Drop files here'
              : 'Drag and drop your document here'}
          </p>
          <p className="text-sm text-gray-600 mb-3">
            or click to select from your device
          </p>
          <p className="text-xs text-gray-500">
            Supported formats: PDF, JPG, PNG (Max 5MB)
          </p>

          {/* Mobile Camera Access Note */}
          <p className="text-xs text-blue-600 mt-3 font-semibold">
            Mobile users: Click to access your device camera
          </p>
        </div>
      </div>

      {/* Local Validation Errors */}
      {localErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900 mb-2">Upload failed</h3>
              <ul className="space-y-1">
                {localErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* API Errors */}
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900 mb-2">Upload error</h3>
              <ul className="space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && uploadProgress > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Loader className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="font-semibold text-blue-900">
              Uploading... {uploadProgress}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Uploaded Files
          </h2>
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <FileCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-grow">
                <p className="font-semibold text-green-900">{file.filename}</p>
                <p className="text-sm text-green-700">
                  {(file.fileSize / 1024).toFixed(2)} KB
                </p>
              </div>
              {file.status === 'completed' && (
                <span className="px-3 py-1 bg-green-600 text-white text-xs rounded-full font-semibold">
                  Verified
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Requirements Info */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">Requirements</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✓ Document must be clear and readable</li>
          <li>✓ File size must not exceed 5MB</li>
          <li>✓ Supported formats: PDF, JPG, PNG</li>
          <li>✓ All four corners of document must be visible</li>
          <li>✓ No blurry or poorly lit photos</li>
        </ul>
      </div>
    </div>
  );
}
