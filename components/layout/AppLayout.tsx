/**
 * AppLayout Component
 * Global application shell with responsive sidebar
 * Desktop: Fixed left sidebar | Mobile: Bottom-sheet with hamburger menu
 * Implements strict Component -> Hook -> Service layered architecture
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppLayout } from '@/hooks/useAppLayout';
import { NavItem } from '@/services/layoutService';
import { X, Menu } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Navigation Link Component
 */
function NavLink({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`
        flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200
        ${
          isActive
            ? 'bg-primary text-white shadow-md'
            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
        }
      `}
    >
      {item.icon && <span className="text-lg">{item.icon}</span>}
      <div className="flex flex-col">
        <span className="font-medium">{item.label}</span>
        {item.description && (
          <span className="text-xs opacity-70">{item.description}</span>
        )}
      </div>
    </Link>
  );
}

/**
 * Desktop Sidebar Component
 */
function DesktopSidebar({
  navigationItems,
  activePathname,
  sidebarCollapsed,
  onToggleCollapse,
  appName,
}: {
  navigationItems: NavItem[];
  activePathname: string;
  sidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  appName: string;
}) {
  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen bg-white shadow-lg transition-all duration-300
        dark:bg-slate-900 dark:shadow-slate-900/30
        ${sidebarCollapsed ? 'w-20' : 'w-64'}
        hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-800
        z-40
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-6 dark:border-slate-800">
        {!sidebarCollapsed && (
          <span className="text-xl font-bold text-slate-900 dark:text-white">
            {appName}
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} className="text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
        {navigationItems.map((item) => {
          const isActive = activePathname === item.href;
          return (
            <div
              key={item.id}
              title={sidebarCollapsed ? item.label : undefined}
              className={sidebarCollapsed ? 'flex justify-center' : ''}
            >
              <NavLink item={item} isActive={isActive} />
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 px-3 py-4 dark:border-slate-800">
        {!sidebarCollapsed && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © 2026 SwiftChain
          </p>
        )}
      </div>
    </aside>
  );
}

/**
 * Mobile Bottom Sheet Component
 */
function MobileBottomSheet({
  isOpen,
  onClose,
  navigationItems,
  activePathname,
  appName,
}: {
  isOpen: boolean;
  onClose: () => void;
  navigationItems: NavItem[];
  activePathname: string;
  appName: string;
}) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Bottom Sheet */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-2xl
          transition-all duration-300 lg:hidden dark:bg-slate-900
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          max-h-[85vh] overflow-y-auto
        `}
      >
        {/* Handle / Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900 rounded-t-3xl">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {appName}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close menu"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 px-4 py-6">
          {navigationItems.map((item) => {
            const isActive = activePathname === item.href;
            return (
              <NavLink
                key={item.id}
                item={item}
                isActive={isActive}
                onClick={onClose}
              />
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © 2026 SwiftChain
          </p>
        </div>
      </div>
    </>
  );
}

/**
 * Main AppLayout Component
 */
export default function AppLayout({
  children,
}: AppLayoutProps): React.ReactElement {
  const pathname = usePathname();
  const {
    isLoading,
    isMobile,
    sidebarOpen,
    navigationItems,
    layoutConfig,
    sidebarCollapsed,
    toggleSidebar,
    closeSidebar,
    toggleSidebarCollapse,
  } = useAppLayout();

  const appName = layoutConfig?.branding.appName || 'SwiftChain';

  // Calculate main content margin based on sidebar state
  const mainMarginLeft = isMobile ? '0' : sidebarCollapsed ? '5rem' : '16rem';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <DesktopSidebar
          navigationItems={navigationItems}
          activePathname={pathname}
          sidebarCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          appName={appName}
        />
      )}

      {/* Mobile Header with Hamburger */}
      {isMobile && (
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            {appName}
          </h1>
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Toggle menu"
          >
            <Menu size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
        </header>
      )}

      {/* Mobile Bottom Sheet */}
      {isMobile && (
        <MobileBottomSheet
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          navigationItems={navigationItems}
          activePathname={pathname}
          appName={appName}
        />
      )}

      {/* Main Content */}
      <main
        className={`
          transition-all duration-300
          ${isMobile ? '' : `ml-[${mainMarginLeft}]`}
        `}
        style={!isMobile ? { marginLeft: mainMarginLeft } : undefined}
      >
        {isLoading ? (
          // Loading state
          <div className="flex min-h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-primary dark:border-slate-800 dark:border-t-primary"></div>
              <p className="text-slate-600 dark:text-slate-400">
                Loading layout...
              </p>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
