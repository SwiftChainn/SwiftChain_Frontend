export interface VerifiedReputation {
  score: number;
  network: 'testnet' | 'mainnet';
  ledgerSequence?: number;
}

/** Read the persistent DriverProfile(Address) entry of IdentityReputationContract. */
export async function readSorobanReputation(walletAddress: string, signal?: AbortSignal): Promise<VerifiedReputation> {
  const contractId = process.env.NEXT_PUBLIC_REPUTATION_CONTRACT_ID;
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';
  const rpcUrl = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
    (network === 'testnet' ? 'https://soroban-testnet.stellar.org' : undefined);
  if (!contractId || !rpcUrl || (network !== 'testnet' && network !== 'mainnet')) {
    throw new Error('Reputation contract and network configuration are required');
  }
  signal?.throwIfAborted();
  // Load the read-only Web3 client only when a reputation read is needed.
  const { Address, Networks, StrKey, nativeToScVal, rpc, scValToNative, xdr } = await import('@stellar/stellar-sdk');
  if (!StrKey.isValidContract(contractId) || !StrKey.isValidEd25519PublicKey(walletAddress)) {
    throw new Error('Invalid reputation contract or driver wallet address');
  }
  const server = new rpc.Server(rpcUrl);
  const key = xdr.ScVal.scvVec([
    nativeToScVal('DriverProfile', { type: 'symbol' }),
    Address.fromString(walletAddress).toScVal(),
  ]);
  const [node, entry] = await Promise.all([
    server.getNetwork(),
    server.getContractData(contractId, key, rpc.Durability.Persistent),
  ]);
  signal?.throwIfAborted();
  const passphrase = network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;
  if (node.passphrase !== passphrase) throw new Error('Reputation RPC network does not match the configured network');
  if (entry.val.type !== 'contractData') throw new Error('Reputation contract data is unavailable');
  const profile: unknown = scValToNative(entry.val.value.val);
  if (!profile || typeof profile !== 'object') throw new Error('Invalid reputation profile');
  const value = profile as Record<string, unknown>;
  if (value.address !== walletAddress || typeof value.reputation_score !== 'number' ||
    !Number.isInteger(value.reputation_score) || value.reputation_score < 0 || value.reputation_score > 100) {
    throw new Error('Reputation profile does not match the driver or contract score range');
  }
  return { score: value.reputation_score, network, ledgerSequence: entry.lastModifiedLedgerSeq };
}
