'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { breadcrumbService } from '@/services/breadcrumbService';

export interface Breadcrumb {
  label: string;
  href: string;
  isLast: boolean;
}

export interface UseBreadcrumbsReturn {
  breadcrumbs: Breadcrumb[];
  loading: boolean;
  error: Error | null;
}

const formatSlug = (slug: string) => {
  return slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const isGuid = (slug: string) => {
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidRegex.test(slug);
};

const isNumeric = (slug: string) => {
  return /^\d+$/.test(slug);
};

// Cache for label lookups to prevent duplicate API calls
const labelCache = new Map<string, { label: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedLabel = (key: string): string | null => {
  const cached = labelCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.label;
  }
  labelCache.delete(key);
  return null;
};

const setCachedLabel = (key: string, label: string) => {
  labelCache.set(key, { label, timestamp: Date.now() });
};

export const useBreadcrumbs = (): UseBreadcrumbsReturn => {
  const pathname = usePathname();
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;

    const generateBreadcrumbs = async () => {
      setLoading(true);
      setError(null);

      try {
        const pathSegments = pathname.split('/').filter((segment) => segment !== '');

        const breadcrumbList: Breadcrumb[] = [];
        let currentHref = '';

        // Add Home
        breadcrumbList.push({
          label: 'Home',
          href: '/',
          isLast: pathSegments.length === 0,
        });

        for (let i = 0; i < pathSegments.length; i++) {
          if (!activeRef.current) return;

          const segment = pathSegments[i];
          currentHref += `/${segment}`;

          let label = formatSlug(segment);

          // Check if the segment is likely an ID (GUID or Numeric)
          if (isGuid(segment) || (isNumeric(segment) && i > 0)) {
            const parentSegment = pathSegments[i - 1];
            const cacheKey = `${parentSegment}:${segment}`;

            // Check cache first
            const cachedLabel = getCachedLabel(cacheKey);
            if (cachedLabel) {
              label = cachedLabel;
            } else {
              try {
                // Try to fetch a friendly name or mapped label for this resource
                const fetchedLabel = await breadcrumbService.getLabelForChild(
                  parentSegment,
                  segment
                );
                label = fetchedLabel;
                setCachedLabel(cacheKey, fetchedLabel);
              } catch (err) {
                // Log error but continue with fallback label
                console.warn(`Failed to fetch label for ${parentSegment}/${segment}:`, err);
              }
            }
          }

          breadcrumbList.push({
            label,
            href: currentHref,
            isLast: i === pathSegments.length - 1,
          });
        }

        if (activeRef.current) {
          setBreadcrumbs(breadcrumbList);
          setLoading(false);
        }
      } catch (err) {
        if (activeRef.current) {
          const error = err instanceof Error ? err : new Error('Failed to generate breadcrumbs');
          setError(error);
          setLoading(false);
        }
      }
    };

    generateBreadcrumbs();

    return () => {
      activeRef.current = false;
    };
  }, [pathname]);

  return { breadcrumbs, loading, error };
};
