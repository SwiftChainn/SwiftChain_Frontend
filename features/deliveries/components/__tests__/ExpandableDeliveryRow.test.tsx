import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpandableDeliveryRow } from '@/features/deliveries/components/ExpandableDeliveryRow';
import { Delivery } from '@/types/delivery';

// Mock delivery data for testing
const mockDelivery: Delivery = {
  id: 'delivery-123',
  trackingNumber: 'TRACK-001',
  senderId: 'sender-123',
  driverId: 'driver-456',
  driver: {
    id: 'driver-456',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    rating: 4.5,
  },
  status: 'IN_TRANSIT',
  origin: 'New York, NY',
  destination: 'Los Angeles, CA',
  escrowStatus: 'LOCKED',
  amount: 150.00,
  currency: 'USD',
  packageDescription: 'Fragile electronics',
  weight: 2.5,
  estimatedDeliveryTime: '2026-06-05T10:00:00Z',
  createdAt: '2026-05-28T08:00:00Z',
  updatedAt: '2026-05-28T14:00:00Z',
  completedAt: undefined,
};

const mockDeliveryNoPending: Delivery = {
  id: 'delivery-789',
  trackingNumber: 'TRACK-002',
  senderId: 'sender-456',
  status: 'PENDING',
  origin: 'Chicago, IL',
  destination: 'Houston, TX',
  escrowStatus: 'NOT_LOCKED',
  amount: 200.00,
  currency: 'USD',
  createdAt: '2026-05-28T09:00:00Z',
  updatedAt: '2026-05-28T09:00:00Z',
};

describe('ExpandableDeliveryRow', () => {
  const mockOnToggle = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render delivery tracking number', () => {
    render(
      <ExpandableDeliveryRow
        delivery={mockDelivery}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('TRACK-001')).toBeInTheDocument();
  });

  it('should render origin and destination', () => {
    render(
      <ExpandableDeliveryRow
        delivery={mockDelivery}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText(/New York, NY ➔ Los Angeles, CA/)).toBeInTheDocument();
  });

  it('should render delivery status badge', () => {
    render(
      <ExpandableDeliveryRow
        delivery={mockDelivery}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('IN_TRANSIT')).toBeInTheDocument();
  });

  it('should render escrow status badge', () => {
    render(
      <ExpandableDeliveryRow
        delivery={mockDelivery}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Escrow: LOCKED')).toBeInTheDocument();
  });

  it('should call onToggle when clicking the row', () => {
    render(
      <ExpandableDeliveryRow
        delivery={mockDelivery}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    const button = screen.getByRole('button', {
      name: /Toggle details for delivery/,
    });

    fireEvent.click(button);

    expect(mockOnToggle).toHaveBeenCalledWith('delivery-123');
    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it('should display driver information when expanded', () => {
    render(
      <ExpandableDeliveryRow
        delivery={mockDelivery}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Driver Details')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
  });

  it('should display "No driver assigned yet" when no driver', () => {
    render(
      <ExpandableDeliveryRow
        delivery={mockDeliveryNoPending}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('No driver assigned yet')).toBeInTheDocument();
  });

  it('should display payment and escrow information when expanded', () => {
    render(
      <ExpandableDeliveryRow
        delivery={mockDelivery}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Payment & Escrow')).toBeInTheDocument();
    expect(screen.getByText('LOCKED')).toBeInTheDocument();
    expect(screen.getByText('USD 150.00')).toBeInTheDocument();
  });

  it('should display package details when expanded', () => {
    render(
      <ExpandableDeliveryRow
        delivery={mockDelivery}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Package Details')).toBeInTheDocument();
    expect(screen.getByText('Fragile electronics')).toBeInTheDocument();
    expect(screen.getByText('2.5 kg')).toBeInTheDocument();
  });

  it('should display timeline information when expanded', () => {
    render(
      <ExpandableDeliveryRow
        delivery={mockDelivery}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Last Updated')).toBeInTheDocument();
  });

  it('should display location information when expanded', () => {
    render(
      <ExpandableDeliveryRow
        delivery={mockDelivery}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Locations')).toBeInTheDocument();
    expect(screen.getByText('Pickup Location')).toBeInTheDocument();
    expect(screen.getByText('Delivery Location')).toBeInTheDocument();
  });

  it('should not display driver information when collapsed', () => {
    render(
      <ExpandableDeliveryRow
        delivery={mockDelivery}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.queryByText('Driver Details')).not.toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('should toggle aria-expanded attribute correctly', () => {
    const { rerender } = render(
      <ExpandableDeliveryRow
        delivery={mockDelivery}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    let button = screen.getByRole('button', {
      name: /Toggle details for delivery/,
    });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    rerender(
      <ExpandableDeliveryRow
        delivery={mockDelivery}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    button = screen.getByRole('button', {
      name: /Toggle details for delivery/,
    });
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('should handle missing optional fields gracefully', () => {
    const deliveryWithMinimalData: Delivery = {
      id: 'delivery-999',
      trackingNumber: 'TRACK-003',
      senderId: 'sender-789',
      status: 'PENDING',
      origin: 'City A',
      destination: 'City B',
      escrowStatus: 'NOT_LOCKED',
      amount: 100,
      createdAt: '2026-05-28T10:00:00Z',
      updatedAt: '2026-05-28T10:00:00Z',
    };

    render(
      <ExpandableDeliveryRow
        delivery={deliveryWithMinimalData}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('City A')).toBeInTheDocument();
    expect(screen.getByText('City B')).toBeInTheDocument();
    expect(screen.getByText('TRACK-003')).toBeInTheDocument();
  });

  it('should display driver rating when available', () => {
    render(
      <ExpandableDeliveryRow
        delivery={mockDelivery}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText(/4\.5\/5/)).toBeInTheDocument();
  });
});
