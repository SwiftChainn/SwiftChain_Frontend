'use client';

import { useState, useCallback } from 'react';

/**
 * Hook to manage expandable state for delivery rows
 * Handles toggle and reset of expanded delivery IDs
 */
export function useExpandableDelivery() {
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);

  /**
   * Toggle expanded state for a delivery
   * If the delivery is already expanded, it will be collapsed
   * If another delivery is expanded, it will be replaced
   */
  const toggleExpanded = useCallback((deliveryId: string) => {
    setExpandedDeliveryId((prevId) => (prevId === deliveryId ? null : deliveryId));
  }, []);

  /**
   * Check if a specific delivery is expanded
   */
  const isExpanded = useCallback(
    (deliveryId: string): boolean => expandedDeliveryId === deliveryId,
    [expandedDeliveryId]
  );

  /**
   * Reset expanded state
   */
  const reset = useCallback(() => {
    setExpandedDeliveryId(null);
  }, []);

  return {
    expandedDeliveryId,
    toggleExpanded,
    isExpanded,
    reset,
  };
}
