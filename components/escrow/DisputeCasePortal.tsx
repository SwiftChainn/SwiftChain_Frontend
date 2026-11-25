'use client';

import { useState } from 'react';
import { useDisputeCase } from '@/hooks/useDisputeCase';
import { EvidenceDropzone } from '@/components/escrow/EvidenceDropzone';
import type { DisputeCaseResponse, DisputeCaseStatus, DisputeReason } from '@/types/dispute';
import { useToast } from '@/hooks/useToast';
import { useDisputeTimeline } from '@/hooks/useDisputeTimeline';

type Step = 'issue' | 'evidence' | 'confirmation';

interface DisputeCasePortalProps {
  deliveryId: string;
}

const REASONS: { value: DisputeReason; label: string }[] = [
  { value: 'damaged_items', label: 'Items Damaged' },
  { value: 'non_delivery', label: 'Non-Delivery' },
  { value: 'incorrect_items', label: 'Incorrect Items' },
  { value: 'other', label: 'Other Issue' },
];

function formatStatus(status: DisputeCaseStatus): string {
  return status.replace(/_/g, ' ');
}

function formatTimelineTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? 'Unknown time'
    : date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function statusStyle(status: DisputeCaseStatus): string {
  if (status === 'resolved') return 'bg-green-100 text-green-800';
  if (status === 'rejected') return 'bg-red-100 text-red-800';
  if (status === 'under_review') return 'bg-amber-100 text-amber-800';
  return 'bg-blue-100 text-blue-800';
}

export function DisputeCasePortal({ deliveryId }: DisputeCasePortalProps) {
  const [step, setStep] = useState<Step>('issue');
  const [reason, setReason] = useState<DisputeReason | null>(null);
  const [description, setDescription] = useState('');
  const [submittedCase, setSubmittedCase] = useState<DisputeCaseResponse | null>(null);
  const { error: toastError } = useToast();
  const timeline = useDisputeTimeline(submittedCase?.caseId ?? null);

  const { files, addFiles, removeFile, submitCase, isSubmitting, uploadProgress } =
    useDisputeCase(deliveryId);

  const canContinueFromIssue = reason !== null && description.trim().length >= 20;

  const handleSubmit = async () => {
    if (!reason) return;
    try {
      const result = await submitCase(reason, description);
      setSubmittedCase(result);
      setStep('confirmation');
    } catch {
      // useDisputeCase already surfaces a toast; stay on the evidence step.
    }
  };

  if (step === 'confirmation' && submittedCase) {
    return (
      <section
        data-testid="dispute-submitted"
        aria-label="Dispute submitted"
        className="rounded-md border border-gray-200 bg-white p-6 text-center"
      >
        <h2 className="text-lg font-semibold text-gray-900">Dispute Filed</h2>
        <p className="mt-2 text-sm text-gray-600">
          Case ID: <span data-testid="case-id" className="font-mono">{submittedCase.caseId}</span>
        </p>
        {submittedCase.escrowFrozen && (
          <p
            data-testid="escrow-frozen-indicator"
            role="status"
            className="mt-4 rounded-md bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800"
          >
            Escrow payout frozen pending review
          </p>
        )}
        <section
          aria-labelledby="dispute-timeline-heading"
          className="mt-6 text-left"
          data-testid="dispute-timeline"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="dispute-timeline-heading" className="text-base font-semibold text-gray-900">
              Evidence and verdict timeline
            </h3>
            <div className="flex items-center gap-3">
              {timeline.currentStatus && (
                <p className="text-sm text-gray-700">
                  Current status:{' '}
                  <span
                    data-testid="current-dispute-status"
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle(timeline.currentStatus)}`}
                  >
                    {formatStatus(timeline.currentStatus)}
                  </span>
                </p>
              )}
              {!timeline.error && (
                <button
                  type="button"
                  onClick={timeline.refresh}
                  disabled={timeline.isLoading}
                  className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 disabled:opacity-50"
                >
                  Refresh timeline
                </button>
              )}
            </div>
          </div>

          {timeline.isLoading && <p role="status" className="mt-4 text-sm text-gray-600">Loading timeline…</p>}
          {timeline.error && (
            <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm text-red-700">
              <span>{timeline.error}</span>
              <button
                type="button"
                onClick={timeline.refresh}
                className="rounded border border-red-300 px-3 py-1 font-medium"
              >
                Retry
              </button>
            </div>
          )}
          {!timeline.isLoading && !timeline.error && timeline.events.length === 0 && (
            <p className="mt-4 text-sm text-gray-600">No evidence or verdict events recorded yet.</p>
          )}
          {!timeline.isLoading && !timeline.error && timeline.events.length > 0 && (
            <ol aria-label="Dispute evidence and verdict timeline" className="mt-4 border-l-2 border-gray-200 pl-4">
              {timeline.events.map((event) => {
                const isCurrentVerdict =
                  event.type === 'verdict' && event.status === timeline.currentStatus;
                return (
                  <li
                    key={event.eventId}
                    data-current-verdict={isCurrentVerdict ? 'true' : undefined}
                    aria-current={isCurrentVerdict ? 'step' : undefined}
                    className={`relative mb-5 pl-2 last:mb-0 ${
                      isCurrentVerdict ? 'rounded-md bg-blue-50 p-3 ring-1 ring-blue-200' : ''
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[1.4rem] top-1 h-3 w-3 rounded-full border-2 border-white ${
                        isCurrentVerdict ? 'bg-blue-600' : 'bg-gray-400'
                      }`}
                    />
                    <p className="text-sm font-semibold text-gray-900">
                      {event.type === 'evidence_uploaded' ? 'Evidence uploaded' : 'Verdict issued'}
                      {isCurrentVerdict && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                          Current verdict
                        </span>
                      )}
                    </p>
                    {event.type === 'evidence_uploaded' && event.filename && (
                      <p className="mt-1 text-sm text-gray-700">{event.filename}</p>
                    )}
                    {event.type === 'verdict' && (
                      <p className="mt-1 text-sm capitalize text-gray-700">
                        {formatStatus(event.status)}
                        {event.notes ? ` — ${event.notes}` : ''}
                      </p>
                    )}
                    <time dateTime={event.timestamp} className="mt-1 block text-xs text-gray-500">
                      {formatTimelineTimestamp(event.timestamp)}
                    </time>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </section>
    );
  }

  return (
    <section aria-label="Dispute resolution portal" className="rounded-md border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Report a Delivery Issue</h2>

      {step === 'issue' && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Reason</label>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm ${
                    reason === r.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="dispute-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="dispute-description" className="mb-2 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="dispute-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe what happened (minimum 20 characters)"
              className="w-full rounded-md border border-gray-300 p-3 text-sm"
            />
          </div>

          <button
            type="button"
            disabled={!canContinueFromIssue}
            onClick={() => setStep('evidence')}
            className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Continue to Evidence
          </button>
        </div>
      )}

      {step === 'evidence' && (
        <div className="space-y-4">
          <EvidenceDropzone
            files={files}
            onFilesAdded={addFiles}
            onRemoveFile={removeFile}
            onRejected={(reasons) => reasons.forEach((r) => toastError('File rejected', r))}
          />

          <div
            role="status"
            className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800"
          >
            Filing this dispute will immediately freeze the delivery&apos;s escrow payout
            pending review.
          </div>

          {isSubmitting && uploadProgress > 0 && (
            <p className="text-xs text-gray-500">Uploading evidence: {uploadProgress}%</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('issue')}
              className="flex-1 rounded-md border border-gray-300 py-2.5 text-sm font-semibold text-gray-700"
            >
              Back
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="flex-1 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
