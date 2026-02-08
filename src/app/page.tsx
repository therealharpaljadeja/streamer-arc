import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingContent from "./LandingContent";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    if (session.user.hasOnboarded) {
      redirect("/dashboard");
    } else {
      redirect("/onboarding");
    }
  }

  return <LandingContent />;
}
