'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Maximize, X, ZoomIn } from 'lucide-react';
import { useDeliveryProofGallery } from '@/hooks/useDeliveryProofGallery';
import type { ProofDocument } from '@/services/proofService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

function proofImageUrl(doc: ProofDocument): string {
  return `${API_BASE_URL}/api/proofs/${doc.id}/image`;
}

interface ThumbnailProps {
  doc: ProofDocument;
  isSelected: boolean;
  onSelect: (doc: ProofDocument) => void;
}

function Thumbnail({ doc, isSelected, onSelect }: ThumbnailProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(doc)}
      aria-label={`View ${doc.filename}`}
      data-testid={`proof-thumbnail-${doc.id}`}
      className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
        isSelected
          ? 'border-sky-500 ring-2 ring-sky-400'
          : 'border-gray-200 hover:border-sky-300'
      } bg-gray-50 dark:bg-gray-800`}
    >
      <img
        src={proofImageUrl(doc)}
        alt={doc.filename}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 flex items-end p-1 bg-gradient-to-t from-black/60 via-transparent to-transparent">
        <span className="text-white text-xs font-medium px-2 py-1 rounded bg-black/40">
          {doc.status}
        </span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ZoomIn className="w-5 h-5 text-white" />
      </div>
    </button>
  );
}

interface ZoomModalProps {
  doc: ProofDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

function ZoomModal({
  doc,
  isOpen,
  onClose,
  onNext,
  onPrev,
}: ZoomModalProps): React.ReactElement | null {
  if (!doc || !isOpen) return null;

  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY;
      setScale((prev) => Math.min(Math.max(prev - delta * 0.001, 1), 4));
    },
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      data-testid="proof-zoom-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Zoomable proof image"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full max-w-[90vh] max-h-[90vh] flex items-center justify-center"
      >
        <button
          type="button"
          onClick={onPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          aria-label="Next image"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        <div
          ref={imgRef}
          className="relative max-w-full max-h-full cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
        >
          <img
            src={proofImageUrl(doc)}
            alt={doc.filename}
            className="max-w-full max-h-full object-contain"
            style={{ transform: `scale(${scale})` }}
          />
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 text-white">
          <span className="text-sm font-medium">{doc.filename}</span>
          <span className="text-xs text-gray-300">
            {Math.round(doc.fileSize / 1024)} KB
          </span>
          <button
            type="button"
            onClick={() => {
              if (imgRef.current) {
                imgRef.current.classList.toggle('zoom-active');
              }
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20"
            aria-label="Toggle zoom"
          >
            <Maximize className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface DeliveryProofGalleryProps {
  deliveryId: string;
  className?: string;
}

/**
 * DeliveryProofGallery — grid of delivery proof image thumbnails with a
 * zoomable modal. Fetches proof documents from the backend via
 * useDeliveryProofGallery -> proofService.
 */
export function DeliveryProofGallery({
  deliveryId,
  className,
}: DeliveryProofGalleryProps): React.ReactElement {
  const { documents, isLoading, error, refetch } =
    useDeliveryProofGallery(deliveryId);
  const [selectedDoc, setSelectedDoc] = useState<ProofDocument | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpen = useCallback(
    (doc: ProofDocument) => {
      setSelectedDoc(doc);
      setIsModalOpen(true);
    },
    []
  );

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedDoc(null);
  }, []);

  const handleNext = useCallback(() => {
    if (!selectedDoc || documents.length === 0) return;
    const idx = documents.findIndex((d) => d.id === selectedDoc.id);
    const nextIdx = (idx + 1) % documents.length;
    setSelectedDoc(documents[nextIdx]);
  }, [selectedDoc, documents]);

  const handlePrev = useCallback(() => {
    if (!selectedDoc || documents.length === 0) return;
    const idx = documents.findIndex((d) => d.id === selectedDoc.id);
    const prevIdx = (idx - 1 + documents.length) % documents.length;
    setSelectedDoc(documents[prevIdx]);
  }, [selectedDoc, documents]);

  // Keyboard navigation: Escape to close, arrow keys to navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen || !selectedDoc) return;
      if (e.key === 'Escape') {
        handleClose();
        return;
      }
      if (e.key === 'ArrowRight') {
        handleNext();
        return;
      }
      if (e.key === 'ArrowLeft') {
        handlePrev();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, selectedDoc, documents, handleClose, handleNext, handlePrev]);

  if (isLoading) {
    return (
      <section
        aria-label="Loading delivery proof gallery"
        className={`${className ?? ''} flex flex-col items-center justify-center py-10 text-gray-500`}
      >
        <span className="animate-spin h-6 w-6 border-2 border-sky-600 rounded-full" />
      </section>
    );
  }

  if (error) {
    return (
      <section
        role="alert"
        aria-label="Delivery proof gallery error"
        className={`${className ?? ''} p-4 rounded-md border border-red-200 bg-red-50 text-red-700`}
      >
        <h3 className="font-semibold">Unable to load delivery proofs</h3>
        <p className="text-sm mt-1">{error}</p>
        <button
          type="button"
          onClick={refetch}
          className="mt-2 text-sm underline text-sky-600 hover:text-sky-700"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label="Delivery proof gallery"
      className={`${className ?? ''} space-y-4`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Delivery Proof Images
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {documents.length} proof document{documents.length !== 1 ? 's' : ''}
        </p>
      </div>

      {documents.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-8 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400"
        >
          <p>No delivery proof images available.</p>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2"
          role="grid"
          aria-label="Proof image thumbnails"
        >
          {documents.map((doc) => (
            <Thumbnail
              key={doc.id}
              doc={doc}
              isSelected={selectedDoc?.id === doc.id}
              onSelect={handleOpen}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        <ZoomModal
          doc={selectedDoc}
          isOpen={isModalOpen}
          onClose={handleClose}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      </AnimatePresence>
    </section>
  );
}

export default DeliveryProofGallery;
