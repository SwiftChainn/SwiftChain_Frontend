import { kycService, ApiResponse, KycDocument } from '@/services/kycService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('kycService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    test('should successfully upload document', async () => {
      const mockFormData = new FormData();
      mockFormData.append('document', new File(['test'], 'test.pdf'));

      const mockResponse: ApiResponse<KycDocument> = {
        success: true,
        message: 'Document uploaded successfully',
        data: {
          id: 'doc_123',
          filename: 'test.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          uploadedAt: new Date().toISOString(),
          status: 'pending',
        },
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await kycService.uploadDocument(mockFormData);

      expect(result.success).toBe(true);
      expect(result.data?.filename).toBe('test.pdf');
      expect(result.data?.status).toBe('pending');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/kyc/upload'),
        mockFormData,
        expect.any(Object)
      );
    });

    test('should handle upload error', async () => {
      const mockFormData = new FormData();
      const mockError = {
        response: {
          data: {
            success: false,
            message: 'File too large',
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      try {
        await kycService.uploadDocument(mockFormData);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.data.message).toBe('File too large');
      }
    });

    test('should track upload progress', async () => {
      const mockFormData = new FormData();
      const mockProgress = jest.fn();

      const mockResponse: ApiResponse<KycDocument> = {
        success: true,
        message: 'Document uploaded successfully',
        data: {
          id: 'doc_123',
          filename: 'test.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          uploadedAt: new Date().toISOString(),
          status: 'pending',
        },
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      await kycService.uploadDocument(mockFormData, mockProgress);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/kyc/upload'),
        mockFormData,
        expect.objectContaining({
          onUploadProgress: mockProgress,
        })
      );
    });
  });

  describe('getDocumentStatus', () => {
    test('should retrieve document status', async () => {
      const mockResponse: ApiResponse<KycDocument> = {
        success: true,
        message: 'Document found',
        data: {
          id: 'doc_123',
          filename: 'test.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          uploadedAt: new Date().toISOString(),
          status: 'verified',
        },
      };

      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await kycService.getDocumentStatus('doc_123');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('verified');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/kyc/documents/doc_123')
      );
    });
  });

  describe('getDocuments', () => {
    test('should retrieve all documents', async () => {
      const mockResponse: ApiResponse<KycDocument[]> = {
        success: true,
        message: 'Documents retrieved',
        data: [
          {
            id: 'doc_123',
            filename: 'test.pdf',
            fileType: 'application/pdf',
            fileSize: 1024,
            uploadedAt: new Date().toISOString(),
            status: 'verified',
          },
        ],
      };

      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await kycService.getDocuments();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/kyc/documents')
      );
    });
  });

  describe('deleteDocument', () => {
    test('should delete document', async () => {
      const mockResponse: ApiResponse<null> = {
        success: true,
        message: 'Document deleted successfully',
        data: null,
      };

      mockedAxios.delete.mockResolvedValue({ data: mockResponse });

      const result = await kycService.deleteDocument('doc_123');

      expect(result.success).toBe(true);
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/api/kyc/documents/doc_123')
      );
    });
  });

  describe('resubmitDocument', () => {
    test('should resubmit document after rejection', async () => {
      const mockFormData = new FormData();
      mockFormData.append('document', new File(['test'], 'test.pdf'));

      const mockResponse: ApiResponse<KycDocument> = {
        success: true,
        message: 'Document resubmitted successfully',
        data: {
          id: 'doc_123',
          filename: 'test.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          uploadedAt: new Date().toISOString(),
          status: 'pending',
        },
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await kycService.resubmitDocument('doc_123', mockFormData);

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/kyc/documents/doc_123/resubmit'),
        mockFormData,
        expect.any(Object)
      );
    });
  });
});
