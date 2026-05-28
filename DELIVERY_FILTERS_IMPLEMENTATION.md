# Delivery List Filter & Sort Implementation Guide

## Overview
This document outlines the implementation of delivery list filter and sort controls for the SwiftChain frontend application. The implementation follows a strict **Component → Hook → Service** layered architecture and maintains filter state through URL query parameters for persistent state across page refreshes.

## Architecture

### Layer Structure

```
DeliveryList Component
    ↓
useDeliveryFilters Hook (URL State Management)
    ↓
useDeliveries Hook (Data Fetching)
    ↓
deliveriesService (API Integration)
    ↓
Backend API
```

### File Structure

```
features/deliveries/
├── components/
│   ├── DeliveryFilters.tsx          # UI Component for filters
│   ├── DeliveryFilters.test.tsx     # Component tests
│   └── index.ts                      # Component exports
├── hooks/
│   ├── useDeliveryFilters.ts        # Filter state & URL param management
│   ├── useDeliveryFilters.test.ts   # Hook tests
│   └── index.ts                      # Hook exports
types/
├── filters.ts                         # Filter type definitions
types/
├── delivery.ts                        # Delivery type definitions
services/
├── deliveries.service.ts             # API integration with filter support
├── __tests__/
│   └── deliveries.service.test.ts   # Service tests
components/
├── DeliveryList.tsx                  # Main delivery list component
hooks/
├── useDeliveries.ts                  # Query hook with filter support
```

## Components & Hooks

### 1. DeliveryFilters Component (`features/deliveries/components/DeliveryFilters.tsx`)

**Responsibility**: Renders the UI for filtering and sorting deliveries.

**Features**:
- Search by Tracking ID (with debounce on blur/Enter)
- Filter by Status dropdown
- Sort by Date dropdown
- Display active filters with visual badges
- Clear all filters button

**Props**: None (uses `useDeliveryFilters` hook internally)

**Example Usage**:
```tsx
import { DeliveryFilters } from '@/features/deliveries/components/DeliveryFilters';

export function DeliveryPage() {
  return (
    <div>
      <DeliveryFilters />
      {/* Rest of component */}
    </div>
  );
}
```

### 2. useDeliveryFilters Hook (`features/deliveries/hooks/useDeliveryFilters.ts`)

**Responsibility**: Manages filter state through URL query parameters and provides methods to update filters.

**Features**:
- Reads filter state from URL query parameters
- Provides `updateFilters` method to update one or more filters
- Provides `clearFilters` method to reset all filters
- Automatically syncs state with URL for persistence
- Returns `hasActiveFilters` flag for UI feedback

**Returns**:
```typescript
{
  search?: string;           // Search query
  status?: string;           // Delivery status filter
  sortBy?: 'date-asc' | 'date-desc'; // Sort order
  hasActiveFilters: boolean; // Whether any filters are active
  updateFilters: (params: Partial<DeliveryFilterParams>) => void;
  clearFilters: () => void;
}
```

**Example Usage**:
```tsx
const { search, status, sortBy, updateFilters, clearFilters, hasActiveFilters } = useDeliveryFilters();

// Update individual filter
updateFilters({ search: 'TRK12345' });

// Update multiple filters
updateFilters({ status: 'DELIVERED', sortBy: 'date-desc' });

// Clear all filters
clearFilters();
```

### 3. useDeliveries Hook (`hooks/useDeliveries.ts`)

**Responsibility**: Fetches deliveries from the backend with optional filter parameters.

**Features**:
- Integrates with React Query for caching and state management
- Accepts optional filter parameters
- Manages loading and error states
- Automatic query key invalidation when filters change

**Returns**:
```typescript
{
  data?: Delivery[];
  isLoading: boolean;
  error?: Error;
}
```

**Example Usage**:
```tsx
const { search, status, sortBy } = useDeliveryFilters();
const { data, isLoading, error } = useDeliveries({
  search,
  status,
  sortBy,
});
```

## Service Integration

### deliveriesService (`services/deliveries.service.ts`)

**Responsibility**: Handles API communication with the backend.

**Methods**:

#### `getDeliveries(filters?: DeliveryFilterParams): Promise<Delivery[]>`
Fetches deliveries from the backend with optional filters.

**Parameters**:
```typescript
{
  search?: string;           // Search by tracking number
  status?: string;           // Filter by status
  sortBy?: 'date-asc' | 'date-desc'; // Sort order
}
```

**Example**:
```typescript
// Fetch all deliveries
await deliveriesService.getDeliveries();

// Fetch with filters
await deliveriesService.getDeliveries({
  search: 'TRK12345',
  status: 'IN_TRANSIT',
  sortBy: 'date-desc'
});
```

#### `getDeliveryById(id: string): Promise<Delivery>`
Fetches a specific delivery by ID.

## Type Definitions

### FilterParams Type (`types/filters.ts`)

