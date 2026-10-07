import { NextResponse, type NextRequest } from "next/server";
import { COMPANY_HEADER, isSlug } from "@/lib/companies";
import { COMPANY_COOKIE, sessionCookie, sessionValid } from "@/lib/lock";

// The lobby ("/"), creating a company ("/new") and entering one
// ("/enter/<slug>") are open. Every other page belongs to the company this
// browser entered, and needs that company's session. The company header is
// set only here, so a client can never choose it. Server actions check the
// session again themselves (requireFounder in app/actions.ts).
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const forwarded = new Headers(request.headers);
  forwarded.delete(COMPANY_HEADER);

  if (path === "/" || path === "/new" || path.startsWith("/enter/")) {
    return NextResponse.next({ request: { headers: forwarded } });
  }

  const slug = request.cookies.get(COMPANY_COOKIE)?.value;
  if (isSlug(slug) && (await sessionValid(slug, request.cookies.get(sessionCookie(slug))?.value))) {
    forwarded.set(COMPANY_HEADER, slug);
    return NextResponse.next({ request: { headers: forwarded } });
  }
  return NextResponse.redirect(new URL(isSlug(slug) ? `/enter/${slug}` : "/", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
