import { renderHook, act } from '@testing-library/react';
import { useExpandableDelivery } from '@/hooks/useExpandableDelivery';

describe('useExpandableDelivery', () => {
  it('should initialize with null expanded delivery ID', () => {
    const { result } = renderHook(() => useExpandableDelivery());

    expect(result.current.expandedDeliveryId).toBeNull();
  });

  it('should toggle expanded state when calling toggleExpanded', () => {
    const { result } = renderHook(() => useExpandableDelivery());
    const deliveryId = 'delivery-123';

    act(() => {
      result.current.toggleExpanded(deliveryId);
    });

    expect(result.current.expandedDeliveryId).toBe(deliveryId);
    expect(result.current.isExpanded(deliveryId)).toBe(true);
  });

  it('should collapse when toggling same delivery twice', () => {
    const { result } = renderHook(() => useExpandableDelivery());
    const deliveryId = 'delivery-123';

    act(() => {
      result.current.toggleExpanded(deliveryId);
    });

    expect(result.current.isExpanded(deliveryId)).toBe(true);

    act(() => {
      result.current.toggleExpanded(deliveryId);
    });

    expect(result.current.isExpanded(deliveryId)).toBe(false);
    expect(result.current.expandedDeliveryId).toBeNull();
  });

  it('should replace expanded delivery when toggling a different one', () => {
    const { result } = renderHook(() => useExpandableDelivery());
    const deliveryId1 = 'delivery-123';
    const deliveryId2 = 'delivery-456';

    act(() => {
      result.current.toggleExpanded(deliveryId1);
    });

    expect(result.current.isExpanded(deliveryId1)).toBe(true);
    expect(result.current.isExpanded(deliveryId2)).toBe(false);

    act(() => {
      result.current.toggleExpanded(deliveryId2);
    });

    expect(result.current.isExpanded(deliveryId1)).toBe(false);
    expect(result.current.isExpanded(deliveryId2)).toBe(true);
    expect(result.current.expandedDeliveryId).toBe(deliveryId2);
  });

  it('should reset expanded state', () => {
    const { result } = renderHook(() => useExpandableDelivery());
    const deliveryId = 'delivery-123';

    act(() => {
      result.current.toggleExpanded(deliveryId);
    });

    expect(result.current.expandedDeliveryId).toBe(deliveryId);

    act(() => {
      result.current.reset();
    });

    expect(result.current.expandedDeliveryId).toBeNull();
    expect(result.current.isExpanded(deliveryId)).toBe(false);
  });

  it('should return correct isExpanded status for different deliveries', () => {
    const { result } = renderHook(() => useExpandableDelivery());
    const deliveryId = 'delivery-123';

    act(() => {
      result.current.toggleExpanded(deliveryId);
    });

    expect(result.current.isExpanded(deliveryId)).toBe(true);
    expect(result.current.isExpanded('delivery-456')).toBe(false);
    expect(result.current.isExpanded('delivery-789')).toBe(false);
  });
});
