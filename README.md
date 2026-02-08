# Streamer Arc

Livestream donation alerts powered by Circle CCTP and Arc Testnet. Streamers sign in with Google, get a Circle wallet on Arc Testnet, and set up a custom alert (GIF + TTS voice). Viewers donate USDC from any supported testnet chain — the tokens get bridged to Arc Testnet via Circle's CCTP Forwarding Service. An OBS-compatible overlay displays the alert with the donor's message read aloud via Web Speech API.

## Getting Started

### Prerequisites

- Node.js 18+
- Accounts: [Google Cloud](https://console.cloud.google.com), [Circle Developer](https://console.circle.com), [WalletConnect](https://cloud.walletconnect.com), [Neon](https://neon.tech), [Cloudflare](https://dash.cloudflare.com)

### Environment Variables

Create `.env.local`:

```env
# Database (Neon Postgres)
DATABASE_URL=postgresql://...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...

# NextAuth
NEXTAUTH_SECRET=...              # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Circle
CIRCLE_API_KEY=...
NEXT_PUBLIC_CIRCLE_APP_ID=...

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=...
```

### Run

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Testnet USDC

Get testnet USDC from [faucet.circle.com](https://faucet.circle.com) on any supported chain.

## Supported Chains

| Chain | Domain ID |
|-------|-----------|
| Ethereum Sepolia | 0 |
| Avalanche Fuji | 1 |
| OP Sepolia | 2 |
| Arbitrum Sepolia | 3 |
| Base Sepolia | 6 |
| Polygon Amoy | 7 |
| Arc Testnet (destination) | 26 |

## Integration Reference

### Circle CCTP

Cross-Chain Transfer Protocol handles bridging USDC from any source chain to Arc Testnet.

**CCTP config and contract addresses**
[`src/lib/cctp-config.ts#L1-L4`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/lib/cctp-config.ts#L1-L4) — ARC domain (26), forwarding hook data, chain configs with TokenMessengerV2 addresses and domain IDs.

**CCTP ABI (depositForBurnWithHook)**
[`src/lib/cctp-abis.ts#L31-L48`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/lib/cctp-abis.ts#L31-L48) — ABI definition for the `depositForBurnWithHook` function on TokenMessengerV2.

**USDC approval + burn transaction (donation flow)**
[`src/app/donate/[streamerId]/DonationForm.tsx#L140-L170`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/app/donate/%5BstreamerId%5D/DonationForm.tsx#L140-L170) — Approves USDC spend, then calls `depositForBurnWithHook` with forwarding hook data to bridge to Arc.

**IRIS API — fetch forwarding fees**
[`src/app/api/cctp/fees/route.ts#L18`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/app/api/cctp/fees/route.ts#L18) — Calls Circle's IRIS API to get forwarding fees for the source→ARC route.

**IRIS API — poll for transfer completion (client-side)**
[`src/app/donate/[streamerId]/DonationForm.tsx#L191-L228`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/app/donate/%5BstreamerId%5D/DonationForm.tsx#L191-L228) — Polls `/v2/messages/{domain}?transactionHash={tx}` to detect when the forwarding is complete.

**IRIS API — server-side status refresh**
[`src/app/api/donations/refresh/route.ts#L72-L105`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/app/api/donations/refresh/route.ts#L72-L105) — Re-checks IRIS for stale PENDING/FORWARDING donations, detects on-chain failures via RPC receipt checks.

### Arc Testnet

Streamers receive donations into Circle programmable wallets on Arc Testnet.

**Wallet creation on ARC-TESTNET**
[`src/lib/circle.ts#L39`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/lib/circle.ts#L39) — `initializeUser()` passes `blockchains: ["ARC-TESTNET"]` to Circle's API.

**Wallet discovery and storage**
[`src/app/api/circle/wallets/route.ts#L18-L30`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/app/api/circle/wallets/route.ts#L18-L30) — Filters Circle wallets for `blockchain === "ARC-TESTNET"` and stores the address in the database.

**ARC domain used as CCTP destination**
[`src/app/donate/[streamerId]/DonationForm.tsx#L162`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/app/donate/%5BstreamerId%5D/DonationForm.tsx#L162) — `ARC_DOMAIN` (26) passed as `destinationDomain` in `depositForBurnWithHook`.

### Circle Programmable Wallets

Each streamer gets a Circle programmable wallet on Arc Testnet during onboarding. The wallet receives bridged USDC and supports withdrawals.

**Server-side Circle API wrapper**
[`src/lib/circle.ts#L1-L134`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/lib/circle.ts#L1-L134) — `createUserToken()`, `initializeUser()` (with `blockchains: ["ARC-TESTNET"]`), `createUser()`, `listWallets()`, `getWalletBalance()`, `createTransferChallenge()`.

**Client-side wallet creation hook**
[`src/hooks/useCircleWallet.ts#L14-L92`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/hooks/useCircleWallet.ts#L14-L92) — Orchestrates the full wallet creation flow: device token → initialize → W3S SDK challenge → fetch wallets.

**Device token endpoint (creates Circle user if needed)**
[`src/app/api/circle/device-token/route.ts#L8-L33`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/app/api/circle/device-token/route.ts#L8-L33) — Creates a Circle user ID, stores it in the database, and returns `userToken` + `encryptionKey`.

**Initialize user on ARC-TESTNET**
[`src/app/api/circle/initialize/route.ts#L6-L19`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/app/api/circle/initialize/route.ts#L6-L19) — Calls `initializeUser()` which passes `blockchains: ["ARC-TESTNET"]` to Circle's API.

**Wallet discovery and storage**
[`src/app/api/circle/wallets/route.ts#L18-L31`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/app/api/circle/wallets/route.ts#L18-L31) — Filters for `blockchain === "ARC-TESTNET" && state === "LIVE"`, stores `circleWalletId` and `circleWalletAddress` in the database.

**Balance check**
[`src/app/api/balance/route.ts#L21-L26`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/app/api/balance/route.ts#L21-L26) — Fetches wallet token balances via `getWalletBalance()`, extracts the USDC amount.

**Withdrawal (transfer challenge)**
[`src/app/api/withdraw/route.ts#L33-L45`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/app/api/withdraw/route.ts#L33-L45) — Creates a transfer challenge via `createTransferChallenge()` for sending USDC out of the programmable wallet.

### ENS

Donor addresses are resolved to ENS names (when available) for display in alerts.

**ENS resolution function**
[`src/lib/ens.ts#L9-L20`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/lib/ens.ts#L9-L20) — Uses viem's `getEnsName()` on Sepolia to reverse-resolve donor addresses.

**ENS used in donation alerts**
[`src/app/api/donations/[id]/status/route.ts#L38`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/app/api/donations/%5Bid%5D/status/route.ts#L38) — Resolves donor ENS name when a donation completes, includes it in the alert overlay.

[`src/app/api/donations/refresh/route.ts#L88`](https://github.com/therealharpaljadeja/streamer-arc/blob/main/src/app/api/donations/refresh/route.ts#L88) — Same ENS resolution during server-side status refresh.
