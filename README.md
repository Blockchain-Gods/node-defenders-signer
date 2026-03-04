# node-defenders-signer

Isolated signing service for Node Defenders — the first title in the [Blockchain Gods](https://blockchaingods.io) cross-game Web3 universe.

## What this service does

Node Defenders uses blockchain as backend infrastructure for game economy management and asset ownership — not as a financial incentive mechanism. There are no play-to-earn mechanics. Blockchain is invisible to most players.

During the beta, players use custodial wallets — the backend generates a wallet per player, stores the encrypted private key, and signs all on-chain transactions on their behalf. Players never manage keys or pay gas. The migration path is to ERC-4337 account abstraction post-beta.

This service is the **only component that ever touches private keys**. It is deliberately isolated from the main NestJS API — the two services communicate over HTTP with a shared secret. No other service has DB access to the wallets table.

### Responsibilities

- Generate and store custodial wallets per player (AES-256-GCM encrypted keys in Cloudflare D1)
- Sign all on-chain transactions on behalf of players
- Mint SOUL tokens via `mint` (on-demand) or `batchMint` (periodic settlement via cron)
- Mint SBTs on milestone/achievement events
- Execute marketplace purchases and rentals (`buyUpgrade` / `rentUpgrade`) including EIP-2612 permit signing
- Record player stats on-chain via `PlayerRegistry.recordStats`
- Top up player wallets with AVAX via faucet when balance drops below threshold

### What it does NOT do

- Handle game logic or session state (that's the NestJS API)
- Expose any public endpoints — all routes require `X-Internal-Key`
- Store anything other than wallets, tx logs, and pending mint queue

---

## Architecture

```
NestJS API (node-defenders-api)
    │
    │  HTTP + X-Internal-Key
    ▼
node-defenders-signer  (this service)
    │
    ├── Cloudflare D1     — wallets, tx_log, pending_soul_mints
    ├── Avalanche Fuji    — contract calls via ethers JsonRpcProvider
    └── Faucet Wallet     — AVAX top-ups for player wallets
```

**Modules**

| Module              | Responsibility                                          |
| ------------------- | ------------------------------------------------------- |
| `WalletModule`      | Create custodial wallets, decrypt keys for signing      |
| `EncryptionModule`  | AES-256-GCM encrypt/decrypt using env-stored master key |
| `D1Module`          | Cloudflare D1 REST API wrapper                          |
| `ContractModule`    | Singleton typed ethers contract instances (TypeChain)   |
| `FaucetModule`      | Check and top up player AVAX balance before every tx    |
| `MintModule`        | On-demand and batch SOUL minting, SBT minting           |
| `StatsModule`       | Batch record player stats on PlayerRegistry             |
| `MarketplaceModule` | EIP-2612 permit + buyUpgrade / rentUpgrade flows        |

---

## Tech stack

- **Runtime**: Node.js / NestJS
- **Blockchain**: Avalanche C-Chain (Fuji testnet → mainnet)
- **Contracts**: ethers v6 + TypeChain typed bindings
- **DB**: Cloudflare D1 (SQLite, accessed via CF REST API)
- **Encryption**: Node native `crypto` — AES-256-GCM
- **Scheduler**: `@nestjs/schedule` — cron-based batch SOUL settlement
- **Deployment**: Render.com

---

## Token contracts

| Contract         | Role                                                    |
| ---------------- | ------------------------------------------------------- |
| `SoulToken`      | ERC-20 + EIP-2612, earnable in-game, daily mint limit   |
| `GodsToken`      | ERC-20 + EIP-2612, hard cap 100M, external acquire only |
| `Treasury`       | Fee routing and reward distribution                     |
| `PlayerRegistry` | On-chain player profiles, stats, reputation             |
| `SBT`            | Soulbound achievement tokens                            |
| `UpgradeNFT`     | ERC-4907 rentable NFT upgrades                          |
| `Marketplace`    | Buy and rent upgrades with SOUL or GODS                 |

Contract addresses are in `deployments/fuji.json`.

---

## Setup

### Prerequisites

- Node.js 18+
- A Cloudflare account with D1 enabled
- Avalanche Fuji RPC access
- Deployed contracts (see [node-defenders-contracts](https://github.com/npanium/node-defenders-contracts))

### Install

```bash
npm install
```

### Environment variables

Copy `env.example` to `.env` and fill in all values:

```bash
cp env.example .env
```

| Variable                   | Description                                                      |
| -------------------------- | ---------------------------------------------------------------- |
| `CF_ACCOUNT_ID`            | Cloudflare account ID                                            |
| `CF_D1_DATABASE_ID`        | D1 database ID (`nd-avax-signer`)                                |
| `CF_API_TOKEN`             | CF API token with D1:Edit permission                             |
| `WALLET_ENCRYPTION_KEY`    | 32-byte hex key — generate with `openssl rand -hex 32`           |
| `INTERNAL_API_KEY`         | Shared secret with the API — `openssl rand -hex 32`              |
| `FUJI_RPC_URL`             | Avalanche Fuji RPC endpoint                                      |
| `SIGNER_PRIVATE_KEY`       | Private key of the signing service wallet (no 0x prefix)         |
| `FAUCET_PRIVATE_KEY`       | Private key of the faucet wallet (no 0x prefix)                  |
| `FAUCET_THRESHOLD_AVAX`    | Top-up trigger threshold (default: `0.05`)                       |
| `FAUCET_TOPUP_AMOUNT_AVAX` | Amount to top up (default: `0.1`)                                |
| `BATCH_MINT_CRON`          | Cron schedule for batch SOUL settlement (default: `*/5 * * * *`) |

### TypeChain types

Copy the TypeChain output from [node-defenders-contracts](https://github.com/npanium/node-defenders-contracts) into `src/types/`:

```bash
cp -r ../node-defenders-contracts/types/ethers-contracts src/types/
```

The expected structure is:

```
src/types/
├── factories/
│   ├── SoulToken__factory.ts
│   ├── GodsToken__factory.ts
│   ├── Treasury__factory.ts
│   ├── PlayerRegistry__factory.ts
│   ├── SBT.sol/SBT__factory.ts
│   ├── UpgradeNFT.sol/UpgradeNFT__factory.ts
│   └── Marketplace.sol/Marketplace__factory.ts
├── SoulToken.ts
├── GodsToken.ts
├── Treasury.ts
├── PlayerRegistry.ts
├── SBT.sol/SBT.ts
├── UpgradeNFT.sol/UpgradeNFT.ts
├── Marketplace.sol/Marketplace.ts
└── common.ts
```

### Run

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

The service runs on port `3001` by default. On first boot it runs the D1 schema migration automatically.

---

## API reference

All endpoints require the `X-Internal-Key` header. This service is not exposed publicly — it is called only by the NestJS API.

### `POST /wallet/create`

Create a custodial wallet for a player.

```json
{ "playerId": "string" }
```

### `POST /mint/soul/now`

Mint SOUL tokens immediately (use before marketplace actions).

```json
{ "playerId": "string", "amount": "string" }
```

Amount is in wei — e.g. `"100000000000000000000"` = 100 SOUL.

### `POST /mint/soul/queue`

Queue a SOUL mint for the next batch settlement cron tick.

```json
{ "playerId": "string", "amount": "string" }
```

### `POST /mint/sbt`

Mint a soulbound achievement token.

```json
{ "playerId": "string", "typeId": "number" }
```

### `POST /stats/batch`

Record player stats on-chain.

```json
{
  "entries": [{ "wallet": "0x...", "games": 1, "rounds": 5, "enemies": 12 }]
}
```

### `POST /marketplace/execute`

Execute a buy or rent on the Marketplace contract.

```json
{
  "playerId": "string",
  "action": "buy" | "rent",
  "typeId": "number",
  "tierId": "number",
  "paymentToken": "SOUL" | "GODS"
}
```

`tierId` is required for `rent`. Handles EIP-2612 permit signing internally.

---

## Related repos

- [node-defenders-contracts](https://github.com/Blockchain-Gods/node-defenders-contracts) — Solidity contracts
- [node-defenders-api](https://github.com/Blockchain-Gods/node-defenders-api) — Main NestJS game API
