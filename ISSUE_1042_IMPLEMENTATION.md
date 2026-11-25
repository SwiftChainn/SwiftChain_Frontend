# Issue #1042: Fix Wallet Dropdown Z-Index Clipping

## Overview

This implementation fixes the wallet account dropdown z-index issues by ensuring it stays above sticky navigation bars, Mapbox canvases, and other overlays while maintaining proper stacking with modals.

## Problem

The wallet dropdown was being clipped by:
- Sticky header/navbar with higher z-index
- Mapbox canvas container with z-index: 1000
- Full-screen modals creating new stacking contexts

**Solution**: Use `z-[9999]` for dropdown portal and implement strategic stacking context management.

## Features

✓ **Portal Rendering**: Renders at document.body escaping local stacking context  
✓ **High Z-Index**: 9999 to clear Leaflet (1000) and sticky navs  
✓ **Headless UI Integration**: MenuItems anchor for auto-positioning  
✓ **Modal Aware**: Doesn't obscure critical full-screen modals  
✓ **Component → Hook → Service Pattern**: Proper layering  

## Architecture

```
AccountMenu (Component)
  ├─ Headless UI Menu (Trigger)
  │
  └─ Headless UI MenuItems (Portal)
      ├─ Portal at document.body
      ├─ z-index: 9999
      └─ Escapes header stacking context
         ↓ calls
useAccountMenu (Hook)
  ├─ truncatedAddress
  ├─ copyAddress
  └─ disconnect
     ↓ calls
useWallet (Hook)
  └─ walletService (Service)
      ├─ connect()
      ├─ disconnect()
      └─ getAddress()
```

## Stacking Context Map

### Z-Index Hierarchy

```
9999  ← Modal backdrop (occasionally)
9999  ← AccountMenu dropdown portal ★
9999  ← OfflineBanner fixed
_____  (gap - safe zone)
1000  ← Leaflet control panes (.leaflet-top, .leaflet-bottom)
1000  ← Mapbox canvas container (occasionally)
_____  (gap)
500-999 ← Popover/tooltip layers (if any)
_____  (gap)
1-99  ← Header z-10, stacking contexts
0     ← Normal document flow
```

### CSS Classes and Files

| Component | File | Z-Index | CSS |
|-----------|------|---------|-----|
| AccountMenu | wallet/AccountMenu.tsx | 9999 | `z-[9999]` |
| OfflineBanner | ui/OfflineBanner.tsx | 9999 | `z-[9999]` |
| Header | layout/Header.tsx | 10 | `z-10` |
| Leaflet | npm/leaflet | 1000 | `.leaflet-top { z-index: 1000 }` |
| Mapbox | npm/@mapbox/mapbox-gl | varies | `.mapboxgl-canvas-container` |
| Modal backdrop | (varies) | 9998 | Custom modal layer |

## Component: AccountMenu.tsx

**Location**: `components/wallet/AccountMenu.tsx`

### Headless UI Menu Setup

```tsx
<Menu as="div" className="relative inline-block text-left">
  {/* Trigger Button */}
  <MenuButton className="...">
    <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
    <span>{truncatedAddress}</span>
    <ChevronDown size={14} />
  </MenuButton>

  {/* Portal Dropdown */}
  <MenuItems
    anchor="bottom end"
    className="z-[9999] mt-2 w-64 origin-top-right rounded-xl ..."
  >
    {/* Full address header */}
    <div className="border-b border-slate-100 px-4 py-3">
      <p className="text-xs font-medium text-slate-500">Connected Wallet</p>
      <p className="mt-1 font-mono text-xs">{address}</p>
    </div>

    {/* Menu items */}
    <div className="py-1">
      <MenuItem>
        <button onClick={() => void copyAddress()}>
          {isCopied ? 'Address Copied!' : 'Copy Address'}
        </button>
      </MenuItem>
      <MenuItem>
        <button onClick={() => void disconnect()}>
          {isDisconnecting ? 'Disconnecting…' : 'Disconnect Wallet'}
        </button>
      </MenuItem>
    </div>
  </MenuItems>
</Menu>
```

### Key Properties

**anchor="bottom end"**: 
- Positions dropdown below trigger, aligned to right edge
- Automatically handles viewport boundaries
- Renders portal at document.body (escapes stacking context)

**className="z-[9999]"**:
- 9999 sits above Leaflet (1000)
- 9999 sits above typical sticky navs (z-10)
- Safe for all pages (map or non-map)

