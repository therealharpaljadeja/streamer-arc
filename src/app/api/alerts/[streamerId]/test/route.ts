import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { emitDonationAlert } from "@/lib/alert-emitter";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ streamerId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { streamerId } = await params;

  if (!session?.user?.id || session.user.id !== streamerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  emitDonationAlert(streamerId, {
    id: "test-" + Date.now(),
    donorAddress: "0x1234567890abcdef1234567890abcdef12345678",
    donorName: "testuser.eth",
    amount: 5,
    message: "This is a test donation alert!",
    sourceChain: "Ethereum Sepolia",
  });

  return NextResponse.json({ success: true });
}
