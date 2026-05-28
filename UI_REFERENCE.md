# UI Reference & Visual Guide

## 🎨 DeliveryFilters Component Layout

### Visual Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    DELIVERY FILTERS SECTION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🔍 Search by Tracking ID...                        ✕   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────┐  ┌──────────────────────────┐    │
│  │ Status                   │  │ Sort by                  │    │
│  │ ┌──────────────────────┐ │  │ ┌──────────────────────┐ │    │
│  │ │ All Statuses        ▼│ │  │ │ No Sort             ▼│ │    │
│  │ │ Pending              │ │  │ │ Newest First         │ │    │
│  │ │ Accepted             │ │  │ │ Oldest First         │ │    │
│  │ │ In Transit           │ │  │ │                      │ │    │
│  │ │ Delivered            │ │  │ │                      │ │    │
│  │ │ Cancelled            │ │  │ │                      │ │    │
│  │ └──────────────────────┘ │  │ └──────────────────────┘ │    │
│  └──────────────────────────┘  └──────────────────────────┘    │
│                                                                   │
│  Active filters:                                                 │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐       │
│  │ Search: TRK123 │ │ Status: PENDING │ │ Sort: Newest  │       │
│  └────────────────┘ └────────────────┘ └────────────────┘       │
│                                            [ Clear Filters ]     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Features

#### Search Input
```
Icon: 🔍 (Search)
Placeholder: "Search by Tracking ID..."
Features:
  - Real-time local state update
  - Submit on blur (lose focus)
  - Submit on Enter key
  - Clear button appears when text entered
  - Debounce to prevent excessive API calls
```

#### Status Dropdown
```
Label: "Status"
Options:
  - All Statuses        (default - empty filter)
  - Pending             (PENDING)
  - Accepted            (ACCEPTED)
  - In Transit          (IN_TRANSIT)
  - Delivered           (DELIVERED)
  - Cancelled           (CANCELLED)
Features:
  - Single selection
  - Clear by selecting "All Statuses"
  - Persists in URL as ?status=value
```

#### Sort Dropdown
```
Label: "Sort by"
Options:
  - No Sort             (default - no sorting)
  - Newest First        (date-desc - newest at top)
  - Oldest First        (date-asc - oldest at top)
Features:
  - Single selection
  - Clear by selecting "No Sort"
  - Persists in URL as ?sortBy=value
  - Sorts by createdAt field
```

#### Active Filters Display
```
Shows when: hasActiveFilters === true
Displays: Visual badges for each active filter
Badge Format: [Filter Type: Filter Value]
Colors: 
  - Background: Blue (100)
  - Text: Blue (800)
  - Dark mode: Blue (900) bg, Blue (200) text
Example:
  Search: TRK12345  |  Status: DELIVERED  |  Sort: Newest
Button: "Clear Filters" - clears all filters at once
```

---

## 🎯 DeliveryList Component Integration

### Full Page Layout

```
┌────────────────────────────────────────────────────────────────┐
│                         DELIVERIES PAGE                         │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  <h2>Deliveries</h2>                                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         [DELIVERY FILTERS COMPONENT - SEE ABOVE]        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  DELIVERY LIST (Filtered & Sorted Results)              │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ TRK12345                                    [DELIVERED]│  │
│  │  │ Nairobi ➔ Mombasa                                   │ │  │
│  │  │ May 15, 2024 at 10:30 AM                           │ │  │
│  │  │ Escrow: RELEASED                                    │ │  │
│  │  │ Amount: $100.00                                     │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                           │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ TRK12346                                [IN_TRANSIT]│  │
│  │  │ Kisumu ➔ Nakuru                                     │ │  │
│  │  │ May 16, 2024 at 02:15 PM                           │ │  │
│  │  │ Escrow: LOCKED                                      │ │  │
│  │  │ Amount: $75.50                                      │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                           │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ TRK12347                                  [PENDING]│  │
│  │  │ Dar ➔ Arusha                                       │ │  │
│  │  │ May 16, 2024 at 08:45 PM                           │ │  │
│  │  │ Escrow: NOT_LOCKED                                 │ │  │
│  │  │ Amount: $120.00                                     │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

### Empty State

```
┌────────────────────────────────────────────────────────────────┐
│                                                                  │
│              No deliveries found.                              │
│    Try adjusting your filters or creating a new delivery.     │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## 🌗 Dark Mode Appearance

