"use client";

import { useState, useEffect } from "react";
import { useAppKit } from "@reown/appkit/react";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWriteContract,
  useReadContract,
  useConfig,
} from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { parseUnits } from "viem";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CHAIN_CONFIGS,
  getChainConfig,
  padAddressTo32Bytes,
  ARC_DOMAIN,
  FORWARDING_HOOK_DATA,
} from "@/lib/cctp-config";
import { ERC20_ABI, TOKEN_MESSENGER_V2_ABI } from "@/lib/cctp-abis";

interface DonationFormProps {
  streamerId: string;
  streamerAddress: string;
  streamerName: string;
  minDonation: number;
}

type DonationStep =
  | "input"
  | "fetching-fees"
  | "approving"
  | "burning"
  | "polling"
  | "done"
  | "error";

const IRIS_API_BASE = "https://iris-api-sandbox.circle.com";

function getUserFriendlyError(err: unknown): string {
  const message =
    err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("user denied")) {
    return "Transaction was cancelled.";
  }
  if (lower.includes("insufficient funds") || lower.includes("insufficient balance")) {
    return "Insufficient funds. Please check your USDC balance.";
  }
  if (lower.includes("exceeds allowance")) {
    return "Token allowance too low. Please try again.";
  }
  if (lower.includes("network") || lower.includes("disconnected")) {
    return "Network error. Please check your connection and try again.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Request timed out. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

export default function DonationForm({
  streamerId,
  streamerAddress,
  streamerName,
  minDonation,
}: DonationFormProps) {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const config = useConfig();

  const [selectedChainId, setSelectedChainId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<DonationStep>("input");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [donationId, setDonationId] = useState<string | null>(null);

  const chainConfig = selectedChainId
    ? getChainConfig(Number(selectedChainId))
    : null;

  // Read current allowance
  const { data: allowance } = useReadContract({
    address: chainConfig?.usdc,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && chainConfig
      ? [address, chainConfig.tokenMessengerV2]
      : undefined,
    query: {
      enabled: !!address && !!chainConfig,
    },
  });

  // Auto-switch chain
  useEffect(() => {
    if (selectedChainId && Number(selectedChainId) !== chainId) {
      switchChain({ chainId: Number(selectedChainId) });
    }
  }, [selectedChainId, chainId, switchChain]);

  const handleDonate = async () => {
    if (!chainConfig || !address || !amount) return;

    setError(null);
    const amountNum = parseFloat(amount);
    if (amountNum < minDonation) {
      setError(`Minimum donation is ${minDonation} USDC`);
      return;
    }

    try {
      // Step 1: Fetch fees
      setStep("fetching-fees");
      const feesRes = await fetch(
        `/api/cctp/fees?sourceDomain=${chainConfig.domain}`
      );
      if (!feesRes.ok) throw new Error("Failed to fetch fees");
      const feesData = await feesRes.json();

      const transferAmount = parseUnits(amount, 6);
      const maxFee = BigInt(feesData.fee || "0");
      const totalAmount = transferAmount + maxFee;

      // Step 2: Approve if needed
      const currentAllowance = (allowance as bigint) || BigInt(0);
      if (currentAllowance < totalAmount) {
        setStep("approving");
        const approveTx = await writeContractAsync({
          address: chainConfig.usdc,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [chainConfig.tokenMessengerV2, totalAmount],
        });

        await waitForTransactionReceipt(config, { hash: approveTx });
      }

      // Step 3: depositForBurnWithHook
      setStep("burning");
      const mintRecipient = padAddressTo32Bytes(streamerAddress);
      const burnTx = await writeContractAsync({
        address: chainConfig.tokenMessengerV2,
        abi: TOKEN_MESSENGER_V2_ABI,
        functionName: "depositForBurnWithHook",
        args: [
          totalAmount,
          ARC_DOMAIN,
          mintRecipient,
          chainConfig.usdc,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          maxFee,
          2000,
          FORWARDING_HOOK_DATA,
        ],
      });
      setTxHash(burnTx);

      // Step 4: Create donation record
      const donationRes = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamerId,
          donorAddress: address,
          amount: amountNum,
          message: message.slice(0, 200),
          sourceChain: chainConfig.name,
          sourceTxHash: burnTx,
        }),
      });
      const donation = await donationRes.json();
      setDonationId(donation.id);

      // Step 5: Poll for forward confirmation
      setStep("polling");
      const pollForCompletion = async () => {
        const maxAttempts = 120;
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((r) => setTimeout(r, 5000));
          try {
            const irisRes = await fetch(
              `${IRIS_API_BASE}/v2/messages/${chainConfig.domain}?transactionHash=${burnTx}`
            );
            if (irisRes.ok) {
              const irisData = await irisRes.json();
              const msg = irisData.messages?.[0];
              if (msg?.status === "complete" && msg?.forwardTxHash) {
                await fetch(`/api/donations/${donation.id}/status`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: "COMPLETED",
                    forwardTxHash: msg.forwardTxHash,
                  }),
                });
                setStep("done");
                return;
              }
            }
          } catch {
            // Continue polling
          }
        }
        // If we've exhausted polling, mark as forwarding
        await fetch(`/api/donations/${donation.id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "FORWARDING" }),
        });
        setStep("done");
      };

      pollForCompletion();
    } catch (err) {
      setError(getUserFriendlyError(err));
      setStep("error");
    }
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        {!isConnected ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-muted-foreground">
              Connect your wallet to donate
            </p>
            <Button onClick={() => open()}>Connect Wallet</Button>
          </div>
        ) : step === "done" ? (
          <div className="space-y-4 py-8 text-center">
            <p className="text-lg font-semibold">Donation sent!</p>
            <p className="text-sm text-muted-foreground">
              Your {amount} USDC donation to {streamerName} is being processed
              via CCTP.
            </p>
            {txHash && (
              <code className="block break-all bg-muted p-2 text-xs">
                TX: {txHash}
              </code>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setStep("input");
                setAmount("");
                setMessage("");
                setTxHash(null);
                setDonationId(null);
              }}
            >
              Donate Again
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <w3m-button balance="hide" size="sm" />
            </div>

            <div className="space-y-2">
              <Label>Source Chain</Label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {Object.values(CHAIN_CONFIGS).map((config) => (
                  <button
                    key={config.chainId}
                    type="button"
                    onClick={() =>
                      setSelectedChainId(config.chainId.toString())
                    }
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors hover:bg-accent",
                      selectedChainId === config.chainId.toString()
                        ? "border-primary bg-accent"
                        : "border-transparent"
                    )}
                  >
                    <img
                      src={config.logo}
                      alt={config.shortName}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                    <span className="text-[11px] leading-tight text-muted-foreground">
                      {config.shortName}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount (USDC)</Label>
              <Input
                type="number"
                placeholder={`Min ${minDonation}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={minDonation}
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Message{" "}
                <span className="text-muted-foreground">
                  ({message.length}/200)
                </span>
              </Label>
              <Input
                placeholder="Say something nice..."
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                maxLength={200}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {step !== "input" && step !== "error" && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {step === "fetching-fees" && "Fetching fees..."}
                  {step === "approving" && "Approving USDC..."}
                  {step === "burning" && "Sending transaction..."}
                  {step === "polling" && "Waiting for confirmation..."}
                </Badge>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={
                !selectedChainId ||
                !amount ||
                parseFloat(amount) < minDonation ||
                (step !== "input" && step !== "error")
              }
              onClick={handleDonate}
            >
              {step === "input" || step === "error"
                ? `Donate ${amount || "0"} USDC`
                : "Processing..."}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
