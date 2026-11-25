import { readSorobanReputation } from '../sorobanReputationService';

const mockGetNetwork = jest.fn();
const mockGetContractData = jest.fn();
jest.mock('@stellar/stellar-sdk', () => ({
  Address: { fromString: (address: string) => ({ toScVal: () => ({ address }) }) },
  Networks: { TESTNET: 'synthetic-testnet-passphrase', PUBLIC: 'synthetic-mainnet-passphrase' },
  StrKey: { isValidContract: (value: string) => value === 'testnet-contract', isValidEd25519PublicKey: (value: string) => value === 'testnet-driver' },
  nativeToScVal: (symbol: string) => ({ symbol }),
  rpc: { Server: jest.fn(() => ({ getNetwork: mockGetNetwork, getContractData: mockGetContractData })), Durability: { Persistent: 'persistent' } },
  scValToNative: (value: unknown) => value,
  xdr: { ScVal: { scvVec: (values: unknown[]) => values } },
}));

const previous = {
  contract: process.env.NEXT_PUBLIC_REPUTATION_CONTRACT_ID,
  network: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
  rpc: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL,
};
beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_REPUTATION_CONTRACT_ID = 'testnet-contract';
  process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet';
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL = 'https://synthetic-rpc.test';
  mockGetNetwork.mockResolvedValue({ passphrase: 'synthetic-testnet-passphrase' });
});
afterAll(() => {
  const restore = (key: string, value: string | undefined) => {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  };
  restore('NEXT_PUBLIC_REPUTATION_CONTRACT_ID', previous.contract);
  restore('NEXT_PUBLIC_STELLAR_NETWORK', previous.network);
  restore('NEXT_PUBLIC_SOROBAN_RPC_URL', previous.rpc);
});
const entry = (score: number, address = 'testnet-driver') => ({
  val: { type: 'contractData', value: { val: { address, reputation_score: score } } }, lastModifiedLedgerSeq: 123,
});

it.each([0, 80, 100])('reads a verified score of %s from the persistent driver profile', async score => {
  mockGetContractData.mockResolvedValue(entry(score));
  await expect(readSorobanReputation('testnet-driver')).resolves.toEqual({ score, network: 'testnet', ledgerSequence: 123 });
  expect(mockGetContractData).toHaveBeenCalledWith('testnet-contract', [{ symbol: 'DriverProfile' }, { address: 'testnet-driver' }], 'persistent');
});
it('rejects a node connected to the wrong Stellar network', async () => {
  mockGetNetwork.mockResolvedValue({ passphrase: 'synthetic-mainnet-passphrase' });
  mockGetContractData.mockResolvedValue(entry(80));
  await expect(readSorobanReputation('testnet-driver')).rejects.toThrow('does not match');
});
it.each([-1, 101, NaN])('rejects invalid contract score %s', async score => {
  mockGetContractData.mockResolvedValue(entry(score));
  await expect(readSorobanReputation('testnet-driver')).rejects.toThrow('score range');
});
it('rejects a profile belonging to another driver', async () => {
  mockGetContractData.mockResolvedValue(entry(80, 'another-driver'));
  await expect(readSorobanReputation('testnet-driver')).rejects.toThrow('does not match');
});
it('reports absent deployment configuration without making a node request', async () => {
  delete process.env.NEXT_PUBLIC_REPUTATION_CONTRACT_ID;
  await expect(readSorobanReputation('testnet-driver')).rejects.toThrow('configuration');
  expect(mockGetContractData).not.toHaveBeenCalled();
});
