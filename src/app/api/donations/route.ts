import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      where: { streamerId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.donation.count({
      where: { streamerId: session.user.id },
    }),
  ]);

  return NextResponse.json({
    donations,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { streamerId, donorAddress, amount, message, sourceChain, sourceTxHash } =
    body;

  if (!streamerId || !donorAddress || !amount || !sourceChain || !sourceTxHash) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const streamer = await prisma.user.findUnique({
    where: { id: streamerId },
  });
  if (!streamer) {
    return NextResponse.json(
      { error: "Streamer not found" },
      { status: 404 }
    );
  }

  const donation = await prisma.donation.create({
    data: {
      streamerId,
      donorAddress,
      amount: Number(amount),
      message: message?.slice(0, 200) || null,
      sourceChain,
      sourceTxHash,
      status: "PENDING",
    },
  });

  return NextResponse.json(donation, { status: 201 });
}
