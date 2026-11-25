import type { EscrowDetails, PayoutFeeQuote } from '@/types/escrow';

// Synthetic testnet response fixtures; never used by application code.
const signers = ['testnet-signer-a', 'testnet-signer-b', 'testnet-signer-c'];
export const payoutResponses = {
  unsigned: { currentSignatures: 0, requiredSignatures: 2, isReleased: false, signers: [] },
  oneOfTwo: { currentSignatures: 1, requiredSignatures: 2, isReleased: false, signers: signers.slice(0, 1) },
  twoOfTwo: { currentSignatures: 2, requiredSignatures: 2, isReleased: false, signers: signers.slice(0, 2) },
  twoOfThree: { currentSignatures: 2, requiredSignatures: 3, isReleased: false, signers: signers.slice(0, 2) },
  threeOfThree: { currentSignatures: 3, requiredSignatures: 3, isReleased: false, signers },
  released: { currentSignatures: 2, requiredSignatures: 2, isReleased: true, signers: signers.slice(0, 2) },
} satisfies Record<string, EscrowDetails>;

export const payoutQuote: PayoutFeeQuote = {
  escrowAmount: 100, currency: 'XLM', platformFeePercent: 2.5, estimatedGasFee: 0.00001,
};
export const releaseResponse = { success: true, transactionHash: 'synthetic-testnet-release' };
