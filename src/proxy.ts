import { auth } from "@/auth"
import { NextResponse } from "next/server"

export const proxy = auth((req) => {
  let res = NextResponse.next();
  
  const isProtected = req.nextUrl.pathname === '/' || req.nextUrl.pathname.startsWith('/admin');

  if (!req.auth && isProtected) {
    // Auto-redirect unauthenticated users to default sign-in
    res = NextResponse.redirect(new URL("/api/auth/signin", req.url))
  }
  
  let locale = req.cookies.get('NEXT_LOCALE')?.value;
  if (!locale) {
    res.cookies.set('NEXT_LOCALE', 'ru');
  }
  
  return res;
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
