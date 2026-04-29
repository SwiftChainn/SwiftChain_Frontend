/**
 * useModal Hook
 * Custom hook for managing modal state and interactions
 * Integrates with modalService for centralized modal management
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { modalService, ModalConfig, ModalTemplate } from '@/services/modalService';

export interface UseModalReturn {
  isOpen: boolean;
  currentModal: ModalConfig | null;
  stackDepth: number;
  open: (config: ModalConfig) => void;
  close: (callback?: () => void) => void;
  closeAll: () => void;
  fetchTemplates: () => Promise<ModalTemplate[]>;
  openFromTemplate: (templateId: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * Hook that manages modal state and lifecycle
 * Provides simple methods to open, close, and manage modals
 */
export function useModal(): UseModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [currentModal, setCurrentModal] = useState<ModalConfig | null>(null);
  const [stackDepth, setStackDepth] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Subscribe to modal state changes on mount
   */
  useEffect(() => {
    const unsubscribe = modalService.subscribe((config) => {
      setCurrentModal(config);
      setIsOpen(config !== null);
      setStackDepth(modalService.getStackDepth());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Open a modal
   */
  const open = useCallback((config: ModalConfig) => {
    modalService.open(config);
  }, []);

  /**
   * Close current modal
   */
  const close = useCallback((callback?: () => void) => {
    modalService.close(callback);
  }, []);

  /**
   * Close all modals
   */
  const closeAll = useCallback(() => {
    modalService.closeAll();
  }, []);

  /**
   * Fetch available modal templates from backend
   */
  const fetchTemplates = useCallback(async (): Promise<ModalTemplate[]> => {
    try {
      setIsLoading(true);
      const response = await modalService.fetchModalTemplates();
      
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (err: any) {
      console.error('Failed to fetch templates:', err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Open modal from a template
   */
  const openFromTemplate = useCallback(async (templateId: string) => {
    try {
      setIsLoading(true);
      const response = await modalService.fetchModalTemplate(templateId);
      
      if (response.success && response.data) {
        const template = response.data;
        modalService.open({
          id: template.id,
          title: template.title,
          content: template.content,
          size: template.size,
          position: template.position,
          closeable: template.closeable,
          focusTrap: template.focusTrap,
          confirmLabel: template.confirmLabel,
          cancelLabel: template.cancelLabel,
        });
      }
    } catch (err: any) {
      console.error('Failed to open template:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isOpen,
    currentModal,
    stackDepth,
    open,
    close,
    closeAll,
    fetchTemplates,
    openFromTemplate,
    isLoading,
  };
}
