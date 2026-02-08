import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listWallets } from "@/lib/circle";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userToken = req.headers.get("X-User-Token");
  if (!userToken) {
    return NextResponse.json({ error: "Missing user token" }, { status: 400 });
  }

  const wallets = await listWallets(userToken);
  const arcWallet = wallets.find(
    (w) => w.blockchain === "ARC-TESTNET" && w.state === "LIVE"
  );

  if (arcWallet) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        circleWalletId: arcWallet.id,
        circleWalletAddress: arcWallet.address,
      },
    });
  }

  return NextResponse.json({ wallets, arcWallet });
}
