import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await auth();

  // Redirect unauthenticated visitors to sign in via Authentik
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Authenticated users are routed to their respective workspace
  if ((session.user as any).role === "ADMIN") {
    redirect("/admin");
  }

  redirect("/dash");
}
