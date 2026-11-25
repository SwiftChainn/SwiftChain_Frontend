# Driver reputation reads (#1037)

`DriverReputation` → `useDriverReputation` → `reputationService` retrieves the
driver's wallet mapping from the authenticated backend API, then delegates to
`sorobanReputationService` for a read-only Soroban ledger request. It never signs
or submits a transaction and never treats an API-provided score as node-verified.

## Deployment configuration

Set `NEXT_PUBLIC_REPUTATION_CONTRACT_ID` to the deployed
`IdentityReputationContract` C-address, and configure the matching
`NEXT_PUBLIC_STELLAR_NETWORK` (`testnet` or `mainnet`) and
`NEXT_PUBLIC_SOROBAN_RPC_URL`. Testnet uses the repository's existing public RPC
default. Mainnet requires an explicitly configured provider. No deployment
address or wallet mapping is fabricated when configuration is absent.

The existing frontend API path is
`GET /fleet/drivers/:driverId/reputation` under `NEXT_PUBLIC_API_URL`. It must
return `walletAddress`, optionally wrapped in `{ success: true, data: ... }`.
If a `driverId` is returned, it must match the selected driver. The shared HTTP
client supplies authentication. The backend remains responsible for ownership
and access checks on this mapping.

The public backend's main branch did not implement this mapping endpoint when
this work was prepared. It also did not publish a deployed reputation contract
address. Those are integration prerequisites; live driver-score verification
cannot be claimed without them. Missing configuration, API failures, expired
contract entries and RPC failures produce an unavailable/retry state, not a zero
score or a verified badge.

## Contract compatibility

The reader targets the published
[IdentityReputationContract](https://github.com/SwiftChainn/SwiftChain-SmartContract/blob/main/contracts/identity_reputation_contract/lib.rs).
Its persistent key is the Soroban enum tuple `DriverProfile(Address)`. The value
contains `address` and `reputation_score`; the published contract caps this score
at 100. The reader checks wallet identity, integer score range, and the RPC node's
network passphrase. The returned ledger sequence is retained as verification
metadata. Zero is a valid verified score.

See the SDK's [contract-data read API](https://stellar.github.io/js-stellar-sdk/reference/network-rpc/).

## Validation boundaries

Unit tests cover the backend-mapping/RPC boundary, network mismatch, zero scores,
wrong driver profiles, invalid scores, unavailable deployment configuration, and
keyboard access to the explanation dialog. Network fixtures are test-only and
are not used as production fallbacks. Screenshots using fixtures must be labelled
as test data; they are not evidence of a live deployed driver score.
