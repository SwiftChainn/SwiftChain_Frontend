import axios from 'axios';
import { contactService } from '@/services/contactService';
import type { ContactPayload, ContactResponse } from '@/services/contactService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPayload: ContactPayload = {
  subject: 'Test subject for support',
  category: 'technical',
  message: 'This is a test message with enough characters.',
  attachment: null,
  attachmentName: null,
};

const mockResponse: ContactResponse = {
  success: true,
  ticketId: 'TKT-001',
  message: 'Ticket submitted successfully',
};

describe('contactService', () => {
  afterEach(() => jest.clearAllMocks());

  it('should call POST /api/support/contact with the payload', async () => {
    mockedAxios.post = jest.fn().mockResolvedValue({ data: mockResponse });
    await contactService.submitTicket(mockPayload);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/support/contact'),
      mockPayload,
    );
  });

  it('should return the response data', async () => {
    mockedAxios.post = jest.fn().mockResolvedValue({ data: mockResponse });
    const result = await contactService.submitTicket(mockPayload);
    expect(result.success).toBe(true);
    expect(result.ticketId).toBe('TKT-001');
  });

  it('should throw when the API call fails', async () => {
    mockedAxios.post = jest.fn().mockRejectedValue(new Error('Network Error'));
    await expect(contactService.submitTicket(mockPayload)).rejects.toThrow(
      'Network Error',
    );
  });
});