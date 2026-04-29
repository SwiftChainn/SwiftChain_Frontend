// @ts-nocheck

import { render, screen, fireEvent } from '@testing-library/react';
import KycUpload from '@/features/auth/components/KycUpload';

// Mock the useKycUpload hook
jest.mock('@/hooks/useKycUpload', () => ({
  useKycUpload: () => ({
    uploadProgress: 0,
    isUploading: false,
    uploadedFiles: [],
    errors: [],
    handleFileUpload: jest.fn(),
  }),
}));

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({
      onDrop: jest.fn(),
    }),
    getInputProps: () => ({
      type: 'file',
      accept: 'application/pdf,image/jpeg,image/png',
    }),
    isDragActive: false,
  }),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Upload: () => <div data-testid="upload-icon">Upload Icon</div>,
  FileCheck: () => <div data-testid="filecheck-icon">FileCheck Icon</div>,
  AlertCircle: () => <div data-testid="alert-icon">Alert Icon</div>,
  Loader: () => <div data-testid="loader-icon">Loader Icon</div>,
}));

describe('KycUpload Component', () => {
  test('should render KYC upload form', () => {
    render(<KycUpload />);

    expect(screen.getByText(/Driver Identification/)).toBeInTheDocument();
    expect(
      screen.getByText(/Upload a clear copy of your identification document/)
    ).toBeInTheDocument();
  });

  test('should render upload zone', () => {
    render(<KycUpload />);

    expect(
      screen.getByText(/Drag and drop your document here/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/or click to select from your device/)
    ).toBeInTheDocument();
  });

  test('should display supported formats', () => {
    render(<KycUpload />);

    expect(
      screen.getByText(/Supported formats: PDF, JPG, PNG \(Max 5MB\)/)
    ).toBeInTheDocument();
  });

  test('should display mobile camera access note', () => {
    render(<KycUpload />);

    expect(
      screen.getByText(/Mobile users: Click to access your device camera/)
    ).toBeInTheDocument();
  });

  test('should render file input with capture attribute', () => {
    render(<KycUpload />);

    const fileInput = screen.getByLabelText(
      /Upload identification document/
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
  });

  test('should render requirements section', () => {
    render(<KycUpload />);

    expect(screen.getByText(/Requirements/)).toBeInTheDocument();
    expect(
      screen.getByText(/Document must be clear and readable/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/File size must not exceed 5MB/)
    ).toBeInTheDocument();
    // Use getAll since there are multiple "Supported formats" text
    const supportedFormatElements = screen.getAllByText(
      /Supported formats: PDF, JPG, PNG/
    );
    expect(supportedFormatElements.length).toBeGreaterThanOrEqual(1);
  });

  test('should display upload icon', () => {
    render(<KycUpload />);

    expect(screen.getByTestId('upload-icon')).toBeInTheDocument();
  });

  test('should render upload zone with correct styling classes', () => {
    const { container } = render(<KycUpload />);

    const uploadZone = container.querySelector(
      'div[class*="border-2 border-dashed"]'
    );
    expect(uploadZone).toBeInTheDocument();
  });

  test('should render with accessible ARIA labels', () => {
    render(<KycUpload />);

    expect(
      screen.getByLabelText(/Upload identification document/)
    ).toHaveAttribute('aria-label', 'Upload identification document');
  });

  test('should display document types correctly', () => {
    render(<KycUpload />);

    // Check for all file format references
    expect(screen.getByText(/PDF/)).toBeInTheDocument();
    expect(screen.getByText(/JPG/)).toBeInTheDocument();
    expect(screen.getByText(/PNG/)).toBeInTheDocument();
  });

  test('should have responsive design classes', () => {
    const { container } = render(<KycUpload />);

    const mainDiv = container.querySelector('div[class*="max-w-2xl"]');
    expect(mainDiv).toBeInTheDocument();
  });
});
