'use client';

import React from 'react';
import { AlertCircle, Loader, DollarSign } from 'lucide-react';
import { useFeeEstimate } from '@/hooks/useFeeEstimate';

interface FeeEstimatorProps {
  amount: number | null;
  currency?: string;
  onFeeUpdate?: (totalAmount: number) => void;
}

/**
 * FeeEstimator Component
 * 
 * Displays real-time XLM fee estimates for transactions.
 * Shows breakdown of base fee, network fee, and platform fee.
 * 
 * Features:
 * - Real-time fee estimation via React Query
 * - Detailed fee breakdown
 * - Loading and error states
 * - Dark mode support
 * - Responsive design
 * - Accessibility compliance
 */
export function FeeEstimator({
  amount,
  currency = 'USD',
  onFeeUpdate,
}: FeeEstimatorProps) {
  const {
    estimatedFee,
    estimatedXLMCost,
    baseFee,
    networkFee,
    platformFee,
    totalAmount,
    isLoading,
    error,
  } = useFeeEstimate(amount, currency);

  // Notify parent when fee updates
  React.useEffect(() => {
    if (onFeeUpdate && totalAmount > 0) {
      onFeeUpdate(totalAmount);
    }
  }, [totalAmount, onFeeUpdate]);

  if (!amount || amount <= 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Enter an amount to see fee estimates
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="flex items-center gap-3">
          <Loader className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
          <p className="text-sm text-blue-900 dark:text-blue-300 font-medium">
            Calculating fees...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-900 dark:text-red-300">
              Unable to calculate fees
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Fee Breakdown Card */}
      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50 transition-colors">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Transaction Breakdown
          </h3>
        </div>

        {/* Fee Items */}
        <div className="space-y-3">
          {/* Base Amount */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Transaction Amount
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {amount.toFixed(2)} {currency}
            </span>
          </div>

          <div className="border-t border-blue-200 dark:border-blue-700/30" />

          {/* Base Fee */}
          {baseFee > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Base Fee
              </span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {baseFee.toFixed(6)} XLM
              </span>
            </div>
          )}

          {/* Network Fee */}
          {networkFee > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Network Fee
              </span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {networkFee.toFixed(6)} XLM
              </span>
            </div>
          )}

          {/* Platform Fee */}
          {platformFee > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Platform Fee
              </span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {platformFee.toFixed(6)} XLM
              </span>
            </div>
          )}

          <div className="border-t border-blue-200 dark:border-blue-700/30" />

          {/* Total Estimated XLM Cost */}
          <div className="flex justify-between items-center bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded">
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
              Estimated XLM Cost
            </span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {estimatedXLMCost.toFixed(6)} XLM
            </span>
          </div>

          {/* Total Amount (including fees) */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Total
            </span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {totalAmount.toFixed(2)} {currency}
            </span>
          </div>
        </div>

        {/* Fee Estimation Timestamp */}
        {estimatedFee?.timestamp && (
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700/30">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Estimated {new Date(estimatedFee.timestamp).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>

      {/* Info Message */}
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-700/50">
        <p className="text-xs text-amber-800 dark:text-amber-300">
          ℹ️ Fees are estimated based on current network conditions and may vary slightly at confirmation time.
        </p>
      </div>
    </div>
  );
}
