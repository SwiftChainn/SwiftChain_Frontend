# QR Code Handoff Implementation

## 📋 Overview

The QR Code Handoff system generates secure, time-sensitive QR codes for package handoff verification in SwiftChain. This implementation follows the **Component → Hook → Service** architecture pattern established in the project.

## 🏗️ Architecture

### Component: `HandoffQR`
- **Location**: `features/shipments/components/HandoffQR.tsx`
- **Responsibility**: UI rendering, state display, error handling
- **Features**:
  - Displays scannable QR code
  - Shows expiry countdown
  - Handles loading, success, and error states
  - Provides refresh functionality
  - Responsive design for mobile screens
  - Time-sensitive visual indicators (color changes based on remaining time)

### Hook: `useHandoffQR`
- **Location**: `hooks/useHandoffQR.ts`
- **Responsibility**: State management, API integration via React Query
- **Exports**:
  - `useHandoffQR(deliveryId, enabled)`: Fetch existing QR data
  - `useGenerateHandoffQR()`: Generate new QR code
  - `useVerifyHandoffQR()`: Verify scanned QR token

### Service: `shipmentHandoffService`
- **Location**: `services/shipmentHandoffService.ts`
- **Responsibility**: API client interface
- **Methods**:
  - `generateHandoffQR(deliveryId)`: POST request to generate QR
  - `getHandoffQR(deliveryId)`: GET existing QR data
  - `verifyHandoffQR(deliveryId, token)`: POST verify handoff

## 📦 Data Types

### `HandoffQRData`
```typescript
{
  qrData: string;        // Encoded QR value
  expiresAt: string;     // ISO timestamp when QR expires
  deliveryId: string;    // Associated delivery ID
  token: string;         // Unique verification token
}
```

### `QRHandoffToken`
```typescript
{
  id: string;
  deliveryId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  verifiedAt?: string;   // When recipient verified handoff
}
```

## 🎯 Usage Examples

### Basic Usage - Load Existing QR
```tsx
import { HandoffQR } from '@/features/shipments/components';

export function DeliveryDetail({ deliveryId }) {
  return (
    <div>
      <h3>Package Handoff</h3>
      <HandoffQR 
        deliveryId={deliveryId}
        size={256}
        includeLabel={true}
      />
    </div>
  );
}
```

### Auto-Generate QR on Load
```tsx
<HandoffQR 
  deliveryId="del-123"
  driverId="drv-456"
  autoGenerate={true}
  onQRGenerated={(data) => {
    console.log('QR generated:', data);
  }}
  onError={(error) => {
    console.error('Failed to generate:', error);
  }}
/>
```

### Manual Generation with Callback
```tsx
export function HandoffModal({ deliveryId }) {
  const [qrToken, setQrToken] = useState<HandoffQRData | null>(null);

  return (
    <HandoffQR 
      deliveryId={deliveryId}
      onQRGenerated={setQrToken}
      autoGenerate={false}
    />
  );
}
```

### Using the Hook Directly
```tsx
import { useHandoffQR, useGenerateHandoffQR, useVerifyHandoffQR } from '@/hooks/useHandoffQR';

export function DeliveryDriver() {
  const { data: qrData, isLoading } = useHandoffQR('del-123');
  const generateQR = useGenerateHandoffQR();
  const verifyQR = useVerifyHandoffQR();

  const handleGenerateQR = () => {
    generateQR.mutate('del-123');
  };

  const handleVerify = (token: string) => {
    verifyQR.mutate({ deliveryId: 'del-123', token });
  };

  return (
    <div>
      {isLoading ? <div>Loading...</div> : <div>{qrData?.token}</div>}
      <button onClick={handleGenerateQR}>Generate QR</button>
    </div>
  );
}
```

## 🔧 Configuration

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `deliveryId` | string | required | Unique delivery identifier |
| `driverId` | string | optional | Driver ID (required for autoGenerate) |
| `className` | string | '' | Additional CSS classes |
| `size` | number | 256 | QR code pixel size |
| `includeLabel` | boolean | true | Show delivery info & expiry |
| `autoGenerate` | boolean | false | Auto-generate on mount |
| `onQRGenerated` | function | undefined | Callback when QR loads |
| `onError` | function | undefined | Callback on error |

### React Query Configuration

The hook configures React Query with:
- **staleTime**: 5 minutes (data considered fresh for 5 min)
- **gcTime**: 10 minutes (data kept in cache for 10 min)
- **retry**: 2 attempts on failure
- **enabled**: Conditional fetching based on props

## 🧪 Testing

### Run Tests
```bash
npm run test -- hooks/useHandoffQR.test.ts
npm run test -- features/shipments/components/HandoffQR.test.tsx
```

### Test Coverage

