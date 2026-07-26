import { auth } from "@/auth"
import { NextResponse } from "next/server"

export const proxy = auth((req) => {
  if (!req.auth) {
    // Auth.js v5 doesn't allow GET requests to /api/auth/signin/authentik
    // So we redirect to a custom /login route which triggers the POST signIn flow
    return NextResponse.redirect(new URL("/login", req.url))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
