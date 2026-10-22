import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { isSiteClosed } from "@/lib/maintenance";

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    const isStaffToken = ["OWNER", "ADMIN", "DEV", "MODERATOR"].includes(token?.role as string);
    const isAsset = /\.[a-z0-9]+$/i.test(path);
    if (!isStaffToken && !isAsset && path !== "/ferme" && (await isSiteClosed())) {
      return NextResponse.redirect(new URL("/ferme", req.url));
    }
    const isSetupPage = req.nextUrl.pathname === "/setup";

    if (token && !token.minecraftName && !isSetupPage) {
      return NextResponse.redirect(new URL("/setup", req.url));
    }
    if (token && token.minecraftName && isSetupPage) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (req.nextUrl.pathname.startsWith("/admin") || req.nextUrl.pathname.startsWith("/bot")) {
      if (!token || !["OWNER", "ADMIN", "DEV", "MODERATOR"].includes(token.role as string)) {
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|Paranoia_no_effect.png|opengraph-image|sitemap.xml|robots.txt).*)"],
};
