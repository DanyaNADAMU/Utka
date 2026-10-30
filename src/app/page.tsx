import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";

export default async function RootPage() {
  const session = await auth();

  // Stealth: unauthenticated visitors receive a standard 404
  if (!session?.user) {
    notFound();
  }

  // Authenticated users are routed to their respective workspace
  if ((session.user as any).role === "ADMIN") {
    redirect("/admin");
  }

  redirect("/dash");
}
