import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/services/api';

/**
 * Saved Address Entry
 */
export interface SavedAddress {
  id: string;
  label: string; // e.g., "Home", "Office", "Warehouse A"
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create Address Payload
 */
export interface CreateAddressPayload {
  label: string;
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

/**
 * Update Address Payload
 */
export interface UpdateAddressPayload extends Partial<CreateAddressPayload> {
  id: string;
}

/**
 * Address Book API Response
 */
interface AddressBookResponse {
  success: boolean;
  data: SavedAddress[];
  message?: string;
}

interface SingleAddressResponse {
  success: boolean;
  data: SavedAddress;
  message?: string;
}

interface DeleteAddressResponse {
  success: boolean;
  message?: string;
}

/**
 * useAddressBook — Hook for Saved Address Management
 * 
 * Purpose:
 *   Provides complete CRUD operations for customer address book:
 *   - Fetch all saved addresses
 *   - Create new addresses
 *   - Update existing addresses
 *   - Delete addresses
 *   - Set default address
 *   - Search and filter addresses
 * 
 * Features:
 *   - Optimistic UI updates
 *   - Local caching with automatic refresh
 *   - Error handling with rollback
 *   - Loading states per operation
 *   - Default address management
 * 
 * Usage:
 *   const {
 *     addresses,
 *     isLoading,
 *     error,
 *     createAddress,
 *     updateAddress,
 *     deleteAddress,
 *     setDefaultAddress,
 *     refreshAddresses
 *   } = useAddressBook();
 */
export function useAddressBook() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Fetch all saved addresses from backend
   */
  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<AddressBookResponse>('/address-book');

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch addresses');
      }

      setAddresses(response.data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load addresses';
      setError(message);
      console.error('Error fetching addresses:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new address
   * 
   * @param payload - Address data to create
   * @returns Created address or null on failure
   */
  const createAddress = useCallback(async (
    payload: CreateAddressPayload
  ): Promise<SavedAddress | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await apiClient.post<SingleAddressResponse>(
        '/address-book',
        payload
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create address');
      }

      const newAddress = response.data.data;

      // Optimistic update: Add to local state
      setAddresses(prev => [...prev, newAddress]);

      // If this is set as default, update other addresses
      if (newAddress.isDefault) {
        setAddresses(prev =>
          prev.map(addr =>
            addr.id === newAddress.id ? addr : { ...addr, isDefault: false }
          )
        );
      }

      return newAddress;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create address';
      setError(message);
      console.error('Error creating address:', err);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  /**
   * Update an existing address
   * 
   * @param payload - Address data to update (must include id)
   * @returns Updated address or null on failure
   */
  const updateAddress = useCallback(async (
    payload: UpdateAddressPayload
  ): Promise<SavedAddress | null> => {
    setIsUpdating(true);
    setError(null);

    // Store previous state for rollback
    const previousAddresses = [...addresses];

    try {
      // Optimistic update
      setAddresses(prev =>
        prev.map(addr =>
          addr.id === payload.id ? { ...addr, ...payload } : addr
        )
      );

      const response = await apiClient.put<SingleAddressResponse>(
        `/address-book/${payload.id}`,
        payload
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update address');
      }

      const updatedAddress = response.data.data;

      // Sync with server response
      setAddresses(prev =>
        prev.map(addr => (addr.id === updatedAddress.id ? updatedAddress : addr))
      );

      // If this is set as default, update other addresses
      if (updatedAddress.isDefault) {
        setAddresses(prev =>
          prev.map(addr =>
            addr.id === updatedAddress.id ? addr : { ...addr, isDefault: false }
          )
        );
      }

      return updatedAddress;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update address';
      setError(message);
      console.error('Error updating address:', err);

      // Rollback optimistic update
      setAddresses(previousAddresses);
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [addresses]);

  /**
   * Delete an address
   * 
   * @param addressId - ID of address to delete
   * @returns Success boolean
   */
  const deleteAddress = useCallback(async (addressId: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    // Store previous state for rollback
    const previousAddresses = [...addresses];

    try {
      // Optimistic update
      setAddresses(prev => prev.filter(addr => addr.id !== addressId));

      const response = await apiClient.delete<DeleteAddressResponse>(
        `/address-book/${addressId}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete address');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete address';
      setError(message);
      console.error('Error deleting address:', err);

      // Rollback optimistic update
      setAddresses(previousAddresses);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [addresses]);

  /**
   * Set an address as default
   * 
   * @param addressId - ID of address to set as default
   * @returns Success boolean
   */
  const setDefaultAddress = useCallback(async (addressId: string): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    // Store previous state for rollback
    const previousAddresses = [...addresses];

    try {
      // Optimistic update: Set new default and clear others
      setAddresses(prev =>
        prev.map(addr => ({
          ...addr,
          isDefault: addr.id === addressId,
        }))
      );

      const response = await apiClient.patch<SingleAddressResponse>(
        `/address-book/${addressId}/set-default`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to set default address');
      }

      // Sync with server response
      const updatedAddress = response.data.data;
      setAddresses(prev =>
        prev.map(addr =>
          addr.id === updatedAddress.id ? updatedAddress : { ...addr, isDefault: false }
        )
      );

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set default address';
      setError(message);
      console.error('Error setting default address:', err);

      // Rollback optimistic update
      setAddresses(previousAddresses);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [addresses]);

  /**
   * Get default address
   */
  const getDefaultAddress = useCallback((): SavedAddress | null => {
    return addresses.find(addr => addr.isDefault) || null;
  }, [addresses]);

  /**
   * Search addresses by query string
   * 
   * @param query - Search query (label, recipient name, or city)
   * @returns Filtered addresses
   */
  const searchAddresses = useCallback((query: string): SavedAddress[] => {
    if (!query.trim()) {
      return addresses;
    }

    const lowerQuery = query.toLowerCase();
    return addresses.filter(
      addr =>
        addr.label.toLowerCase().includes(lowerQuery) ||
        addr.recipientName.toLowerCase().includes(lowerQuery) ||
        addr.city.toLowerCase().includes(lowerQuery) ||
        addr.state.toLowerCase().includes(lowerQuery)
    );
  }, [addresses]);

  /**
   * Get address by ID
   */
  const getAddressById = useCallback((id: string): SavedAddress | null => {
    return addresses.find(addr => addr.id === id) || null;
  }, [addresses]);

  /**
   * Manually refresh addresses from server
   */
  const refreshAddresses = useCallback(async () => {
    await fetchAddresses();
  }, [fetchAddresses]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch addresses on mount
  useEffect(() => {
    void fetchAddresses();
  }, [fetchAddresses]);

  return {
    // State
    addresses,
    isLoading,
    error,
    isCreating,
    isUpdating,
    isDeleting,

    // Actions
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    refreshAddresses,
    clearError,

    // Utilities
    getDefaultAddress,
    searchAddresses,
    getAddressById,
  };
}