#### Hook Tests (`useHandoffQR.test.ts`)
- ✅ Fetch QR data successfully
- ✅ Handle fetch errors
- ✅ Conditional fetching (enabled flag)
- ✅ Empty deliveryId handling
- ✅ Generate QR mutation
- ✅ Verify QR mutation
- ✅ Error handling in mutations

#### Component Tests (`HandoffQR.test.tsx`)
- ✅ Loading state display
- ✅ Success state rendering
- ✅ Error state & retry
- ✅ Custom size rendering
- ✅ Label display toggle
- ✅ Refresh functionality
- ✅ Auto-generate behavior
- ✅ Callback invocations
- ✅ Time-sensitive visual indicators

## 🔗 Backend API Requirements

The implementation expects the following backend endpoints:

### Generate QR Code
```http
POST /api/shipments/:deliveryId/handoff-qr
Request: {}
Response: {
  qrData: string,
  expiresAt: ISO timestamp,
  deliveryId: string,
  token: string
}
```

### Get Existing QR
```http
GET /api/shipments/:deliveryId/handoff-qr
Response: {
  qrData: string,
  expiresAt: ISO timestamp,
  deliveryId: string,
  token: string
}
```

### Verify Handoff
```http
POST /api/shipments/:deliveryId/verify-handoff
Request: { token: string }
Response: {
  id: string,
  deliveryId: string,
  token: string,
  expiresAt: ISO timestamp,
  createdAt: ISO timestamp,
  verifiedAt: ISO timestamp
}
```

## 📱 Mobile Responsiveness

The component is optimized for mobile:
- Scales QR code based on screen size
- Touch-friendly buttons (minimum 44x44px)
- Responsive text sizing
- Proper spacing on small screens

**Recommended usage on mobile:**
```tsx
<HandoffQR 
  deliveryId={deliveryId}
  size={200}  // Adjust for mobile
  includeLabel={true}
/>
```

## 🔐 Security Features

1. **Time-Sensitive Tokens**: QR expires after configured duration
2. **Unique Tokens**: Each QR has a unique, non-guessable token
3. **One-Time Verification**: Token can be verified only once
4. **Secure Transport**: Uses HTTPS for all API calls
5. **JWT Integration**: Uses existing JWT authentication

## ⚠️ Error Handling

The component provides user-friendly error messages:
- Network errors
- Token expiry errors
- Verification failures
- Invalid QR codes

Each error includes:
- User-friendly message
- Technical error details
- Retry button
- Recovery options

## 🚀 Performance Optimizations

1. **React Query Caching**: Prevents unnecessary API calls
2. **Lazy Loading**: Conditional data fetching
3. **Memoization**: Components re-render only when props change
4. **Debounced Refresh**: Prevents rapid re-generation requests
5. **Canvas Rendering**: QRCode uses canvas for performance

## 📝 Implementation Checklist

- [x] Service layer with API integration
- [x] Hook with React Query integration
- [x] Component with full UI/UX
- [x] Comprehensive error handling
- [x] Loading states
- [x] Expiry countdown display
- [x] Mobile optimization
- [x] Unit tests for hook
- [x] Unit tests for component
- [x] TypeScript types
- [x] Documentation
- [x] Accessibility features
- [x] Callback handlers
- [x] Auto-generate option

## 🔄 State Flow

```
Component Mounts
    ↓
useHandoffQR Hook fetches data
    ↓
If autoGenerate: useGenerateHandoffQR mutates
    ↓
Loading state displayed
    ↓
Data arrives: QR rendered
    ↓
useEffect triggers onQRGenerated callback
    ↓
User clicks Refresh
    ↓
useGenerateHandoffQR triggered
    ↓
Cache invalidated, new QR fetched
    ↓
Component updates with new QR & expiry time
```

## 💡 Best Practices

1. **Always provide deliveryId**: Component won't render without it
2. **Use autoGenerate wisely**: Set to true only when needed on mount
3. **Handle callbacks**: Implement onError for better UX
4. **Respect token expiry**: Don't rely on expired QR codes
5. **Test mobile**: Always verify on actual mobile devices
6. **Monitor API**: Track handoff verification success rate

## 📚 Related Files

- `types/shipment.ts` - TypeScript type definitions
- `services/api.ts` - API client configuration
- `hooks/useToast.ts` - Toast notifications
- `lib/utils.ts` - Utility functions
- `jest.config.ts` - Test configuration
- `tailwind.config.ts` - Styling configuration

## 🤝 Contributing

When modifying this implementation:

1. Update tests to match new behavior
2. Update types if API changes
3. Document new props/features
4. Test on mobile devices
5. Ensure backward compatibility
6. Add screenshots to PR

## 📞 Support

For issues or questions about the QR handoff implementation:
1. Check existing test cases for usage examples
2. Review backend API documentation
3. Check component console for error messages
4. Enable debug logging in development mode
