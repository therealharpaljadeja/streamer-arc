import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { initializeUser } from "@/lib/circle";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userToken } = await req.json();
  if (!userToken) {
    return NextResponse.json({ error: "Missing userToken" }, { status: 400 });
  }

  const result = await initializeUser(userToken);
  return NextResponse.json(result);
}