```typescript
interface DeliveryFilterParams {
  search?: string;
  status?: string;
  sortBy?: 'date-asc' | 'date-desc';
}

interface FilterState extends DeliveryFilterParams {
  hasActiveFilters: boolean;
}
```

## URL Query Parameters

Filter state is persisted through URL query parameters. Here are the supported parameters:

| Parameter | Type | Example |
|-----------|------|---------|
| `search` | string | `?search=TRK12345` |
| `status` | string | `?status=DELIVERED` |
| `sortBy` | string | `?sortBy=date-desc` |

**Combined Example**:
```
/deliveries?search=TRK12345&status=IN_TRANSIT&sortBy=date-desc
```

## API Endpoint Contract

The backend API should support the following endpoint:

```
GET /api/deliveries?search={search}&status={status}&sortBy={sortBy}
```

### Request Query Parameters
- `search` (optional): Search deliveries by tracking number
- `status` (optional): Filter by delivery status (PENDING, ACCEPTED, IN_TRANSIT, DELIVERED, CANCELLED)
- `sortBy` (optional): Sort deliveries (date-asc, date-desc)

### Response
```json
[
  {
    "id": "uuid",
    "trackingNumber": "TRK12345",
    "senderId": "uuid",
    "driverId": "uuid",
    "status": "IN_TRANSIT",
    "origin": "Nairobi",
    "destination": "Mombasa",
    "escrowStatus": "LOCKED",
    "amount": 100.00,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

## Status Values

- `PENDING`: Delivery request created, awaiting driver acceptance
- `ACCEPTED`: Driver has accepted the delivery
- `IN_TRANSIT`: Package is in transit
- `DELIVERED`: Package has been delivered
- `CANCELLED`: Delivery was cancelled

## Data Flow Diagram

```
User interacts with DeliveryFilters component
        ↓
updateFilters() called with new filter values
        ↓
useDeliveryFilters updates URL query parameters
        ↓
URL changes, triggering component re-render
        ↓
useDeliveryFilters hook reads new query params
        ↓
Filter state updates
        ↓
useDeliveries hook receives new filters
        ↓
Query key changes, triggering new fetch
        ↓
deliveriesService.getDeliveries() called with filters
        ↓
API request sent with query parameters
        ↓
Backend returns filtered results
        ↓
React Query caches results
        ↓
Component re-renders with new data
```

## Integration with DeliveryList

The `DeliveryList` component integrates filters as follows:

```tsx
'use client';

export function DeliveryList() {
  // Get filter state from URL
  const { search, status, sortBy } = useDeliveryFilters();
  
  // Fetch deliveries with filters
  const { data, isLoading, error } = useDeliveries({
    search,
    status,
    sortBy,
  });

  return (
    <div>
      {/* Render filter UI */}
      <DeliveryFilters />
      
      {/* Render delivery list with filtered data */}
      {/* ... */}
    </div>
  );
}
```

## Testing

### Unit Tests Included

1. **useDeliveryFilters.test.ts**
   - Filter initialization
   - Individual filter updates
   - Multiple filter combinations
   - Clear all filters
   - Filter removal

2. **DeliveryFilters.test.tsx**
   - Component rendering
   - Search input handling
   - Status filter selection
   - Sort filter selection
   - Active filters display
   - Clear filters functionality

3. **deliveries.service.test.ts**
   - API calls with filters
   - Query parameter formatting
   - Error handling
   - Single and multiple filter combinations

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test useDeliveryFilters.test.ts

# Run tests in watch mode
npm test --watch
```

## Browser Requirements

- Requires modern browser support for:
  - `URLSearchParams` API
  - React 19+
  - Next.js App Router

## Performance Considerations

1. **Search Debouncing**: Search input is only submitted on blur or Enter key, not on every keystroke
2. **Query Key Caching**: React Query caches results based on filter combination, avoiding redundant API calls
3. **URL State**: Filter state is persisted via URL, reducing client-side state management complexity
4. **Shallow Routing**: Uses `scroll: false` option to prevent page scroll on filter updates

## Error Handling

- API errors are caught and displayed via the `useDeliveries` hook's error state
- User can retry by clearing filters and searching again
- Empty results display a helpful message suggesting filter adjustment

## Future Enhancements

- Add pagination support
- Add advanced search with multiple fields
- Add date range filtering
- Add real-time filter suggestions
- Add saved filter presets
- Add export filtered results to CSV

## Accessibility Features

- All form inputs have associated labels
- Clear visual feedback for active filters
- Keyboard navigation support
- ARIA labels for icon buttons
- Dark mode support with proper contrast ratios

## Browser Compatibility

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari, Chrome Mobile

## Notes

- The implementation maintains backward compatibility with existing code
- All state changes are URL-driven, enabling bookmarkable search results
- The architecture is extensible for additional filters in the future
- No breaking changes to existing DeliveryList functionality