### Light Mode Colors
```
Background: White (#FFFFFF)
Text: Gray-900 (#111827)
Borders: Gray-200 (#E5E7EB)
Focus Ring: Blue-500 (#3B82F6)
Active Badges: Blue-100 bg (#DBEAFE), Blue-800 text (#1E3A8A)
Status Badges:
  - Delivered: Green text on green background
  - In Transit: Blue text on blue background
  - Pending: Primary text on primary background
  - Cancelled: Red text on red background
```

### Dark Mode Colors
```
Background: Gray-800 (#1F2937)
Text: Gray-100 (#F3F4F6)
Borders: Gray-700 (#374151)
Focus Ring: Blue-500 (#3B82F6)
Active Badges: Blue-900 bg (#111E3A), Blue-200 text (#BFDBFE)
Status Badges:
  - Delivered: Green text on green background (dark variant)
  - In Transit: Blue text on blue background (dark variant)
  - Pending: Primary text on primary background (dark variant)
  - Cancelled: Red text on red background (dark variant)
```

---

## 📱 Responsive Breakpoints

### Mobile (< 768px)
```
┌──────────────────────────────┐
│   DELIVERY FILTERS SECTION   │
├──────────────────────────────┤
│  [Search Input]              │
│  [Status Dropdown]           │
│  [Sort Dropdown]             │
│  [Active Filters + Clear]    │
└──────────────────────────────┘

Delivery cards stack vertically, full width
```

### Tablet (768px - 1024px)
```
┌──────────────────────────────────────────┐
│         DELIVERY FILTERS SECTION         │
├──────────────────────────────────────────┤
│  [Search Input - Full Width]             │
│  [Status Dropdown] [Sort Dropdown]       │
│  [Active Filters + Clear]                │
└──────────────────────────────────────────┘

Delivery cards arranged in 2 column layout
```

### Desktop (> 1024px)
```
┌──────────────────────────────────────────────────┐
│              DELIVERY FILTERS SECTION            │
├──────────────────────────────────────────────────┤
│  [Search Input - 100%]                          │
│  [Status Dropdown - 50%] [Sort Dropdown - 50%]  │
│  [Active Filters + Clear]                        │
└──────────────────────────────────────────────────┘

Delivery cards displayed in full layout
```

---

## 🎨 Status Badge Colors

### Status Color Mapping

```
PENDING      → Primary Color (Blue)
               Background: Primary-100 | Text: Primary-900
               
ACCEPTED     → Primary Color (Blue)
               Background: Primary-100 | Text: Primary-900
               
IN_TRANSIT   → Info Color (Blue)
               Background: Blue-100 | Text: Blue-900
               
DELIVERED    → Success Color (Green)
               Background: Success (Green) | Text: White
               
CANCELLED    → Danger Color (Red)
               Background: Red-100 | Text: Red-900
```

---

## ⌨️ Keyboard Navigation

### Tab Order
1. Search input
2. Clear search button (if search text present)
3. Status dropdown
4. Sort dropdown
5. Clear all filters button (if filters active)
6. First delivery item
7. ... more delivery items

### Keyboard Shortcuts
- `Enter` in search input → Apply search
- `Escape` in any input → Clear that input
- `Tab` → Move to next element
- `Shift+Tab` → Move to previous element
- `Space` → Toggle dropdown
- `↑/↓` → Navigate dropdown options

---

## 🔄 Data Flow Visualization

### User Interacts with Search

```
User types in search box
        ↓
onChange event updates local state
        ↓
User presses Enter or loses focus
        ↓
onBlur/onKeyDown handler fires
        ↓
updateFilters({ search: 'value' })
        ↓
URL query params updated: ?search=value
        ↓
Router pushes new URL
        ↓
useDeliveryFilters hook reads new params
        ↓
DeliveryList receives new filter state
        ↓
useDeliveries hook receives filters
        ↓
React Query invalidates cache
        ↓
deliveriesService.getDeliveries(filters) called
        ↓
API request: GET /api/deliveries?search=value
        ↓
Backend returns filtered results
        ↓
React Query caches results
        ↓
Component re-renders with new data
```

### User Clicks Status Filter

