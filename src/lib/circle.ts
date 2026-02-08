import { v4 as uuidv4 } from "uuid";

const CIRCLE_API_BASE = "https://api.circle.com";

function getHeaders(userToken?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.CIRCLE_API_KEY}`,
  };
  if (userToken) {
    headers["X-User-Token"] = userToken;
  }
  return headers;
}

export async function createUserToken(userId: string) {
  const res = await fetch(`${CIRCLE_API_BASE}/v1/w3s/users/token`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to create user token: ${error}`);
  }
  const data = await res.json();
  return data.data as {
    userToken: string;
    encryptionKey: string;
  };
}

export async function initializeUser(userToken: string) {
  const res = await fetch(`${CIRCLE_API_BASE}/v1/w3s/user/initialize`, {
    method: "POST",
    headers: getHeaders(userToken),
    body: JSON.stringify({
      idempotencyKey: uuidv4(),
      blockchains: ["ARC-TESTNET"],
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    // User already initialized — not an error, skip challenge
    if (errorText.includes("155106") || errorText.includes("already been initialized")) {
      return { challengeId: null, alreadyInitialized: true };
    }
    throw new Error(`Failed to initialize user: ${errorText}`);
  }
  const data = await res.json();
  return { challengeId: data.data.challengeId as string, alreadyInitialized: false };
}

export async function createUser(userId: string) {
  const res = await fetch(`${CIRCLE_API_BASE}/v1/w3s/users`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ userId }),
  });
  if (!res.ok && res.status !== 409) {
    const error = await res.text();
    throw new Error(`Failed to create Circle user: ${error}`);
  }
}

export async function listWallets(userToken: string) {
  const res = await fetch(`${CIRCLE_API_BASE}/v1/w3s/wallets`, {
    method: "GET",
    headers: getHeaders(userToken),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to list wallets: ${error}`);
  }
  const data = await res.json();
  return data.data.wallets as Array<{
    id: string;
    address: string;
    blockchain: string;
    state: string;
  }>;
}

export async function getWalletBalance(
  userToken: string,
  walletId: string
) {
  const res = await fetch(
    `${CIRCLE_API_BASE}/v1/w3s/wallets/${walletId}/balances`,
    {
      method: "GET",
      headers: getHeaders(userToken),
    }
  );
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to get wallet balance: ${error}`);
  }
  const data = await res.json();
  return data.data.tokenBalances as Array<{
    token: { symbol: string; decimals: number };
    amount: string;
  }>;
}

export async function createTransferChallenge(
  userToken: string,
  walletId: string,
  destinationAddress: string,
  amount: string,
  tokenId: string
) {
  const res = await fetch(`${CIRCLE_API_BASE}/v1/w3s/user/transactions/transfer`, {
    method: "POST",
    headers: getHeaders(userToken),
    body: JSON.stringify({
      idempotencyKey: uuidv4(),
      walletId,
      destinationAddress,
      amounts: [amount],
      tokenId,
      fee: {
        type: "level",
        config: { feeLevel: "MEDIUM" },
      },
    }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to create transfer: ${error}`);
  }
  const data = await res.json();
  return data.data as { challengeId: string };
}
