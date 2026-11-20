'use client';

import { useState } from 'react';
import {
  StarIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/solid';
import { useDriverReputation } from '@/hooks/useDriverReputation';
import { ModalFocusTrap } from '@/components/shared/ModalFocusTrap';

function ReputationModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <ModalFocusTrap
        id="reputation-score-dialog"
        isOpen
        onClose={onClose}
        ariaLabelledBy="reputation-score-title"
        ariaDescribedBy="reputation-score-description"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <div className="flex items-start justify-between">
          <h3 id="reputation-score-title" className="text-lg font-semibold text-gray-900">
            About Reputation Scores
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label="Close modal"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div id="reputation-score-description" className="mt-4 space-y-4 text-sm text-gray-600">
          <p>
            Driver reputation is measured in two ways to provide a complete
            picture of their reliability and experience.
          </p>
          <div>
            <h4 className="font-semibold text-gray-800">Platform Rating (★)</h4>
            <p>
              This is the standard star rating provided by customers after a
              successful delivery. It reflects overall satisfaction.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">On-Chain Score (🛡️)</h4>
            <p>
              This is a tokenized score recorded directly on the Stellar
              blockchain. Drivers earn these &ldquo;Reputation Tokens&rdquo; by successfully
              completing escrow-secured deliveries.
            </p>
            <p className="mt-2">
              An on-chain score is a verifiable, tamper-proof record of a
              driver&apos;s history within the SwiftChain ecosystem, representing a
              higher level of trust.
            </p>
          </div>
        </div>
        <div className="mt-6 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Got it
          </button>
        </div>
      </ModalFocusTrap>
    </div>
  );
}

interface DriverReputationProps {
  driverId: string;
  standardRating: number;
}

export function DriverReputation({
  driverId,
  standardRating,
}: DriverReputationProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { onChainScore, isLoading } = useDriverReputation(driverId);

  return (
    <div className="flex items-center justify-end gap-3 text-right">
      {/* Standard Platform Rating */}
      <div
        className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
        title="Standard Platform Rating"
      >
        <StarIcon aria-hidden="true" className="h-3.5 w-3.5 text-amber-500" />
        <span>{standardRating.toFixed(1)}</span>
      </div>

      {/* On-Chain Reputation Score */}
      {isLoading ? (
        <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
      ) : onChainScore && onChainScore > 0 ? (
        <div
          className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
          title="Verified On-Chain Reputation Score"
        >
          <ShieldCheckIcon aria-hidden="true" className="h-3.5 w-3.5 text-blue-500" />
          <span className="font-semibold uppercase tracking-wide">Verified On-Chain</span>
          <span>{onChainScore.toLocaleString()}</span>
        </div>
      ) : null}

      {/* Info button */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="rounded text-gray-400 transition hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        aria-label="More information about reputation scores"
      >
        <InformationCircleIcon aria-hidden="true" className="h-4 w-4" />
      </button>

      {isModalOpen && <ReputationModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
