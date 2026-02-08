import { NextRequest, NextResponse } from "next/server";
import { ARC_DOMAIN } from "@/lib/cctp-config";

const IRIS_API_BASE = "https://iris-api-sandbox.circle.com";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sourceDomain = url.searchParams.get("sourceDomain");

  if (!sourceDomain) {
    return NextResponse.json(
      { error: "Missing sourceDomain" },
      { status: 400 }
    );
  }

  try {
    const irisUrl = `${IRIS_API_BASE}/v2/burn/USDC/fees/${sourceDomain}/${ARC_DOMAIN}?forward=true`;
    const res = await fetch(irisUrl);

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Iris API error: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // IRIS returns an array of fee tiers by finalityThreshold.
    // Use threshold 2000 (Standard) for cheaper fees on small donations.
    // Fee = max(minimumFee in raw units, forwardFee.high) to satisfy
    // the on-chain minFee check in TokenMessengerV2.
    if (Array.isArray(data)) {
      const tier = data.find(
        (t: { finalityThreshold: number }) => t.finalityThreshold === 2000
      ) || data[0];

      const minimumFeeRaw = Math.ceil((tier?.minimumFee ?? 0) * 1e6);
      const forwardFee = tier?.forwardFee?.high ?? tier?.forwardFee?.med ?? 0;
      const fee = Math.max(minimumFeeRaw, forwardFee);
      return NextResponse.json({ fee: String(fee), tiers: data });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch fees" },
      { status: 500 }
    );
  }
}
