/**
 * TopLoader Service
 * Manages router event subscriptions and emits loader state changes
 * Follows the Service pattern for clean separation of concerns
 */

type TopLoaderCallback = (isLoading: boolean) => void;

class TopLoaderService {
  private listeners: Set<TopLoaderCallback> = new Set();
  private isInitialized = false;
  private timeout: NodeJS.Timeout | null = null;
  private readonly COMPLETION_DELAY = 500; // ms

  /**
   * Initialize the top loader service with router event listeners
   * Only initializes once to prevent multiple subscriptions
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Use next/navigation to listen to router events
    if (typeof window === 'undefined') return; // SSR guard

    this.isInitialized = true;
    this.setupRouterListeners();
  }

  /**
   * Setup router event listeners using browser's popstate and history API
   * This works with Next.js App Router navigation
   */
  private setupRouterListeners(): void {
    // Listen to navigation start (using MutationObserver or custom events)
    // For Next.js App Router, we monitor URL changes
    let lastUrl = window.location.href;

    const checkUrlChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        this.notifyListeners(true);

        // Simulate completion after a short delay
        this.scheduleCompletion();
      }
    };

    // Monitor URL changes
    window.addEventListener('popstate', () => {
      this.notifyListeners(true);
      this.scheduleCompletion();
    });

    // For Next.js router navigation, we use a custom approach
    // by hooking into the navigation flow
    this.monitorNextRouterNavigation();
  }

  /**
   * Monitor Next.js router navigation using NProgress or custom polling
   * Emits loading state during route transitions
   */
  private monitorNextRouterNavigation(): void {
    // Create a custom event listener for route changes
    const handleBeforePopState = () => {
      this.notifyListeners(true);
      this.scheduleCompletion();
    };

    window.addEventListener('beforeunload', handleBeforePopState);

    // Listen for link clicks to detect navigation
    document.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href && this.isInternalLink(link.href)) {
        this.notifyListeners(true);
        this.scheduleCompletion();
      }
    });
  }

  /**
   * Check if a link is an internal navigation link
   */
  private isInternalLink(href: string): boolean {
    try {
      const url = new URL(href, window.location.origin);
      return url.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  /**
   * Schedule the completion of loading with a slight delay
   */
  private scheduleCompletion(): void {
    if (this.timeout) clearTimeout(this.timeout);

    this.timeout = setTimeout(() => {
      this.notifyListeners(false);
    }, this.COMPLETION_DELAY);
  }

  /**
   * Subscribe to loader state changes
   */
  subscribe(callback: TopLoaderCallback): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(isLoading: boolean): void {
    this.listeners.forEach((callback) => callback(isLoading));
  }

  /**
   * Cleanup method for unmounting
   */
  cleanup(): void {
    this.listeners.clear();
    if (this.timeout) clearTimeout(this.timeout);
  }
}

// Export singleton instance
export const topLoaderService = new TopLoaderService();
