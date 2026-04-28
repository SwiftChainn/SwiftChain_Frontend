import axios from 'axios';
import { faqService } from '@/services/faqService';
import type { FaqResponse } from '@/services/faqService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockFaqData: FaqResponse = [
  {
    id: 'cat-1',
    category: 'Drivers',
    items: [
      { id: 'item-1', question: 'How do I sign up?', answer: 'Visit our signup page.' },
    ],
  },
  {
    id: 'cat-2',
    category: 'Payments',
    items: [
      { id: 'item-2', question: 'What payment methods are accepted?', answer: 'We accept crypto and cards.' },
    ],
  },
];

describe('faqService', () => {
  afterEach(() => jest.clearAllMocks());

  it('should call GET /api/faq and return the data', async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({ data: mockFaqData });
    const result = await faqService.getFaqs();
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/faq'),
    );
    expect(result).toEqual(mockFaqData);
  });

  it('should return an array of FaqCategory objects', async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({ data: mockFaqData });
    const result = await faqService.getFaqs();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('category');
    expect(result[0]).toHaveProperty('items');
  });

  it('should throw when the API call fails', async () => {
    mockedAxios.get = jest.fn().mockRejectedValue(new Error('Network Error'));
    await expect(faqService.getFaqs()).rejects.toThrow('Network Error');
  });
});