'use client';

import React, { useState } from 'react';
import { Lock, Check, AlertCircle, Loader } from 'lucide-react';
import { useEscrowLock } from '@/hooks/useEscrowLock';
import { useToast } from '@/hooks/useToast';
// @ts-nocheck
'use client';

import * as React from 'react';
import { useRef } from 'react';
import { useEscrowLock } from '@/hooks/useEscrowLock';
import { useWalletStore } from '@/store/walletStore';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EscrowLockProps {
  deliveryId: string;
  amount: number;
  currency: string;
  walletAddress?: string;
  onSuccess?: (escrowId: string, transactionHash: string) => void;
  onError?: (error: string) => void;
}

type LockState = 'idle' | 'pending' | 'success' | 'error';

export function EscrowLock({
  deliveryId,
  amount,
  currency,
  walletAddress,
  onSuccess,
  onError,
}: EscrowLockProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [state, setState] = useState<LockState>('idle');
  const { isLoading, error, escrowId, transactionHash, lockEscrow, reset } = useEscrowLock();
  const { toast } = useToast();

  const isWalletConnected = !!walletAddress;
  const formattedAmount = amount.toFixed(2);

  const handleLockClick = () => {
    if (!isWalletConnected) {
      setState('error');
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to lock this payment.',
        variant: 'destructive',
      });
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setShowConfirmation(false);
    setState('pending');
    
  currency?: string;
  onSuccess?: (escrowId: string, transactionHash: string | null) => void;
  onError?: (error: string) => void;
}

// ─── Status Icons ─────────────────────────────────────────────────────────────

function LockingSpinner() {
  return (
    <div className="flex h-12 w-12 items-center justify-center">
      <svg className="h-5 w-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    </div>
  );
}

function SuccessIcon() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
      <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm6-10V7a3 3 0 00-3-3S6 4 6 7v4h12V7a3 3 0 00-3-3s-3 0-3 3v4z" />
    </svg>
  );
}

// ─── Payment Confirmation Modal ───────────────────────────────────────────────

interface PaymentConfirmModalProps {
  amount: number;
  currency: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function PaymentConfirmModal({
  amount,
  currency,
  onConfirm,
  onCancel,
  isLoading,
}: PaymentConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current && !isLoading) onCancel();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 mx-auto mb-4">
          <LockIcon />
        </div>

