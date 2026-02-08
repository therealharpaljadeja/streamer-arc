"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LandingContent() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
      <div className="max-w-2xl space-y-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Livestream Donation Alerts
        </h1>
        <p className="text-lg text-muted-foreground">
          Accept cross-chain USDC donations with real-time alerts on your
          stream. Powered by Arc and Circle CCTP.
        </p>
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            className="h-12 px-8 text-base"
            onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
          >
            Sign in with Google
          </Button>
          <p className="text-sm text-muted-foreground">
            Get started in under a minute
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 pt-8 sm:grid-cols-3">
          <div className="space-y-2">
            <h3 className="font-semibold">Cross-Chain Donations</h3>
            <p className="text-sm text-muted-foreground">
              Accept USDC from Ethereum, Arbitrum, Base, Optimism, Avalanche,
              and Polygon testnets.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Real-Time Alerts</h3>
            <p className="text-sm text-muted-foreground">
              Custom GIF animations with text-to-speech messages overlay
              directly on your stream.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Circle Wallets</h3>
            <p className="text-sm text-muted-foreground">
              Secure programmable wallet on Arc Testnet. No seed phrase needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
