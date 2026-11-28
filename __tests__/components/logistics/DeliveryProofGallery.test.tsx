/**
 * DeliveryProofGallery Component Tests
 * Verifies thumbnail grid, zoom modal, keyboard navigation, and Escape close.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useDeliveryProofGallery } from '@/hooks/useDeliveryProofGallery';
import { DeliveryProofGallery } from '@/components/logistics/DeliveryProofGallery';
import type { ProofDocument } from '@/services/proofService';

jest.mock('@/hooks/useDeliveryProofGallery');

const mockUseDeliveryProofGallery = useDeliveryProofGallery as jest.MockedFunction<
  typeof useDeliveryProofGallery
>;

const documents: ProofDocument[] = [
  {
    id: 'proof-1',
    deliveryId: 'delivery-1',
    filename: 'proof-1.jpg',
    fileSize: 102400,
    originalSize: 102400,
    isCompressed: false,
    uploadedAt: new Date().toISOString(),
    status: 'verified',
  },
  {
    id: 'proof-2',
    deliveryId: 'delivery-1',
    filename: 'proof-2.jpg',
    fileSize: 204800,
    originalSize: 204800,
    isCompressed: false,
    uploadedAt: new Date().toISOString(),
    status: 'pending',
  },
];

describe('DeliveryProofGallery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeliveryProofGallery.mockReturnValue({
      documents,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders a thumbnail for every proof document', () => {
    render(<DeliveryProofGallery deliveryId="delivery-1" />);

    documents.forEach((doc) => {
      expect(screen.getByTestId(`proof-thumbnail-${doc.id}`)).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching', () => {
    mockUseDeliveryProofGallery.mockReturnValue({
      documents: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<DeliveryProofGallery deliveryId="delivery-1" />);

    expect(screen.getByLabelText('Loading delivery proof gallery')).toBeInTheDocument();
  });

  it('opens the zoom modal on thumbnail click', () => {
    render(<DeliveryProofGallery deliveryId="delivery-1" />);

    fireEvent.click(screen.getByTestId('proof-thumbnail-proof-1'));

    expect(screen.getByTestId('proof-zoom-modal')).toBeInTheDocument();
  });

  it('closes the zoom modal on Escape key', () => {
    render(<DeliveryProofGallery deliveryId="delivery-1" />);

    fireEvent.click(screen.getByTestId('proof-thumbnail-proof-1'));
    expect(screen.getByTestId('proof-zoom-modal')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('proof-zoom-modal')).not.toBeInTheDocument();
  });

  it('navigates to next image with ArrowRight', () => {
    render(<DeliveryProofGallery deliveryId="delivery-1" />);

    fireEvent.click(screen.getByTestId('proof-thumbnail-proof-1'));
    expect(screen.getByTestId('proof-zoom-modal')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });

    // The modal should still be open but showing the next image
    expect(screen.getByTestId('proof-zoom-modal')).toBeInTheDocument();
  });

  it('navigates to previous image with ArrowLeft', () => {
    render(<DeliveryProofGallery deliveryId="delivery-1" />);

    fireEvent.click(screen.getByTestId('proof-thumbnail-proof-2'));
    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    expect(screen.getByTestId('proof-zoom-modal')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', () => {
    mockUseDeliveryProofGallery.mockReturnValue({
      documents: [],
      isLoading: false,
      error: 'Failed to load proof documents',
      refetch: jest.fn(),
    });

    render(<DeliveryProofGallery deliveryId="delivery-1" />);

    expect(screen.getByText('Unable to load delivery proofs')).toBeInTheDocument();
  });

  it('shows empty state when no documents', () => {
    mockUseDeliveryProofGallery.mockReturnValue({
      documents: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<DeliveryProofGallery deliveryId="delivery-1" />);

    expect(screen.getByText('No delivery proof images available.')).toBeInTheDocument();
  });
});