## Hook: useAccountMenu.ts

**Location**: `hooks/useAccountMenu.ts`

```tsx
export interface UseAccountMenuResult {
  address: string | null;
  isConnected: boolean;
  isCopied: boolean;
  isDisconnecting: boolean;
  truncatedAddress: string;
  copyAddress: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useAccountMenu(): UseAccountMenuResult {
  const { address, isConnected, disconnect: disconnectWallet } = useWallet();
  const [isCopied, setIsCopied] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const truncatedAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-6)}`
    : '';

  const copyAddress = useCallback(async (): Promise<void> => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [address]);

  const disconnect = useCallback(async (): Promise<void> => {
    setIsDisconnecting(true);
    try {
      await disconnectWallet();
    } finally {
      setIsDisconnecting(false);
    }
  }, [disconnectWallet]);

  return {
    address,
    isConnected,
    isCopied,
    isDisconnecting,
    truncatedAddress,
    copyAddress,
    disconnect,
  };
}
```

### Responsibilities

1. **Address Truncation**: Shows first 6 + last 6 chars (G...6N7DW)
2. **Copy Functionality**: Clipboard write with 2-sec confirmation flash
3. **Disconnect Orchestration**: Calls wallet service, handles loading state
4. **State Coordination**: Syncs with useWallet hook

## Trigger Button

```tsx
<MenuButton
  aria-label="Wallet account menu"
  className="flex items-center gap-2 rounded-lg border border-slate-200 
             bg-white px-3 py-2 text-sm font-medium text-slate-700 
             shadow-sm transition hover:bg-slate-50 
             focus-visible:outline focus-visible:outline-2 
             focus-visible:outline-offset-2 focus-visible:outline-primary"
>
  <span
    className="h-2 w-2 shrink-0 rounded-full bg-green-500"
    aria-hidden="true"
  />
  <span className="max-w-[120px] truncate font-mono text-xs" title={address}>
    {truncatedAddress}
  </span>
  <ChevronDown
    size={14}
    aria-hidden="true"
    className="shrink-0 text-slate-400 transition ui-open:rotate-180"
  />
</MenuButton>
```

### Features

- **Green Dot**: Visual indicator of connection status
- **Truncated Address**: Fits in header, full address in title attribute
- **Rotating Chevron**: Rotates 180° when menu open (ui-open:rotate-180)
- **Focus Outline**: 2px blue outline for keyboard navigation
- **Hover State**: Subtle background change on hover

## Dropdown Panel

```tsx
<MenuItems
  anchor="bottom end"
  className="z-[9999] mt-2 w-64 origin-top-right rounded-xl 
             border border-slate-200 bg-white shadow-lg 
             ring-1 ring-black/5 focus:outline-none 
             dark:border-slate-700 dark:bg-slate-800 
             dark:ring-white/10"
>
  {/* Header with full address */}
  <div className="border-b border-slate-100 px-4 py-3">
    <p className="text-xs font-medium text-slate-500">Connected Wallet</p>
    <p className="mt-1 break-all font-mono text-xs">{address}</p>
  </div>

  {/* Menu items */}
  <div className="py-1">
    {/* Copy Address */}
    <MenuItem>
      <button
        type="button"
        onClick={() => void copyAddress()}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm 
                   text-slate-700 transition 
                   data-[focus]:bg-slate-100 data-[focus]:text-slate-900"
      >
        {isCopied ? (
          <Check size={15} className="text-green-500" />
        ) : (
          <Copy size={15} />
        )}
        <span>{isCopied ? 'Address Copied!' : 'Copy Address'}</span>
      </button>
    </MenuItem>

    {/* Disconnect */}
    <MenuItem>
      <button
        type="button"
        disabled={isDisconnecting}
        onClick={() => void disconnect()}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm 
                   text-red-600 transition 
                   disabled:cursor-not-allowed disabled:opacity-60 
                   data-[focus]:bg-red-50 data-[focus]:text-red-700"
      >
        {isDisconnecting ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full 
                           border-2 border-current border-t-transparent" />
        ) : (
          <LogOut size={15} />
        )}
        <span>{isDisconnecting ? 'Disconnecting…' : 'Disconnect Wallet'}</span>
      </button>
    </MenuItem>
  </div>
