import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createUser, createUserToken } from "@/lib/circle";
import { v4 as uuidv4 } from "uuid";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let circleUserId = user.circleUserId;
  if (!circleUserId) {
    circleUserId = uuidv4();
    await prisma.user.update({
      where: { id: user.id },
      data: { circleUserId },
    });
    await createUser(circleUserId);
  }

  const tokenData = await createUserToken(circleUserId);
  return NextResponse.json(tokenData);
}
