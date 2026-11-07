import { auth } from "@/auth"
import { NextResponse } from "next/server"

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>404: This page could not be found</title>
</head>
<body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;height:100vh;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;color:#000;margin:0;">
<div style="display:flex;align-items:center;">
<h1 style="border-right:1px solid rgba(0,0,0,.3);margin:0;margin-right:20px;padding:10px 23px 10px 0;font-size:24px;font-weight:500;vertical-align:top;">404</h1>
<div style="display:inline-block;"><h2 style="font-size:14px;font-weight:400;line-height:28px;margin:0;">This page could not be found.</h2></div>
</div>
</body>
</html>`

export const proxy = auth((req) => {
  const pathname = req.nextUrl.pathname;

  // Subscription delivery endpoints (UUID tokens, /s/, /sub/) must be accessible without web session
  const isSubscriptionPath =
    pathname.startsWith('/s/') ||
    pathname.startsWith('/sub/') ||
    /^\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\.(ya?ml|json|txt))?$/i.test(pathname);

  // Unauthenticated visitors to web routes: redirect to sign-in
  if (!req.auth) {
    if (isSubscriptionPath) {
      return NextResponse.next();
    }
    const signinUrl = new URL("/api/auth/signin", req.url);
    signinUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(signinUrl);
  }

  // Authenticated user at root: redirect to role workspace
  if (pathname === "/") {
    const role = (req.auth.user as any)?.role;
    return NextResponse.redirect(new URL(role === "ADMIN" ? "/admin" : "/dash", req.url));
  }

  // Non-admin trying to access /admin: return generic 404
  if (pathname.startsWith("/admin") && (req.auth.user as any)?.role !== "ADMIN") {
    return new NextResponse(NOT_FOUND_HTML, {
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "x-robots-tag": "noindex, nofollow, noarchive",
      },
    });
  }

  const res = NextResponse.next();
  const locale = req.cookies.get("NEXT_LOCALE")?.value;
  if (!locale) {
    res.cookies.set("NEXT_LOCALE", "ru");
  }

  return res;
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

