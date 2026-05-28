import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeliveryFilters } from '../components/DeliveryFilters';
import { useDeliveryFilters } from '../hooks/useDeliveryFilters';

// Mock the hook
jest.mock('../hooks/useDeliveryFilters', () => ({
  useDeliveryFilters: jest.fn(),
}));

describe('DeliveryFilters Component', () => {
  const mockUpdateFilters = jest.fn();
  const mockClearFilters = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDeliveryFilters as jest.Mock).mockReturnValue({
      search: undefined,
      status: undefined,
      sortBy: undefined,
      hasActiveFilters: false,
      updateFilters: mockUpdateFilters,
      clearFilters: mockClearFilters,
    });
  });

  it('should render filter component with all controls', () => {
    render(<DeliveryFilters />);

    expect(screen.getByPlaceholderText('Search by Tracking ID...')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
  });

  it('should update search on blur', async () => {
    render(<DeliveryFilters />);

    const searchInput = screen.getByPlaceholderText('Search by Tracking ID...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'TRK12345' } });
    fireEvent.blur(searchInput);

    await waitFor(() => {
      expect(mockUpdateFilters).toHaveBeenCalledWith({ search: 'TRK12345' });
    });
  });

  it('should update search on Enter key', async () => {
    render(<DeliveryFilters />);

    const searchInput = screen.getByPlaceholderText('Search by Tracking ID...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'TRK12345' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      expect(mockUpdateFilters).toHaveBeenCalledWith({ search: 'TRK12345' });
    });
  });

  it('should clear search when X button is clicked', async () => {
    (useDeliveryFilters as jest.Mock).mockReturnValue({
      search: 'TRK12345',
      status: undefined,
      sortBy: undefined,
      hasActiveFilters: true,
      updateFilters: mockUpdateFilters,
      clearFilters: mockClearFilters,
    });

    render(<DeliveryFilters />);

    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(mockUpdateFilters).toHaveBeenCalledWith({ search: '' });
    });
  });

  it('should handle status filter change', async () => {
    render(<DeliveryFilters />);

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'DELIVERED' } });

    await waitFor(() => {
      expect(mockUpdateFilters).toHaveBeenCalledWith({ status: 'DELIVERED' });
    });
  });

  it('should handle sort filter change', async () => {
    render(<DeliveryFilters />);

    const sortSelect = screen.getByLabelText('Sort by') as HTMLSelectElement;
    fireEvent.change(sortSelect, { target: { value: 'date-desc' } });

    await waitFor(() => {
      expect(mockUpdateFilters).toHaveBeenCalledWith({ sortBy: 'date-desc' });
    });
  });

  it('should display active filters when hasActiveFilters is true', () => {
    (useDeliveryFilters as jest.Mock).mockReturnValue({
      search: 'TRK12345',
      status: 'IN_TRANSIT',
      sortBy: 'date-desc',
      hasActiveFilters: true,
      updateFilters: mockUpdateFilters,
      clearFilters: mockClearFilters,
    });

    render(<DeliveryFilters />);

    expect(screen.getByText(/Active filters:/)).toBeInTheDocument();
    expect(screen.getByText(/Search: TRK12345/)).toBeInTheDocument();
    expect(screen.getByText(/Status: IN_TRANSIT/)).toBeInTheDocument();
    expect(screen.getByText(/Sort: Newest/)).toBeInTheDocument();
    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });

  it('should not display active filters section when no filters are active', () => {
    (useDeliveryFilters as jest.Mock).mockReturnValue({
      search: undefined,
      status: undefined,
      sortBy: undefined,
      hasActiveFilters: false,
      updateFilters: mockUpdateFilters,
      clearFilters: mockClearFilters,
    });

    render(<DeliveryFilters />);

    expect(screen.queryByText(/Active filters:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();
  });

  it('should call clearFilters when Clear Filters button is clicked', async () => {
    (useDeliveryFilters as jest.Mock).mockReturnValue({
      search: 'TRK12345',
      status: 'DELIVERED',
      sortBy: 'date-asc',
      hasActiveFilters: true,
      updateFilters: mockUpdateFilters,
      clearFilters: mockClearFilters,
    });

    render(<DeliveryFilters />);

    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(mockClearFilters).toHaveBeenCalled();
    });
  });

  it('should render all status options', () => {
    render(<DeliveryFilters />);

    const statusSelect = screen.getByLabelText('Status');
    const options = statusSelect.querySelectorAll('option');

    expect(options).toHaveLength(6); // All statuses + "All Statuses"
    expect(options[0].textContent).toBe('All Statuses');
    expect(options[1].textContent).toBe('Pending');
    expect(options[2].textContent).toBe('Accepted');
    expect(options[3].textContent).toBe('In Transit');
    expect(options[4].textContent).toBe('Delivered');
    expect(options[5].textContent).toBe('Cancelled');
  });

  it('should render all sort options', () => {
    render(<DeliveryFilters />);

    const sortSelect = screen.getByLabelText('Sort by');
    const options = sortSelect.querySelectorAll('option');

    expect(options).toHaveLength(3);
    expect(options[0].textContent).toBe('No Sort');
    expect(options[1].textContent).toBe('Newest First');
    expect(options[2].textContent).toBe('Oldest First');
  });
});
