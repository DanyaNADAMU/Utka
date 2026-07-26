import { auth } from "@/auth"
import { NextResponse } from "next/server"

export const proxy = auth((req) => {
  if (!req.auth) {
    // Auto-redirect unauthenticated users directly to Authentik (skips NextAuth intermediate page)
    return NextResponse.redirect(new URL("/api/auth/signin/authentik", req.url))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