        <h2 id="payment-modal-title" className="text-center text-lg font-semibold text-gray-900 mb-2">
          Lock Payment in Escrow
        </h2>
        <p className="text-center text-sm text-gray-600 mb-6">
          This will lock the payment in a secure escrow contract. The funds will be released to the driver upon successful delivery confirmation.
        </p>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 mb-6 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Amount to Lock</span>
            <span className="text-lg font-bold text-gray-900">
              {amount.toFixed(2)} {currency}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-blue-200">
            <span className="text-xs text-gray-600">Status</span>
            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">Pending</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Locking…
              </>
            ) : (
              <>
                <LockIcon />
                Lock Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * EscrowLock — allows senders to lock payment for a delivery in escrow.
 *
 * Features:
 *   - Displays the total cost clearly
 *   - Requires wallet connection for payment
 *   - Shows loading spinner during payment lock
 *   - Displays confirmation modal before locking
 *   - Handles success/error states
 *
 * Follows strict Component → Hook → Service layered architecture.
 */
export function EscrowLock({
  deliveryId,
  amount,
  currency = 'USDC',
  onSuccess,
  onError,
}: EscrowLockProps) {
  const address = useWalletStore((s) => s.address);
  const isConnected = useWalletStore((s) => s.isConnected);

  const { isLoading, error, escrowId, transactionHash, lockEscrow, reset } = useEscrowLock();

  // Local modal state
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);

  // Handle successful lock
  React.useEffect(() => {
    if (escrowId && !isLoading) {
      onSuccess?.(escrowId, transactionHash);
    }
  }, [escrowId, isLoading, transactionHash, onSuccess]);

  // Handle errors
  React.useEffect(() => {
    if (error && !isLoading) {
      onError?.(error);
    }
  }, [error, isLoading, onError]);

  const handleLockClick = () => {
    if (!isConnected || !address) {
      // User should connect wallet first
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmLock = async () => {
    try {
      await lockEscrow({
        deliveryId,
        amount,
        currency,
        walletAddress: walletAddress!,
      });
      
      setState('success');
      toast({
        title: 'Success!',
        description: `Escrow locked! Transaction: ${transactionHash?.slice(0, 10)}...`,
      });
      onSuccess?.(escrowId!, transactionHash!);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to lock escrow';
      setState('error');
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      onError?.(errorMsg);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  const handleReset = () => {
    setState('idle');
    reset();
  };

  // Render based on state
  if (state === 'success') {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Payment Locked Successfully!
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Your escrow payment has been securely locked.
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 w-full mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transaction Hash</p>
            <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
              {transactionHash}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Lock Another Delivery
          </button>
        walletAddress: address ?? '',
      });
      setShowConfirmModal(false);
    } catch (err) {
      // Error is already handled by hook
      console.error('Lock escrow error:', err);
    }
  };

  const handleCancelModal = () => {
    setShowConfirmModal(false);
  };

  const isLocked = escrowId !== null;
  const isActionDisabled = !isConnected || !address || isLoading;

  // ── Success state ──────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="w-full rounded-2xl border border-green-100 bg-green-50 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <SuccessIcon />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Payment Locked Successfully</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your payment of <span className="font-semibold">{amount.toFixed(2)} {currency}</span> has been securely locked in escrow. It will be released to the driver upon successful delivery.
            </p>
            {transactionHash && (
              <div className="rounded-lg bg-white p-3 border border-green-200">
                <p className="text-xs text-gray-600 mb-1">Transaction Hash:</p>
                <p className="text-xs font-mono text-gray-900 break-all">{transactionHash}</p>
              </div>
            )}
            <button
              onClick={() => {
                reset();
                setShowConfirmModal(false);
              }}
              className="mt-4 rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-700 transition hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Lock Another Delivery
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full rounded-2xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <LockingSpinner />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Locking Payment…</h3>
            <p className="text-sm text-gray-600">
              Please wait while your payment is being secured in escrow.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Locking Payment
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {error || 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={() => {
              setState('idle');
              handleLockClick();
            }}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Try Again
          </button>
  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="w-full rounded-2xl border border-red-100 bg-red-50 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Failed to Lock Payment</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                reset();
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Cost</p>
          <p className="text-4xl font-bold text-gray-900 dark:text-white">
            {formattedAmount} {currency}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            This amount will be locked in escrow until delivery is confirmed
          </p>
        </div>

        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            ✓ Your payment is protected in escrow
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            ✓ Released only upon delivery confirmation
          </p>
        </div>

        {!isWalletConnected && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              ⚠️ Connect your wallet to lock this payment
            </p>
          </div>
        )}

        <button
          onClick={handleLockClick}
          disabled={isLoading || !isWalletConnected}
          className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
            isLoading
              ? 'bg-blue-500 text-white cursor-wait'
              : isWalletConnected
              ? 'bg-primary text-white hover:bg-primary-dark'
              : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Locking Payment…
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Lock Payment in Escrow
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          {isWalletConnected ? 'Wallet connected' : 'Wallet status: disconnected'}
  // ── Idle state (ready to lock) ────────────────────────────────────────────
  return (
    <>
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Cost Display */}
        <div className="mb-6">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-gray-600 text-sm">Total Cost</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900">{amount.toFixed(2)}</span>
            <span className="text-2xl text-gray-600">{currency}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">This amount will be locked in escrow until delivery is confirmed.</p>
        </div>

        {/* Wallet Connection Status */}
        {!isConnected ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6">
            <p className="text-sm font-medium text-amber-900">
              ⚠️ Connect your wallet to lock this payment
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 mb-6 flex items-center gap-2">
            <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-green-700">
              Wallet connected: <span className="font-mono text-xs">{address?.slice(0, 8)}…{address?.slice(-6)}</span>
            </p>
          </div>
        )}

        {/* Lock Button */}
        <button
          onClick={handleLockClick}
          disabled={isActionDisabled}
          className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
        >
          <LockIcon />
          {isLoading ? 'Locking Payment…' : 'Lock Payment in Escrow'}
        </button>

        {/* Info Text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Your payment will be securely held until the delivery is completed and confirmed.
        </p>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-sm w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Confirm Escrow Lock
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You are about to lock
              <span className="font-semibold block text-lg mt-2">
                {formattedAmount} {currency}
              </span>
              in escrow. This action cannot be reversed immediately.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Confirm Lock
              </button>
            </div>
          </div>
        </div>
      {showConfirmModal && (
        <PaymentConfirmModal
          amount={amount}
          currency={currency}
          onConfirm={handleConfirmLock}
          onCancel={handleCancelModal}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
