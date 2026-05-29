# GitHub PR: Interactive Map UI for Tracking

## PR Title

```
feat(deliveries): add interactive tracking map with backend route integration
```

---

## PR Body - Short Version

### Overview

Implements the interactive delivery tracking map with backend route retrieval, live location handling, and a strict Component → Hook → Service architecture.

### What's Included

- **Component** (`TrackingMap`): Interactive map UI with loading, error, empty, and success states
- **Hook** (`useTrackingRoute`): React Query-powered route and live location fetching
- **Service** (`trackingService`): Axios integration for route, current location, and route calculation APIs
- **Types** (`tracking.ts`): Typed route, waypoint, coordinate, and response contracts
- **Tests**: Comprehensive unit coverage for service, hook, and component integration behavior

### Key Features

- ✅ Backend route data retrieval from delivery route APIs
- ✅ Live current location polling for in-transit deliveries
- ✅ Interactive route visualization structure with origin, destination, checkpoints, and polyline elements
- ✅ Loading, error, and empty-state handling
- ✅ Dark mode and responsive layout support
- ✅ Strict no-inline-mock data architecture with typed API integration

### Testing

- 18 service tests (route fetches, error handling, parameter validation)
- 6 hook tests (query lifecycle, loading, error state, refetch behavior)
- 59 component integration tests (state handling, route info, markers, responsiveness)
- **All 83 tests passing** ✅

### Files Changed

| File                                                  | Type | Changes                                                               |
| ----------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| `types/tracking.ts`                                   | New  | Tracking route, coordinate, waypoint, and response types              |
| `services/trackingService.ts`                         | New  | Axios integration for delivery route, location, and route calculation |
| `hooks/useTrackingRoute.ts`                           | New  | React Query hook for route caching, polling, and live location        |
| `components/shipments/TrackingMap.tsx`                | New  | Interactive tracking map UI with route states and status metadata     |
| `services/__tests__/trackingService.test.ts`          | New  | 18 service integration tests                                          |
| `hooks/__tests__/useTrackingRoute.test.tsx`           | New  | 6 hook state and polling tests                                        |
| `components/shipments/__tests__/TrackingMap.test.tsx` | New  | 59 integration tests for map states and UI behavior                   |

### Architecture

Follows established **Component → Hook → Service** pattern:

```
TrackingMap (UI) → useTrackingRoute (State) → trackingService (API)
```

### Breaking Changes

None - additive UI and API integration feature.

### Checklist

- ✅ Tests passing (83/83)
- ✅ TypeScript strict mode compliant
- ✅ Backend API integration with typed responses
- ✅ Responsive design support
- ✅ Dark mode styling support
- ✅ Component → Hook → Service pattern followed
- ✅ No inline mock route objects used in production code

---

## PR Body - Detailed Version

### Description

This PR adds the interactive delivery tracking map feature to SwiftChain Frontend. The implementation loads route data from backend APIs, manages route and live location state through React Query, and renders the map UI with clear route and status information.

### Problem Statement

Users need to visualize delivery routes visually and track live delivery progress. The solution must:

1. Retrieve route data from backend APIs instead of inline mock objects
2. Enforce the established Component → Hook → Service pattern
3. Present loading, error, empty, and success states consistently
4. Support route metadata such as distance, estimated time, and live location

### Solution Overview

Implemented a three-layer architecture with typed backend integration:

**Service Layer** (`trackingService`)

- Calls `/api/deliveries/{id}/route` to retrieve route data
- Calls `/api/deliveries/{id}/location` for current location updates
- Calls `/api/routes/calculate` for route calculations
- Wraps Axios errors with meaningful messages and response-aware handling

**State Management Layer** (`useTrackingRoute`)

- Uses React Query for caching and refetch behavior
- Fetches delivery route with stale-time and cache retention controls
- Polls current location for in-transit deliveries
- Exposes route data, current location, loading, error, and refetch state

**UI Layer** (`TrackingMap`)

- Renders dedicated loading, error, empty, and success states
- Displays route status, distance, estimated time, origin, destination, checkpoints, and live location markers
- Supports responsive layout and dark mode styling
- Uses the hook output to drive the interface without embedding mock route data

### Technical Details

#### Tracking Types

- `Coordinate` for latitude/longitude values
- `RouteWaypoint` for origin, destination, and checkpoint points
- `RouteData` for full delivery route payloads
- Response wrappers for successful and failed API responses

#### Query Strategy

- Route query: cached and refreshed to keep route data current
- Live location query: enabled only during `in_transit` status
- Separate loading and error states based on route and location query results

