/**
 * useAppLayout Hook
 * Manages application layout state including sidebar visibility and responsive behavior
 * Integrates with layoutService for data fetching
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { layoutService, NavItem, LayoutConfig } from '@/services/layoutService';
import { useUser } from '@/hooks/useUser';

export interface AppLayoutState {
  isLoading: boolean;
  error: string | null;
  isMobile: boolean;
  sidebarOpen: boolean;
  navigationItems: NavItem[];
  layoutConfig: LayoutConfig | null;
  sidebarCollapsed: boolean;
}

/**
 * Hook that manages the application layout state
 * Handles responsive behavior, sidebar state, and data fetching
 */
export function useAppLayout() {
  const { profile } = useUser();
  const [state, setState] = useState<AppLayoutState>({
    isLoading: true,
    error: null,
    isMobile: false,
    sidebarOpen: false,
    navigationItems: [],
    layoutConfig: null,
    sidebarCollapsed: false,
  });

  /**
   * Initialize layout on mount
   */
  useEffect(() => {
    const initializeLayout = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Fetch layout configuration and navigation items in parallel
        const [configResponse, navResponse, prefsResponse] = await Promise.all([
          layoutService.getLayoutConfig(),
          layoutService.getNavigationItems(),
          layoutService.getUserLayoutPreferences(),
        ]);

        // Filter navigation items based on user role
        let filteredNav = navResponse.data || [];
        if (profile?.id) {
          // In a real app, filter based on user role from profile
          // For now, show all items as placeholder
        }

        setState((prev) => ({
          ...prev,
          layoutConfig: configResponse.data || null,
          navigationItems: filteredNav,
          sidebarCollapsed: prefsResponse.data?.sidebarCollapsed || false,
          isLoading: false,
        }));
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          error: err.message || 'Failed to load layout',
          isLoading: false,
        }));
      }
    };

    initializeLayout();
  }, [profile?.id]);

  /**
   * Handle window resize to detect mobile/desktop
   */
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024; // lg breakpoint
      setState((prev) => ({
        ...prev,
        isMobile,
        // Close sidebar on mobile if it was open during desktop view
        sidebarOpen: isMobile ? false : prev.sidebarOpen,
      }));
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  /**
   * Toggle sidebar visibility
   */
  const toggleSidebar = useCallback(() => {
    setState((prev) => ({
      ...prev,
      sidebarOpen: !prev.sidebarOpen,
    }));
  }, []);

  /**
   * Close sidebar
   */
  const closeSidebar = useCallback(() => {
    setState((prev) => ({
      ...prev,
      sidebarOpen: false,
    }));
  }, []);

  /**
   * Open sidebar
   */
  const openSidebar = useCallback(() => {
    setState((prev) => ({
      ...prev,
      sidebarOpen: true,
    }));
  }, []);

  /**
   * Toggle sidebar collapse state (desktop only)
   */
  const toggleSidebarCollapse = useCallback(async () => {
    const newCollapsedState = !state.sidebarCollapsed;
    
    setState((prev) => ({
      ...prev,
      sidebarCollapsed: newCollapsedState,
    }));

    // Persist preference
    await layoutService.saveUserLayoutPreferences({
      sidebarCollapsed: newCollapsedState,
    });
  }, [state.sidebarCollapsed]);

  /**
   * Get filtered navigation items based on user role
   */
  const getVisibleNavItems = useCallback((): NavItem[] => {
    // Filter items based on user profile/role if needed
    // For now, return all items
    return state.navigationItems;
  }, [state.navigationItems]);

  return {
    ...state,
    toggleSidebar,
    closeSidebar,
    openSidebar,
    toggleSidebarCollapse,
    getVisibleNavItems,
  };
}
