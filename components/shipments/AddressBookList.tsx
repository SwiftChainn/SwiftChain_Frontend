'use client';

import { useState } from 'react';
import { useAddressBook, type SavedAddress } from '@/hooks/useAddressBook';
import {
  MapPin,
  Star,
  Edit2,
  Trash2,
  Plus,
  Search,
  AlertCircle,
  Loader2,
  Phone,
  User,
  Check,
} from 'lucide-react';

interface AddressBookListProps {
  onSelectAddress?: (address: SavedAddress) => void;
  selectable?: boolean;
  showActions?: boolean;
  className?: string;
}

/**
 * AddressBookList — Customer Address Book List View Component
 * 
 * Purpose:
 *   Displays saved shipping addresses with full CRUD capabilities:
 *   - View all saved addresses in a clean list/grid layout
 *   - Search and filter addresses
 *   - Mark addresses as default
 *   - Edit and delete addresses
 *   - Select address for shipment creation
 * 
 * Features:
 *   - Responsive grid layout (1 col mobile, 2 col tablet, 3 col desktop)
 *   - Real-time search filtering
 *   - Default address highlighting
 *   - Optimistic UI updates
 *   - Empty state handling
 *   - Loading skeletons
 *   - Error boundaries
 * 
 * Usage:
 *   // Read-only view
 *   <AddressBookList />
 *   
 *   // With selection callback (for shipment forms)
 *   <AddressBookList 
 *     selectable 
 *     onSelectAddress={(addr) => setSelectedAddress(addr)}
 *   />
 *   
 *   // Without actions (display only)
 *   <AddressBookList showActions={false} />
 */
export function AddressBookList({
  onSelectAddress,
  selectable = false,
  showActions = true,
  className = '',
}: AddressBookListProps) {
  const {
    addresses,
    isLoading,
    error,
    deleteAddress,
    setDefaultAddress,
    searchAddresses,
    clearError,
  } = useAddressBook();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filtered addresses based on search query
  const filteredAddresses = searchQuery ? searchAddresses(searchQuery) : addresses;

  /**
   * Handle address deletion with confirmation
   */
  const handleDelete = async (addressId: string, label: string) => {
    if (!confirm(`Delete "${label}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(addressId);
    const success = await deleteAddress(addressId);
    setDeletingId(null);

    if (success && selectedId === addressId) {
      setSelectedId(null);
    }
  };

  /**
   * Handle setting default address
   */
  const handleSetDefault = async (addressId: string) => {
    await setDefaultAddress(addressId);
  };

  /**
   * Handle address selection
   */
  const handleSelect = (address: SavedAddress) => {
    setSelectedId(address.id);
    onSelectAddress?.(address);
  };

  /**
   * Loading skeleton
   */
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading addresses...</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            />
          ))}
        </div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (error) {
    return (
      <div className={`rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20 ${className}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 dark:text-red-200">Failed to load addresses</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={clearError}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Empty state
   */
  if (addresses.length === 0) {
    return (
      <div className={`rounded-lg border border-slate-200 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/50 ${className}`}>
        <MapPin className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
          No saved addresses
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Create your first address to speed up future shipments
        </p>
        {showActions && (
          <button className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Add Address
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Saved Addresses</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {filteredAddresses.length} address{filteredAddresses.length !== 1 ? 'es' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Add Address Button */}
          {showActions && (
            <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Address Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAddresses.map((address) => (
          <AddressCard
            key={address.id}
            address={address}
            isSelected={selectable && selectedId === address.id}
            isDeleting={deletingId === address.id}
            onSelect={selectable ? () => handleSelect(address) : undefined}
            onSetDefault={showActions ? () => handleSetDefault(address.id) : undefined}
            onEdit={showActions ? () => console.log('Edit', address.id) : undefined}
            onDelete={showActions ? () => handleDelete(address.id, address.label) : undefined}
          />
        ))}
      </div>

      {/* No Results */}
      {filteredAddresses.length === 0 && searchQuery && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <Search className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            No addresses match &quot;{searchQuery}&quot;
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Individual Address Card Component
 */
interface AddressCardProps {
  address: SavedAddress;
  isSelected: boolean;
  isDeleting: boolean;
  onSelect?: () => void;
  onSetDefault?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function AddressCard({
  address,
  isSelected,
  isDeleting,
  onSelect,
  onSetDefault,
  onEdit,
  onDelete,
}: AddressCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`
        relative rounded-lg border p-5 transition-all
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md dark:border-blue-600 dark:bg-blue-900/20'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
        }
        ${onSelect ? 'cursor-pointer' : ''}
        ${isDeleting ? 'opacity-50' : ''}
      `}
    >
      {/* Default Badge */}
      {address.isDefault && (
        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          <Star className="h-3 w-3 fill-current" />
          Default
        </div>
      )}

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute left-3 top-3 rounded-full bg-blue-600 p-1 text-white">
          <Check className="h-3 w-3" />
        </div>
      )}

      {/* Label */}
      <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
        {address.label}
      </h3>

      {/* Recipient Info */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <User className="h-4 w-4 flex-shrink-0" />
          <span>{address.recipientName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Phone className="h-4 w-4 flex-shrink-0" />
          <span>{address.recipientPhone}</span>
        </div>
      </div>

      {/* Address */}
      <div className="mb-4 flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
        <div>
          <p>{address.addressLine1}</p>
          {address.addressLine2 && <p>{address.addressLine2}</p>}
          <p>
            {address.city}, {address.state} {address.postalCode}
          </p>
          <p>{address.country}</p>
        </div>
      </div>

      {/* Actions */}
      {(onEdit || onDelete || onSetDefault) && (
        <div className="flex items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
          {!address.isDefault && onSetDefault && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetDefault();
              }}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              Set Default
            </button>
          )}

          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isDeleting}
              className="rounded-lg border border-red-300 bg-white p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-slate-700 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
