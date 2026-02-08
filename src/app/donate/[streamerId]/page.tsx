import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DonationForm from "./DonationForm";

export default async function DonatePage({
  params,
}: {
  params: Promise<{ streamerId: string }>;
}) {
  const { streamerId } = await params;

  const streamer = await prisma.user.findUnique({
    where: { id: streamerId },
    select: {
      id: true,
      name: true,
      image: true,
      circleWalletAddress: true,
      minDonation: true,
    },
  });

  if (!streamer || !streamer.circleWalletAddress) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Donate to {streamer.name || "Streamer"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Send USDC from any supported testnet chain
        </p>
      </div>
      <DonationForm
        streamerId={streamer.id}
        streamerAddress={streamer.circleWalletAddress}
        streamerName={streamer.name || "Streamer"}
        minDonation={streamer.minDonation}
      />
    </div>
  );
}
