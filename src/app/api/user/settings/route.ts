import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      voiceName: true,
      voiceRate: true,
      voicePitch: true,
      minDonation: true,
      gifUrl: true,
      circleWalletAddress: true,
    },
  });

  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { voiceName, voiceRate, voicePitch, minDonation } = body;

  const updateData: Record<string, unknown> = {};
  if (voiceName !== undefined) updateData.voiceName = voiceName;
  if (voiceRate !== undefined) updateData.voiceRate = Number(voiceRate);
  if (voicePitch !== undefined) updateData.voicePitch = Number(voicePitch);
  if (minDonation !== undefined) updateData.minDonation = Number(minDonation);

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  });

  return NextResponse.json({
    voiceName: user.voiceName,
    voiceRate: user.voiceRate,
    voicePitch: user.voicePitch,
    minDonation: user.minDonation,
  });
}
