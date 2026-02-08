import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import OverlayClient from "./OverlayClient";

export default async function OverlayPage({
  params,
}: {
  params: Promise<{ streamerId: string }>;
}) {
  const { streamerId } = await params;

  const streamer = await prisma.user.findUnique({
    where: { id: streamerId },
    select: {
      id: true,
      gifUrl: true,
      voiceName: true,
      voiceRate: true,
      voicePitch: true,
    },
  });

  if (!streamer || !streamer.gifUrl) {
    notFound();
  }

  return (
    <OverlayClient
      streamerId={streamer.id}
      gifUrl={streamer.gifUrl}
      voiceName={streamer.voiceName}
      voiceRate={streamer.voiceRate}
      voicePitch={streamer.voicePitch}
    />
  );
}
