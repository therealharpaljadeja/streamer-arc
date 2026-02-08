"use client";

import { useState } from "react";
import SessionProvider from "@/components/providers/SessionProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, type Config } from "wagmi";
import { createAppKit } from "@reown/appkit/react";
import { wagmiAdapter, projectId, networks } from "@/lib/wagmi";
import { sepolia } from "@reown/appkit/networks";

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [sepolia, ...networks.slice(1)] as [typeof sepolia, ...(typeof networks)],
  defaultNetwork: sepolia,
  metadata: {
    name: "Arc Streamer Alerts",
    description: "Livestream donation alerts powered by Arc & Circle CCTP",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    icons: [],
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </SessionProvider>
  );
}
