import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Protect admin and driver routes
  if (pathname.startsWith("/admin") && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/driver") && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // If logged in and on login page, redirect to admin
  if (pathname === "/login" && session) {
    const role = (session.user as any)?.role;
    if (role === "driver") {
      return NextResponse.redirect(new URL("/driver", req.url));
    }
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/driver/:path*", "/login"],
};