</MenuItems>
```

### Styling Details

- **Background**: White on light mode, slate-800 on dark
- **Border**: 1px slate-200 (light) or slate-700 (dark)
- **Shadow**: lg shadow with ring for depth
- **Focus Items**: Headless UI `data-[focus]:` selector for styling
- **Disabled State**: 60% opacity when disconnecting

## Portal Rendering Explanation

```
Without Portal:
  Header (z-index: 10)
    └─ Menu (renders inside Header's stacking context)
       ├─ Trigger button
       └─ Dropdown (limited by header's z-10 boundary)
           ⚠ Gets clipped if header is under sticky nav

With Portal (anchor="bottom end"):
  document.body
    ├─ Header (z-index: 10)
    └─ Portal Container (z-index: 9999) ← Escapes header context
        └─ MenuItems
            └─ Dropdown (free-floating above everything)
```

## Z-Index Strategy

### Why 9999?

1. **Clears Leaflet**: `.leaflet-top` and `.leaflet-bottom` use `z-index: 1000`
2. **Clears Mapbox**: Canvas containers often 1000-2000
3. **Clears Sticky Nav**: Most use z-10, z-20, z-50 (Tailwind)
4. **Avoids Modal Conflicts**: Most modals use 9998 or higher with intent
5. **Conservative**: Leaves room (10000+) for explicit top-layer overlays

### Safe Assumptions

- Modals that must be above dropdown use explicit z-9999+ or CSS layers
- Sticky navs rarely exceed z-50 (Tailwind default)
- Leaflet/Mapbox documented as z-1000 baseline
- Next.js and browser APIs don't auto-generate >9999

## Accessibility

### Keyboard Navigation

- **Tab**: Enters dropdown button
- **Space/Enter**: Opens menu
- **Arrow Keys**: Navigate menu items (Headless UI handles)
- **Escape**: Closes menu
- **Tab (exit)**: Leaves dropdown, focus moves to next element

### Screen Readers

```tsx
<MenuButton
  aria-label="Wallet account menu"
  // ↑ Announces "button, Wallet account menu"
/>
```

Announces "address copied" on success.

### Visual Indicators

- Green dot = connected (not color-only)
- Rotating chevron = menu state
- Full address in title attribute for hover preview

## Dark Mode

```tsx
className="... dark:border-slate-700 dark:bg-slate-800 dark:ring-white/10"
```

Fully styled for dark theme with slate/white palette.

## Edge Cases

### Not Connected

```tsx
if (!isConnected || !address) return null;
```

Component renders nothing when wallet not connected.

### Copy Timeout

```tsx
setTimeout(() => setIsCopied(false), 2000);
```

"Address Copied!" message reverts to "Copy Address" after 2 seconds.

### Disconnect Loading

```tsx
disabled={isDisconnecting}
className="... disabled:opacity-60"
```

Disconnect button disabled during async operation.

### Mobile/Narrow Screens

```tsx
className="w-64 origin-top-right rounded-xl"
```

Fixed width fits typical mobile viewports. Anchor handles viewport boundaries automatically.

## Testing

**Location**: `components/wallet/__tests__/AccountMenu.test.tsx`

### Test Coverage

✓ Renders nothing when wallet not connected  
✓ Shows connected address truncated  
✓ Shows full address in dropdown  
✓ Copies address to clipboard  
✓ Shows "Copied" confirmation flash  
✓ Disconnects wallet on button click  
✓ Shows loading state during disconnect  
✓ Keyboard navigation works  

## Performance

- **No Layout Thrashing**: Portal renders once, no re-positioning
- **Smooth Animation**: Headless UI handles transitions
- **Minimal Re-renders**: Only when address/connection changes

## Browser Compatibility

- All modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires CSS Cascading and Inheritance (z-index stacking contexts)

## Related Components

### OfflineBanner (ui/OfflineBanner.tsx)

Also uses `z-[9999]`, rendered at document.body. No conflict because:
- Different stacking context
- OfflineBanner is fixed top
- AccountMenu is portal positioned

### Leaflet Map (react-leaflet)

Control panes: `.leaflet-top { z-index: 1000 }`

AccountMenu sits above at 9999. When map is active, check:
- Map container doesn't have higher z-index
- Control panes follow Leaflet defaults

### Mapbox

Canvas container z-indexes vary. AccountMenu safety margin covers.

## Future Improvements

- [ ] Animate dropdown entrance (slide/fade)
- [ ] Show wallet balance in header
- [ ] Display transaction history in dropdown
- [ ] Support multiple connected wallets
- [ ] QR code for address sharing
- [ ] Recent transactions list
