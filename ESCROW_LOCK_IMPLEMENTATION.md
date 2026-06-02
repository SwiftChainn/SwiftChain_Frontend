# Escrow Payment Lock UI Implementation

## Overview
The **EscrowLock** component implements a complete escrow payment locking interface that follows the strict **Component → Hook → Service** layered architecture pattern.

## Architecture Pattern

### Layer 1: Service (`escrowService.ts`)
Handles all API communication with the backend:
```typescript
export const escrowService = {
  async lockEscrow(params: LockEscrowParams): Promise<LockEscrowResponse> {
    // API call to lock escrow funds
  },
};
```

### Layer 2: Hook (`useEscrowLock.ts`)
Manages state and orchestrates the service calls:
```typescript
export function useEscrowLock(): UseEscrowLockReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escrowId, setEscrowId] = useState<string | null>(null);
  
  const lockEscrow = useCallback(async (params: LockEscrowParams) => {
    // Call service and manage state
  }, []);
  
  return { isLoading, error, escrowId, lockEscrow, reset };
}
```

### Layer 3: Component (`EscrowLock.tsx`)
Renders the UI and uses the hook:
```typescript
export function EscrowLock({ deliveryId, amount, currency }: EscrowLockProps) {
  const { isLoading, error, escrowId, lockEscrow } = useEscrowLock();
  // Render UI using hook state
}
```

## Features

✅ **Display Total Cost** — Shows the delivery amount clearly with currency

✅ **Action Button** — "Lock Payment in Escrow" button that triggers the flow

✅ **Submit Button States** — 
- Disabled when wallet not connected
- Disabled and shows spinner while API request is pending
- Enabled when ready to lock

✅ **Confirmation Modal** — User confirms payment lock before proceeding

✅ **Success State** — Shows confirmation with transaction hash

✅ **Error Handling** — Displays errors with retry option

✅ **Wallet Integration** — Requires connected Freighter wallet

## Usage

### Basic Usage

```typescript
import { EscrowLock } from '@/features/escrow/components/EscrowLock';

export function DeliveryPage() {
  return (
    <EscrowLock
      deliveryId="delivery-123"
      amount={100.50}
      currency="USDC"
    />
  );
}
```

### With Callbacks

```typescript
<EscrowLock
  deliveryId="delivery-123"
  amount={100.50}
  currency="USDC"
  onSuccess={(escrowId, txHash) => {
    console.log('Escrow locked:', escrowId);
    console.log('Transaction:', txHash);
    // Navigate to next step
  }}
  onError={(error) => {
    console.error('Lock failed:', error);
    // Show error to user
  }}
/>
```

## Component States

### 1. Idle State (Ready to Lock)
- Displays total cost in large, clear format
- Shows wallet connection status
- Lock button is enabled (if wallet connected)

### 2. Pending State (Loading)
- Shows spinner animation
- Button is disabled
- User sees "Locking Payment…" message

### 3. Success State
- Shows green checkmark icon
- Displays confirmation message
- Shows transaction hash if available
- Provides "Lock Another Delivery" button to reset

### 4. Error State
- Shows red error icon
- Displays error message
- "Try Again" button to reset and retry

## Data Flow

```
User clicks "Lock Payment" button
        ↓
Wallet validation (must be connected)
        ↓
Show confirmation modal with amount
        ↓
User confirms in modal
        ↓
Hook calls escrowService.lockEscrow()
        ↓
Loading state displayed (spinner shown)
        ↓
API Response received
        ↓
Success: Show success state + onSuccess callback
Error: Show error state + onError callback + toast notification
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `deliveryId` | string | ✅ | The delivery ID to lock escrow for |
| `amount` | number | ✅ | The amount to lock in escrow |
| `currency` | string | ❌ | Currency code (default: "USDC") |
| `onSuccess` | function | ❌ | Callback when escrow is successfully locked |
| `onError` | function | ❌ | Callback when lock fails |

## API Integration

### Expected Endpoint
- **POST** `/api/escrow/lock`

### Request Body
```typescript
{
  deliveryId: string;
  amount: number;
  currency: string;
  walletAddress: string;
}
```

### Response Body
```typescript
{
  success: boolean;
  message: string;
  escrowId?: string;
  transactionHash?: string;
  lockedAmount?: string;
}
```

## Error Handling

The component handles various error scenarios:
- ❌ Wallet not connected
- ❌ Insufficient funds
- ❌ Invalid delivery ID
- ❌ Network errors
- ❌ Blockchain transaction failures

All errors are:
1. Caught in the hook
2. Logged to the console
3. Displayed to user in error state
4. Notified via toast message

## Styling

The component uses **TailwindCSS** classes and follows the design system:
- Primary color for main actions (blue)
- Green for success states
- Red for error states
- Proper spacing, shadows, and transitions

## Accessibility

- ♿ Semantic HTML with proper roles (`role="dialog"`)
- ♿ ARIA labels for modals
- ♿ Keyboard navigation support
- ♿ Focus states and indicators
- ♿ Clear error messaging

## Testing

Run the comprehensive test suite:
```bash
npm test features/escrow/components/__tests__/EscrowLock.test.tsx
```

The test suite covers:
✅ Total cost display
✅ Button disabled state when wallet not connected
✅ Spinner shown during loading
✅ Confirmation modal appears and functions
✅ lockEscrow called with correct params
✅ Success state with transaction hash
✅ Error state handling
✅ Callbacks (onSuccess, onError)
✅ Wallet connection warning

## Implementation Checklist

- ✅ Component created at `features/escrow/components/EscrowLock.tsx`
- ✅ Hook created at `hooks/useEscrowLock.ts`
- ✅ Service updated with `lockEscrow` method in `services/escrowService.ts`
- ✅ Types added to `escrowService.ts`
- ✅ Comprehensive unit tests in `features/escrow/components/__tests__/EscrowLock.test.tsx`
- ✅ Follows Component → Hook → Service pattern
- ✅ No mock objects (uses real backend API)
- ✅ Proper error handling and user feedback
- ✅ Accessible and responsive UI
- ✅ Loading states with spinner
- ✅ Wallet connection validation

## Next Steps

1. Integrate component into delivery creation/confirmation page
2. Connect to backend API endpoint
3. Test with real wallet and blockchain
4. Add analytics/logging for escrow locks
5. Consider adding retry logic for failed transactions
