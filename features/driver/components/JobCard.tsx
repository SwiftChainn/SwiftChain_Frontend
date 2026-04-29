'use client';

import { MapPin, Package, TrendingUp, Navigation } from 'lucide-react';
import { DeliveryJob } from '@/services/driverJobService';

interface JobCardProps {
  job: DeliveryJob;
  onAccept: (job: DeliveryJob) => void;
  isAccepting: boolean;
}

/**
 * JobCard — displays a single available delivery job with key details
 * and an Accept Job button that triggers the confirmation modal.
 */
export function JobCard({ job, onAccept, isAccepting }: JobCardProps) {
  return (
    <article className="rounded-xl border border-secondary/30 bg-white p-5 shadow-sm transition hover:shadow-md dark:bg-secondary/10">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Available
        </span>
        <p className="text-right text-sm font-semibold text-primary">
          {job.estimatedEarnings.toFixed(2)} XLM
        </p>
      </div>

      {/* Route */}
      <div className="mt-4 space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div>
            <p className="text-xs text-secondary">Pickup</p>
            <p className="text-sm font-medium">{job.pickupAddress}</p>
          </div>
        </div>
        <div className="ml-2 h-4 w-px bg-secondary/30" />
        <div className="flex items-start gap-2">
          <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div>
            <p className="text-xs text-secondary">Drop-off</p>
            <p className="text-sm font-medium">{job.dropoffAddress}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mt-4 flex flex-wrap gap-4 border-t border-secondary/20 pt-4 text-sm text-secondary">
        <span className="flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4" />
          {job.estimatedDistance} km
        </span>
        <span className="flex items-center gap-1.5">
          <Package className="h-4 w-4" />
          {job.packageDescription}
        </span>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={() => onAccept(job)}
        disabled={isAccepting}
        className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Accept Job
      </button>
    </article>
  );
}