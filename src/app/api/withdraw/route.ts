import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createUserToken, createTransferChallenge } from "@/lib/circle";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { destinationAddress, amount } = await req.json();

  if (!destinationAddress || !amount) {
    return NextResponse.json(
      { error: "Missing destinationAddress or amount" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.circleUserId || !user?.circleWalletId) {
    return NextResponse.json(
      { error: "Wallet not configured" },
      { status: 400 }
    );
  }

  try {
    const { userToken } = await createUserToken(user.circleUserId);

    // USDC token ID on Arc Testnet - this may need to be configured
    const usdcTokenId = process.env.ARC_USDC_TOKEN_ID || "";

    const result = await createTransferChallenge(
      userToken,
      user.circleWalletId,
      destinationAddress,
      amount.toString(),
      usdcTokenId
    );

    return NextResponse.json({
      challengeId: result.challengeId,
      message: "Transfer challenge created. Complete in Circle SDK.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to initiate withdrawal",
      },
      { status: 500 }
    );
  }
}
