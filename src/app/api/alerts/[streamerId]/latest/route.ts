import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ streamerId: string }> }
) {
  const { streamerId } = await params;
  const url = new URL(req.url);
  const after = url.searchParams.get("after");

  const donation = await prisma.donation.findFirst({
    where: {
      streamerId,
      status: "COMPLETED",
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ donation });
}
