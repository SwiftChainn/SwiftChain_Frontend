# Quick Start Guide - Delivery Filters

## 🚀 Quick Overview

This feature adds search, filter, and sort controls to the delivery list with URL-based state persistence.

## 📝 Basic Usage

### Using the DeliveryList Component

The `DeliveryList` component now automatically includes filters:

```tsx
import { DeliveryList } from '@/components/DeliveryList';

export default function Page() {
  return <DeliveryList />;
}
```

That's it! The filters are built-in.

## 🔧 Using Individual Hooks

### Get Filter State
```tsx
'use client';

import { useDeliveryFilters } from '@/features/deliveries/hooks';

export function MyComponent() {
  const { search, status, sortBy, hasActiveFilters } = useDeliveryFilters();
  
  console.log('Current filters:', { search, status, sortBy });
  console.log('Has active filters:', hasActiveFilters);
  
  return <div>{/* ... */}</div>;
}
```

### Update Filters
```tsx
'use client';

import { useDeliveryFilters } from '@/features/deliveries/hooks';

export function MyComponent() {
  const { updateFilters, clearFilters } = useDeliveryFilters();
  
  return (
    <div>
      <button onClick={() => updateFilters({ search: 'TRK12345' })}>
        Search
      </button>
      
      <button onClick={() => updateFilters({ status: 'DELIVERED' })}>
        Show Delivered
      </button>
      
      <button onClick={() => updateFilters({ sortBy: 'date-desc' })}>
        Sort Newest
      </button>
      
      <button onClick={clearFilters}>
        Clear All
      </button>
    </div>
  );
}
```

### Fetch Filtered Deliveries
```tsx
'use client';

import { useDeliveries } from '@/hooks/useDeliveries';
import { useDeliveryFilters } from '@/features/deliveries/hooks';

export function DeliveryList() {
  const { search, status, sortBy } = useDeliveryFilters();
  const { data, isLoading, error } = useDeliveries({
    search,
    status,
    sortBy,
  });
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {data?.map(delivery => (
        <li key={delivery.id}>{delivery.trackingNumber}</li>
      ))}
    </ul>
  );
}
```

## 📚 Filter Types

```typescript
interface DeliveryFilterParams {
  search?: string;           // e.g., "TRK12345"
  status?: string;          // "PENDING" | "ACCEPTED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED"
  sortBy?: 'date-asc' | 'date-desc'; // Sort by date
}
```

## 🌐 URL Query Parameters

| Parameter | Example | Description |
|-----------|---------|-------------|
| search | `?search=TRK12345` | Search by tracking ID |
| status | `?status=DELIVERED` | Filter by status |
| sortBy | `?sortBy=date-desc` | Sort by date |

### URL Examples

```
/deliveries                           # No filters
/deliveries?search=TRK12345          # Search only
/deliveries?status=DELIVERED         # Status only
/deliveries?sortBy=date-desc         # Sort only
/deliveries?search=TRK&status=DELIVERED&sortBy=date-desc # All combined
```

## 📋 Available Filter Values

### Status Values
- `PENDING` - Awaiting driver acceptance
- `ACCEPTED` - Driver accepted delivery
- `IN_TRANSIT` - Package in transit
- `DELIVERED` - Package delivered
- `CANCELLED` - Delivery cancelled

### Sort Values
- `date-asc` - Oldest first
- `date-desc` - Newest first

## ✨ Features

### ✅ Search
- Search by Tracking ID
- Debounced on blur/Enter key
- Clear button to reset

### ✅ Filter
- Dropdown with all 5 status options
- Select multiple times (updates previous selection)
- Combine with other filters

### ✅ Sort
- Sort by date ascending/descending
- Combine with search and filter

### ✅ Persistence
- All filters persist in URL
- Page refresh maintains state
- Shareable URLs with filter state

### ✅ UI
- Visual badges for active filters
- Clear all button
- Dark mode support
- Mobile responsive
- Full keyboard navigation

## 🧪 Testing

### Run Tests
```bash
npm test -- --testPathPattern="useDeliveryFilters|DeliveryFilters|deliveries.service"
```

### Manual Testing
1. Go to `/deliveries`
2. Search for a tracking ID
3. Change status filter
4. Change sort order
5. Refresh page - filters should persist
6. Check URL - should include query parameters

## 🔌 Backend Integration

Your backend API needs to handle:

```
GET /api/deliveries?search={search}&status={status}&sortBy={sortBy}
```

Example implementation (Node.js/Express):

```javascript
app.get('/api/deliveries', async (req, res) => {
  const { search, status, sortBy } = req.query;
  
  let query = Delivery.find();
  
  if (search) {
    query = query.where('trackingNumber').regex(new RegExp(search, 'i'));
  }
  
  if (status) {
    query = query.where('status').equals(status);
  }
  
  if (sortBy === 'date-desc') {
    query = query.sort({ createdAt: -1 });
  } else if (sortBy === 'date-asc') {
    query = query.sort({ createdAt: 1 });
  }
  
  const deliveries = await query.exec();
  res.json(deliveries);
});
```

## 📁 File Locations

| Component | Location |
|-----------|----------|
| Filter Component | `features/deliveries/components/DeliveryFilters.tsx` |
| Filter Hook | `features/deliveries/hooks/useDeliveryFilters.ts` |
| Deliveries Hook | `hooks/useDeliveries.ts` |
| Deliveries Service | `services/deliveries.service.ts` |
| Filter Types | `types/filters.ts` |
| Delivery List | `components/DeliveryList.tsx` |

## 🎓 Common Patterns

### Pattern 1: Filter from Another Component
```tsx
import { useDeliveryFilters } from '@/features/deliveries/hooks';

export function SearchBar() {
  const { updateFilters } = useDeliveryFilters();
  
  const handleSearch = (trackingId: string) => {
    updateFilters({ search: trackingId });
  };
  
  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

### Pattern 2: Status Selector
```tsx
export function StatusSelector() {
  const { updateFilters } = useDeliveryFilters();
  
  return (
    <select onChange={(e) => updateFilters({ status: e.target.value })}>
      <option value="">All Statuses</option>
      <option value="PENDING">Pending</option>
      <option value="DELIVERED">Delivered</option>
    </select>
  );
}
```

### Pattern 3: Conditional Rendering Based on Filters
```tsx
export function DeliveryStats() {
  const { hasActiveFilters, clearFilters } = useDeliveryFilters();
  
  return (
    <div>
      {hasActiveFilters && (
        <button onClick={clearFilters}>Clear Filters</button>
      )}
    </div>
  );
}
```

## ⚠️ Important Notes

1. **URL State Only**: All state is managed via URL query parameters
2. **Server Components**: Use `'use client'` directive when using hooks
3. **No Mock Data**: All data comes from backend API
4. **Automatic Sync**: URL changes automatically trigger data refresh
5. **Backward Compatible**: Works with existing code

## 🐛 Troubleshooting

### Filters not persisting on refresh
- Check if page is using `'use client'` directive
- Verify URL has query parameters

### No data showing
- Check backend API is returning correct response
- Verify filter values match API expectations
- Check browser console for errors

### Filters not updating
- Verify hook is called inside a client component
- Check that `updateFilters` is being called correctly
- Verify API endpoint is working

## 📞 Support

For detailed documentation, see:
- `DELIVERY_FILTERS_IMPLEMENTATION.md` - Complete guide
- `IMPLEMENTATION_COMPLETE.md` - Verification checklist
- `FILES_SUMMARY.md` - File structure overview

---

**Happy filtering! 🚀**
