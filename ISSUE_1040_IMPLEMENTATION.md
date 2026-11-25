# Issue #1040: Multi-Lingual Support for FAQ and Help Center

## Overview

This implementation adds multi-lingual support (English, Nigerian Pidgin, Hausa, Yoruba, Igbo) to the FAQ and Help Center UI with instant language switching, persistent storage, and backend API integration.

## Supported Languages

| Code | Language | Label |
|------|----------|-------|
| en | English | English |
| pcm | Nigerian Pidgin | Pidgin |
| ha | Hausa | Hausa |
| yo | Yoruba | Yoruba |
| ig | Igbo | Igbo |

## Features

✓ **Instant Language Switching**: No page reload required  
✓ **Persistent Selection**: Saved to localStorage  
✓ **Language Dropdown**: Lightweight selector in Help Center header  
✓ **Backend Integration**: FAQ fetches translated content from API  
✓ **SSR Safe**: Handles server/client hydration mismatch  
✓ **Component → Hook → Service Pattern**: Proper layering  
✓ **React Query Caching**: Locale-specific query keys  

## Architecture

```
FaqHelpCenter (Component)
  ├─ useLanguage (Hook)
  │   └─ languageService (Service - localStorage)
  │
  └─ useFaq (Hook)
      └─ faqService (Service - API)
          └─ Backend /api/faq?lang={locale}
```

## Context: LanguageContext.tsx

**Location**: `contexts/LanguageContext.tsx`

Provides global language state using React Context:

```tsx
export type Locale = 'en' | 'pcm' | 'ha' | 'yo' | 'ig';

export interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const LANGUAGE_LABELS: Record<Locale, string> = {
  en: 'English',
  pcm: 'Pidgin',
  ha: 'Hausa',
  yo: 'Yoruba',
  ig: 'Igbo',
};
```

### Provider Usage

Wraps the entire app (in layout or Providers component):

```tsx
<LanguageProvider>
  <YourApp />
</LanguageProvider>
```

## Hook: useLanguage.ts

**Location**: `hooks/useLanguage.ts`

Manages language persistence and synchronization:

```tsx
export function useLanguage(): UseLanguageReturn {
  const { locale, setLocale } = useLanguageContext();

  useEffect(() => {
    // Restore saved language on mount
    const saved = languageService.getLanguage();
    if (saved !== locale) {
      setLocale(saved);
    }
  }, []);

  const handleSetLocale = useCallback((next: Locale) => {
    languageService.saveLanguage(next);  // Persist to localStorage
    setLocale(next);                      // Update context
  }, [setLocale]);

  return {
    locale,
    setLocale: handleSetLocale,
  };
}
```

### Key Responsibilities

1. **Restore on Mount**: Reads from localStorage, hydrates context
2. **Persist on Change**: Saves selected locale to localStorage
3. **Context Coordination**: Syncs with LanguageContext
4. **SSR Safety**: Returns 'en' on server (window is undefined)

## Service: languageService.ts

**Location**: `services/languageService.ts`

Handles localStorage persistence with SSR safety:

```tsx
const STORAGE_KEY = 'swiftchain-language';

export const languageService = {
  getLanguage(): Locale {
    if (typeof window === 'undefined') return 'en';
    return (localStorage.getItem(STORAGE_KEY) as Locale) ?? 'en';
  },

  saveLanguage(locale: Locale): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, locale);
  },
};
```

### SSR Considerations

- Checks `typeof window === 'undefined'` for server-side
- Returns safe default ('en') on server
- Client-side hydration mismatch avoided by useEffect restoration

## Hook: useFaq.ts

**Location**: `hooks/useFaq.ts`

Fetches FAQ data for the current locale:

```tsx
export const FAQ_QUERY_KEY = (locale: Locale) => ['faq', locale] as const;

export function useFaq(locale: Locale = 'en'): UseFaqReturn {
  const { data, isLoading, isError, error } = useQuery<FaqResponse, Error>({
    queryKey: FAQ_QUERY_KEY(locale),  // Changes when locale changes
    queryFn: () => faqService.getFaqs(locale),
  });

  return {
    categories: data ?? [],
    isLoading,
    isError,
    error: error ?? null,
  };
}
```

### React Query Integration

- **Query Key**: Includes locale to trigger fetch on language change
- **Automatic Refetch**: Switching locale automatically fetches new data
- **Caching**: Each locale's data cached separately
- **Error Handling**: Surfaces errors to component

## Component: FaqHelpCenter.tsx

**Location**: `components/support/FaqHelpCenter.tsx`

Orchestrates language switching and FAQ display:

