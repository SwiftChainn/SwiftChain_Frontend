import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkflowCards } from '@/components/deliveries/WorkflowCards';
import { deliveryWorkflowService } from '@/services/deliveryWorkflowService';
import type { Delivery } from '@/types/delivery';

jest.mock('@/services/deliveryWorkflowService', () => ({
  deliveryWorkflowService: {
    getWorkflowCards: jest.fn(),
  },
}));

const mockedService = deliveryWorkflowService as jest.Mocked<typeof deliveryWorkflowService>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return Wrapper;
};

describe('WorkflowCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a landmark badge and address details when landmark data exists', async () => {
    const deliveries: Delivery[] = [
      {
        id: 'delivery-1',
        trackingNumber: 'TRACK-100',
        senderId: 'sender-1',
        status: 'IN_TRANSIT',
        origin: '123 Main St, Nairobi',
        destination: '456 River Rd, Mombasa',
        landmark: 'Near the central market',
        escrowStatus: 'LOCKED',
        amount: 120,
        currency: 'USD',
        createdAt: '2026-05-28T08:00:00Z',
        updatedAt: '2026-05-28T08:00:00Z',
      },
    ];

    mockedService.getWorkflowCards.mockResolvedValue(deliveries);

    render(<WorkflowCards />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Near the central market/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Landmark')).toBeInTheDocument();
    expect(screen.getByText('123 Main St, Nairobi')).toBeInTheDocument();

    // Landmark text is visually highlighted (italic) and wrapped so long
    // values cannot overflow the card on narrow screens.
    const landmarkText = screen.getByText(/Near the central market/i);
    expect(landmarkText).toHaveClass('italic', 'break-words');
    expect(screen.getByText('Landmark')).toHaveClass('rounded-full');
  });

  it('renders cards without crashing when landmark is null', async () => {
    const deliveries: Delivery[] = [
      {
        id: 'delivery-2',
        trackingNumber: 'TRACK-200',
        senderId: 'sender-2',
        status: 'PENDING',
        origin: '789 West St, Kisumu',
        destination: '101 East Ave, Nakuru',
        landmark: null,
        escrowStatus: 'NOT_LOCKED',
        amount: 80,
        currency: 'USD',
        createdAt: '2026-05-28T08:00:00Z',
        updatedAt: '2026-05-28T08:00:00Z',
      },
    ];

    mockedService.getWorkflowCards.mockResolvedValue(deliveries);

    render(<WorkflowCards />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('TRACK-200')).toBeInTheDocument();
    });

    expect(screen.getByText('789 West St, Kisumu')).toBeInTheDocument();
    expect(screen.getByText('101 East Ave, Nakuru')).toBeInTheDocument();

    // No landmark badge is rendered when the backend returns null, and the
    // address lines keep their overflow-safe wrapping.
    expect(screen.queryByText('Landmark')).not.toBeInTheDocument();
    expect(screen.getByText('789 West St, Kisumu')).toHaveClass('break-words');
  });

  it('renders cards without a landmark badge when landmark is blank', async () => {
    const deliveries: Delivery[] = [
      {
        id: 'delivery-3',
        trackingNumber: 'TRACK-300',
        senderId: 'sender-3',
        status: 'PENDING',
        origin: '202 North St, Eldoret',
        destination: '303 South Ave, Thika',
        landmark: '   ',
        escrowStatus: 'NOT_LOCKED',
        amount: 50,
        currency: 'USD',
        createdAt: '2026-05-28T08:00:00Z',
        updatedAt: '2026-05-28T08:00:00Z',
      },
    ];

    mockedService.getWorkflowCards.mockResolvedValue(deliveries);

    render(<WorkflowCards />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('TRACK-300')).toBeInTheDocument();
    });

    expect(screen.queryByText('Landmark')).not.toBeInTheDocument();
    expect(screen.getByText('202 North St, Eldoret')).toBeInTheDocument();
  });
});
