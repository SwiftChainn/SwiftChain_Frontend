/**
 * Fee Estimation Types
 * Defines structures for XLM fee estimation and blockchain network fees
 */

export interface FeeEstimate {
  estimatedXLMCost: number;
  baseFee: number;
  networkFee: number;
  platformFee: number;
  totalAmount: number;
  currency: string;
  timestamp: string;
  estimationId?: string;
}

export interface FeeEstimationResponse {
  success: boolean;
  data: FeeEstimate;
  message?: string;
}

export interface FeeEstimationError {
  success: false;
  error: string;
  code?: string;
}

export type FeeEstimationResult = FeeEstimationResponse | FeeEstimationError;
