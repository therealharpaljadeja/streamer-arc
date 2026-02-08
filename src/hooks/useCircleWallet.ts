"use client";

import { useState, useCallback } from "react";

type WalletStatus =
  | "idle"
  | "creating-token"
  | "initializing"
  | "executing-challenge"
  | "fetching-wallets"
  | "done"
  | "error";

export function useCircleWallet() {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createWallet = useCallback(async () => {
    setError(null);
    setStatus("creating-token");

    try {
      // Step 1: Get device token
      const tokenRes = await fetch("/api/circle/device-token", {
        method: "POST",
      });
      if (!tokenRes.ok) throw new Error("Failed to get device token");
      const { userToken, encryptionKey } = await tokenRes.json();

      // Step 2: Initialize user + get challenge
      setStatus("initializing");
      const initRes = await fetch("/api/circle/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userToken }),
      });
      if (!initRes.ok) throw new Error("Failed to initialize user");
      const { challengeId, alreadyInitialized } = await initRes.json();

      // Step 3: Execute challenge via Circle SDK (only if not already initialized)
      if (!alreadyInitialized && challengeId) {
        setStatus("executing-challenge");
        const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
        const sdk = new W3SSdk();
        sdk.setAppSettings({
          appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID!,
        });
        sdk.setAuthentication({
          userToken,
          encryptionKey,
        });

        await new Promise<void>((resolve, reject) => {
          sdk.execute(challengeId, (error: unknown, result: unknown) => {
            if (error) {
              const err = error as { message?: string };
              reject(new Error(err.message || "Challenge execution failed"));
              return;
            }
            const res = result as { status?: string } | null;
            if (res?.status === "COMPLETE") {
              resolve();
            } else {
              reject(new Error("Challenge not completed"));
            }
          });
        });
      }

      // Step 4: Fetch wallets
      setStatus("fetching-wallets");
      const walletsRes = await fetch("/api/circle/wallets", {
        headers: { "X-User-Token": userToken },
      });
      if (!walletsRes.ok) throw new Error("Failed to fetch wallets");
      const { arcWallet } = await walletsRes.json();

      if (arcWallet) {
        setWalletAddress(arcWallet.address);
        setStatus("done");
      } else {
        throw new Error("No Arc wallet found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }, []);

  return { status, walletAddress, error, createWallet };
}