```tsx
export function FaqHelpCenter() {
  const { locale, setLocale } = useLanguage();
  const { categories, isLoading, isError } = useFaq(locale);
  const LOCALES = Object.keys(LANGUAGE_LABELS) as Locale[];

  return (
    <FaqPageShell>
      {/* Language selector */}
      <div className="flex justify-end">
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="rounded-full..."
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {isLoading && <div>Loading help articles…</div>}

      {/* Error state */}
      {isError && <div>Failed to load FAQ. Please try again later.</div>}

      {/* Empty state */}
      {!isLoading && !isError && categories.length === 0 && (
        <div>No FAQ articles available.</div>
      )}

      {/* FAQ categories */}
      {!isLoading && !isError && categories.length > 0 && (
        <div className="space-y-6">
          {categories.map((category) => (
            <AccordionSection key={category.id} category={category} />
          ))}
        </div>
      )}
    </FaqPageShell>
  );
}
```

### Flow

1. User lands on FAQ page → useLanguage restores saved locale from localStorage
2. User changes language dropdown → setLocale updates context AND localStorage
3. useFaq detects locale change → query key changes → React Query refetches data
4. Categories render with translated content

## Service: faqService.ts

**Location**: `services/faqService.ts`

Fetches FAQ data from backend:

```tsx
export const faqService = {
  async getFaqs(locale: Locale = 'en'): Promise<FaqResponse> {
    const { data } = await axios.get<FaqResponse>(
      `${API_BASE_URL}/api/faq?lang=${locale}`,
    );
    return data;
  },
};
```

### Backend API Contract

**Endpoint**: `GET /api/faq?lang={locale}`

**Response**:
```json
[
  {
    "id": "getting-started",
    "category": "Getting Started",
    "items": [
      {
        "id": "how-to-sign-up",
        "question": "How do I sign up?",
        "answer": "To sign up, click the register button..."
      }
    ]
  }
]
```

**Query Parameter**: `lang` - defaults to 'en'

## Component: AccordionSection.tsx

**Location**: `components/support/AccordionSection.tsx`

Renders a FAQ category with expandable items:

```tsx
export function AccordionSection({ category }: AccordionSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5">
      <h2 className="mb-4 border-b border-cyan-500/30 pb-3 text-lg font-semibold text-slate-100">
        {category.category}
      </h2>
      <div className="space-y-1">
        {category.items.map((item) => (
          <Accordion key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
```

Consumes translated data directly from props (no locale awareness needed).

## Testing

**Location**: `hooks/__tests__/useLanguage.test.ts`

### Test Coverage

✓ Renders language selector dropdown  
✓ Fetches FAQ for selected locale  
✓ Persists locale via languageService on change  
✓ Restores saved locale on mount  
✓ Handles loading and error states  
✓ Mocks faqService for different locales  

### Example Test

```tsx
it('persists locale via languageService when setLocale is called', () => {
  const { result } = renderHook(() => useLanguage(), { wrapper });

  act(() => {
    result.current.setLocale('ha');
  });

  expect(languageService.saveLanguage).toHaveBeenCalledWith('ha');
});
```

## UI/UX Details

### Language Dropdown

```tsx
<select
  id="language-select"
  value={locale}
  onChange={(e) => setLocale(e.target.value as Locale)}
  className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm font-medium text-slate-100"
>
  {LOCALES.map((l) => (
    <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>
  ))}
</select>
```

**Styling**: Matches Help Center dark theme, positioned top-right

**Behavior**: 
- Shows current locale as selected value
- Options displayed with labels (English, Pidgin, Hausa, etc.)
- Instant change → no button needed

### Loading States

```
"Loading help articles…"
```

Shows during FAQ fetch on language change.

### Error State

```
"Failed to load FAQ. Please try again later."
```

Displayed if backend request fails. Component recovers gracefully.

### Empty State

```
"No FAQ articles available."
```

Shown if backend returns empty array.

## Browser LocalStorage

**Key**: `swiftchain-language`  
**Value**: One of ['en', 'pcm', 'ha', 'yo', 'ig']  
**Persistence**: Survives tab close, page reload

Example:
```
localStorage.getItem('swiftchain-language') → 'ha'
```

## Performance

- **Query Caching**: React Query caches each locale's FAQ separately
- **No Full Refetch**: Switching back to previous locale uses cached data
- **Minimal Payload**: Only FAQ data fetched (no UI strings embedded)
- **Network**: Single API call per language on first switch

## Accessibility

- Language selector has id and label
- Keyboard navigation: Tab through dropdown, arrow keys to select
- Screen readers announce language options
- Semantic HTML `<select>` element

## Edge Cases

**SSR Hydration**:
- Server renders with default 'en'
- Client hydrates, restores from localStorage
- useEffect ensures client matches localStorage, not server default

**Offline**:
- localStorage persists across offline sessions
- FAQ still loads from cache if accessed before going offline

**Manual localStorage Edit**:
- If user sets invalid locale value: defaults to 'en'
- Type safety via `as Locale` with fallback

## Future Improvements

- [ ] Language-specific FAQ editing in admin panel
- [ ] Right-to-left (RTL) language support
- [ ] Language-specific video content
- [ ] Translate hardcoded UI strings (not just FAQ)
- [ ] Language detection from browser preferences
