import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChainConfigByName } from "@/lib/cctp-config";
import { emitDonationAlert } from "@/lib/alert-emitter";
import { resolveEnsName } from "@/lib/ens";

const IRIS_API_BASE = "https://iris-api-sandbox.circle.com";

async function checkTxReceipt(
  rpcUrl: string,
  txHash: string
): Promise<"success" | "reverted" | "pending"> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionReceipt",
        params: [txHash],
        id: 1,
      }),
    });
    const data = await res.json();
    if (!data.result) return "pending";
    return data.result.status === "0x1" ? "success" : "reverted";
  } catch {
    return "pending";
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staleDonations = await prisma.donation.findMany({
    where: {
      streamerId: session.user.id,
      status: { in: ["PENDING", "FORWARDING"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  let updated = 0;

  for (const donation of staleDonations) {
    const chainConfig = getChainConfigByName(donation.sourceChain);
    if (!chainConfig) continue;

    // Step 1: Check on-chain receipt to detect reverts
    if (donation.status === "PENDING") {
      const receiptStatus = await checkTxReceipt(
        chainConfig.rpcUrl,
        donation.sourceTxHash
      );
      if (receiptStatus === "reverted") {
        await prisma.donation.update({
          where: { id: donation.id },
          data: { status: "FAILED" },
        });
        updated++;
        continue;
      }
      if (receiptStatus === "pending") continue;
    }

    // Step 2: Check IRIS for forwarding completion
    try {
      const irisRes = await fetch(
        `${IRIS_API_BASE}/v2/messages/${chainConfig.domain}?transactionHash=${donation.sourceTxHash}`
      );
      if (!irisRes.ok) continue;

      const irisData = await irisRes.json();
      const msg = irisData.messages?.[0];

      if (msg?.status === "complete" && msg?.forwardTxHash) {
        const updatedDonation = await prisma.donation.update({
          where: { id: donation.id },
          data: { status: "COMPLETED", forwardTxHash: msg.forwardTxHash },
        });

        const donorName = await resolveEnsName(updatedDonation.donorAddress);
        emitDonationAlert(donation.streamerId, {
          id: updatedDonation.id,
          donorAddress: updatedDonation.donorAddress,
          donorName: donorName ?? undefined,
          amount: updatedDonation.amount,
          message: updatedDonation.message,
          sourceChain: updatedDonation.sourceChain,
        });
        updated++;
      } else if (donation.status === "PENDING" && msg) {
        // IRIS knows about it but not complete yet — mark as forwarding
        await prisma.donation.update({
          where: { id: donation.id },
          data: { status: "FORWARDING" },
        });
        updated++;
      }
    } catch {
      // Continue to next donation
    }
  }

  return NextResponse.json({ updated });
}
