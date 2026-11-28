'use client';

import { useState, useCallback, useEffect } from 'react';
import { proofService } from '@/services/proofService';
import type { ProofDocument } from '@/services/proofService';

export interface UseDeliveryProofGalleryReturn {
  /** Proof documents for the delivery, fetched from the backend API. */
  documents: ProofDocument[];
  /** Whether a fetch is currently in flight. */
  isLoading: boolean;
  /** Error message from the most recent fetch, if any. */
  error: string | null;
  /** Re-fetch proof documents from the backend API. */
  refetch: () => Promise<void>;
}

/**
 * Hook that retrieves delivery proof documents from the backend API.
 * Follows the Component -> Hook -> Service layered architecture.
 * No inline mock objects; all data comes from proofService (backend API).
 */
export function useDeliveryProofGallery(
  deliveryId: string
): UseDeliveryProofGalleryReturn {
  const [documents, setDocuments] = useState<ProofDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!deliveryId) {
      setDocuments([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await proofService.getProofDocuments(deliveryId);
      // proofService returns { success, message, data } where data is the array
      const payload = response.data ?? response;
      const items = Array.isArray(payload) ? payload : payload?.data ?? [];
      setDocuments(items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load proof documents'
      );
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    isLoading,
    error,
    refetch: fetchDocuments,
  };
}
