'use client';

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { StarIcon, ShieldCheckIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useDriverReputation } from '@/hooks/useDriverReputation';

function ReputationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">About Reputation Scores</DialogTitle>
            <button type="button" onClick={onClose} aria-label="Close modal"
              className="rounded p-1 text-gray-500 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-300">
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 space-y-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Standard Platform Rating</h4>
              <p>Customers provide this star rating after deliveries. It reflects their feedback on the service.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Verified On-Chain Points</h4>
              <p>Completing an eligible escrow-secured delivery awards reputation points through the authorized delivery contract. The reputation contract records those points in the driver&apos;s on-chain profile.</p>
              <p className="mt-2">The shield badge displays the score read from the Stellar network, separately from customer star ratings. A zero score is still a verified result; unavailable data is never shown as zero.</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={onClose} className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-gray-700">Got it</button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

interface DriverReputationProps { driverId: string; standardRating: number }

export function DriverReputation({ driverId, standardRating }: DriverReputationProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { onChainScore, isLoading, error, refetch } = useDriverReputation(driverId);
  const rating = Number.isFinite(standardRating) ? standardRating.toFixed(1) : '—';

  return (
    <div className="flex min-w-0 flex-col items-end gap-1 text-right">
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
          title="Standard Platform Rating" aria-label={`Standard Platform Rating: ${rating}`}>
          <StarIcon className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
          <span>{rating}</span>
        </div>
        <button type="button" onClick={() => setIsModalOpen(true)}
          className="rounded p-1 text-gray-500 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-gray-400"
          aria-label="More information about reputation scores">
          <InformationCircleIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {isLoading ? (
        <div role="status" aria-label="Loading on-chain reputation" className="h-5 w-24 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
      ) : onChainScore !== null ? (
        <div className="flex max-w-full items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-200"
          title="Verified On-Chain Reputation Score" aria-label={`Verified On-Chain Points: ${onChainScore.toLocaleString()}`}>
          <ShieldCheckIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>On-chain</span><span className="font-semibold tabular-nums">{onChainScore.toLocaleString()}</span>
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center justify-end gap-1 text-xs text-gray-600 dark:text-gray-300">
          <span role="status">On-chain unavailable</span>
          <button type="button" onClick={refetch} aria-label="Retry on-chain reputation" className="rounded text-blue-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-300">Retry</button>
        </div>
      ) : null}
      <ReputationModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
