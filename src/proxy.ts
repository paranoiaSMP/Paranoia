import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isSetupPage = req.nextUrl.pathname === "/setup";
    const isComingSoonPage = req.nextUrl.pathname === "/coming-soon";
    const isAdmin = token && token.role === "ADMIN";

    // Site is open, no coming soon redirects anymore

    if (token && !token.minecraftName && !isSetupPage) {
      return NextResponse.redirect(new URL("/setup", req.url));
    }

    if (req.nextUrl.pathname.startsWith("/admin")) {
      if (!token || token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|Paranoia_no_effect.png).*)"],
};