#### Backend API Contract

- `GET /api/deliveries/{deliveryId}/route`
- `GET /api/deliveries/{deliveryId}/location`
- `GET /api/routes/calculate`

### Testing Strategy

#### Service Tests (18 tests)

- Successful route fetch and request configuration
- Missing delivery ID handling
- 404 / 403 / timeout / API failure scenarios
- Current location and route calculation validation

#### Hook Tests (6 tests)

- Null ID handling and initial empty state
- Route fetch lifecycle and request invocation
- Error propagation and refetch behavior

#### Component Integration Tests (59 tests)

- Loading, error, empty, and success UI states
- Route metadata display
- Marker and route label rendering
- Current location handling
- Responsive and dark mode styling conditions

### Files Modified

#### New Files

- `types/tracking.ts` - route, waypoint, coordinate, and API response types
- `services/trackingService.ts` - backend integration for deliver route and live location
- `hooks/useTrackingRoute.ts` - React Query route tracking hook
- `components/shipments/TrackingMap.tsx` - interactive tracking UI
- `services/__tests__/trackingService.test.ts` - 18 service tests
- `hooks/__tests__/useTrackingRoute.test.tsx` - 6 hook tests
- `components/shipments/__tests__/TrackingMap.test.tsx` - 59 integration tests

### Test Results

```
PASS  services/__tests__/trackingService.test.ts
PASS  components/shipments/__tests__/TrackingMap.test.tsx
PASS  hooks/__tests__/useTrackingRoute.test.tsx

Test Suites: 3 passed, 3 total
Tests:       83 passed, 83 total
Snapshots:   0 total
Time:        7.892 s
```

### Performance Characteristics

- API-backed route data loading with query-managed caching
- Live location polling scoped to active in-transit deliveries
- No inline mock route payloads in production code

### Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile Safari (latest)
- ✅ Chrome Mobile (latest)

### Accessibility Features

- Semantic UI structure for loading, error, and empty states
- Descriptive labels and status text
- Dark mode-friendly styling
- Responsive layout across mobile and desktop breakpoints

### Responsive Design

- Mobile-friendly layout and stacked content
- Tablet and desktop route metadata presentation
- Components adapt to varying viewport sizes

### Dark Mode Support

- Tailwind dark mode styling used throughout the tracking UI
- Interface remains readable in both light and dark themes

### Related Issues

Closes tracking map feature implementation.

### Breaking Changes

None - additive tracking feature.

### Dependencies

- Existing dependencies only: `axios`, `@tanstack/react-query`, `react-leaflet`, `leaflet`, `lucide-react`

### Migration Guide

No migration needed. The tracking UI is integrated through the new `TrackingMap` component.

### Usage Example

```tsx
import { TrackingMap } from '@/components/shipments/TrackingMap';

export function DeliveryDetailPage({ deliveryId }: { deliveryId: string }) {
  return <TrackingMap deliveryId={deliveryId} />;
}
```

### Reviewer Checklist

- [x] Verify all 83 tests pass: `npm run test -- --testPathPatterns="(TrackingMap|useTrackingRoute|trackingService)"`
- [ ] Check TypeScript compilation with production build
- [ ] Review route and live location behavior in the UI
- [ ] Confirm responsive and dark mode presentation
- [ ] Validate backend endpoint integration and error handling
- [ ] Ensure no inline mock route payloads remain in production code

### Screenshots

- Loading state with spinner and map text
- Error state with failure message
- Empty state when no delivery data is available
- Success state with route metadata and marker structure
- Mobile and desktop responsive views

### Additional Notes

- Feature follows strict layered architecture
- Backend API-driven data handling only
- Full regression coverage for service, hook, and integration behavior

---

## Deployment Notes

### Prerequisites

- Backend API endpoints available:
  - `/api/deliveries/{deliveryId}/route`
  - `/api/deliveries/{deliveryId}/location`
  - `/api/routes/calculate`
- `NEXT_PUBLIC_API_URL` configured for environment

### Post-Deployment Verification

1. Load a delivery page with `TrackingMap`
2. Confirm route metadata appears and updates for in-transit deliveries
3. Validate map UI states during loading and error scenarios
4. Watch for API request patterns and polling behavior

### Rollback Plan

Remove the `TrackingMap` integration and associated route query usage. No data migrations required.

---

## Follow-up Items

- [ ] Monitor live location polling behavior in production
- [ ] Tune route refresh cadence as backend telemetry evolves
- [ ] Expand route visualizations if additional map layers are needed