```
User clicks status dropdown
        ↓
onChange event fires
        ↓
updateFilters({ status: 'DELIVERED' })
        ↓
URL query params updated: ?status=DELIVERED
        ↓
Router pushes new URL (shallow routing, no scroll)
        ↓
[Same as above from step 5]
```

### User Clicks Clear All Filters

```
User clicks "Clear Filters" button
        ↓
clearFilters() called
        ↓
Router.push('') - clears all query params
        ↓
useDeliveryFilters detects no search params
        ↓
All filter values set to undefined
        ↓
useDeliveries receives empty filters object
        ↓
deliveriesService.getDeliveries() called without params
        ↓
API request: GET /api/deliveries (no filters)
        ↓
Backend returns all deliveries
        ↓
Component re-renders with all data
```

---

## 📊 State Management Flow

### URL State → Component State

```
URL: /deliveries?search=TRK&status=DELIVERED&sortBy=date-desc

↓

useSearchParams() reads URL
↓
parseQuery params
↓
{
  search: 'TRK',
  status: 'DELIVERED',
  sortBy: 'date-desc',
  hasActiveFilters: true
}

↓

DeliveryFilters component receives state
↓
Displays filters with current values
Displays active filter badges
Enables "Clear Filters" button

↓

DeliveryList receives state
↓
Passes to useDeliveries hook
↓
API called with filters
↓
Data rendered with filter applied
```

---

## 🎯 Interaction Patterns

### Pattern 1: Single Filter Application
```
User selects Status → URL updates → Data refetches → List updates
```

### Pattern 2: Multi-Filter Application
```
User applies search
User changes status
User selects sort
(All while others remain active)
→ URL has ?search=X&status=Y&sortBy=Z
→ Data refetches with all filters
→ List updates with fully filtered data
```

### Pattern 3: Filter Modification
```
Current: ?search=TRK&status=DELIVERED
User changes status to PENDING
→ URL becomes: ?search=TRK&status=PENDING
→ Old data cleared
→ New filtered data fetched
→ List updates
```

### Pattern 4: Filter Clearing
```
Current: ?search=TRK&status=DELIVERED&sortBy=date-desc
User clicks "Clear Filters"
→ URL becomes: /deliveries
→ All filter values reset to undefined
→ useDeliveries receives empty object
→ API called without filters
→ All deliveries returned
→ List updates to show everything
```

---

## 🧪 Testing Scenarios

### Test Scenario 1: Search Filter
```
1. Enter tracking ID in search
2. Press Enter or blur
3. Verify URL has ?search=value
4. Verify API called with search param
5. Verify results show only matching deliveries
6. Refresh page
7. Verify search filter still active
```

### Test Scenario 2: Status Filter
```
1. Select status from dropdown
2. Verify URL has ?status=value
3. Verify API called with status param
4. Verify only deliveries with that status shown
5. Change status
6. Verify URL updates
7. Verify data refreshes
```

### Test Scenario 3: Multi-Filter Combo
```
1. Apply search filter
2. Apply status filter
3. Apply sort
4. Verify URL has all three params
5. Verify data correctly filtered AND sorted
6. Refresh page
7. Verify all filters still active
8. Modify one filter
9. Verify others remain active
```

### Test Scenario 4: Clear Filters
```
1. Apply multiple filters
2. Verify active filter badges show
3. Click "Clear Filters"
4. Verify URL cleared
5. Verify all filter dropdowns reset
6. Verify data shows all deliveries
```

---

## ✨ Key Features Visualization

### ✅ Feature: URL State Persistence
```
User applies filters
→ URL encodes filter state
→ User bookmarks page
→ User shares URL with colleague
→ Colleague opens URL
→ Same filters are applied automatically
```

### ✅ Feature: Active Filters Display
```
User applies: search, status, sort
→ Each filter appears as visual badge
→ Shows filter name and value
→ User can see at a glance what's filtered
→ Click "Clear Filters" to reset all
```

### ✅ Feature: Responsive Design
```
Desktop:   Filters in 2-column grid, full layout
Tablet:    Filters stack vertically
Mobile:    Everything single column, optimized for touch
```

### ✅ Feature: Accessibility
```
All inputs have labels
Keyboard navigation works
Tab order is logical
ARIA labels on buttons
Color not only indicator (badges have text)
Dark mode respects prefers-color-scheme
```

---

**UI Reference Complete - Ready for Implementation! ✨**
