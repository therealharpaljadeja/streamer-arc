import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitDonationAlert } from "@/lib/alert-emitter";
import { resolveEnsName } from "@/lib/ens";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { status, forwardTxHash } = body;

  if (!status) {
    return NextResponse.json({ error: "Missing status" }, { status: 400 });
  }

  const donation = await prisma.donation.findUnique({
    where: { id },
  });

  if (!donation) {
    return NextResponse.json(
      { error: "Donation not found" },
      { status: 404 }
    );
  }

  const updateData: Record<string, unknown> = { status };
  if (forwardTxHash) updateData.forwardTxHash = forwardTxHash;

  const updated = await prisma.donation.update({
    where: { id },
    data: updateData,
  });

  if (status === "COMPLETED") {
    const donorName = await resolveEnsName(updated.donorAddress);
    emitDonationAlert(donation.streamerId, {
      id: updated.id,
      donorAddress: updated.donorAddress,
      donorName: donorName ?? undefined,
      amount: updated.amount,
      message: updated.message,
      sourceChain: updated.sourceChain,
    });
  }

  return NextResponse.json(updated);
}
