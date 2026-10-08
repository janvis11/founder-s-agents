import { NextResponse, type NextRequest } from "next/server";
import { COMPANY_HEADER, isSlug } from "@/lib/companies";
import { ACCOUNT_HEADER, COMPANY_COOKIE, SESSION_COOKIE, SESSION_HEADER, readToken, sameHost } from "@/lib/session";

// Front door (D9).
// - "/" and "/signup" are open: signed out, "/" is the sign-in screen.
// - "/new", "/claim", "/key" and "/c/<id>" need a signed-in founder.
// - Everything else is inside a company: it also needs the company cookie.
// This is the only place the account, session and company headers are set,
// and any copy a client sends is removed first. The server then checks the
// session is live and the founder is a member of the company (accounts.ts,
// sql.ts), so a forged cookie or header reaches nothing.
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const forwarded = new Headers(request.headers);
  forwarded.delete(ACCOUNT_HEADER);
  forwarded.delete(SESSION_HEADER);
  forwarded.delete(COMPANY_HEADER);

  const claims = await readToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (claims) {
    forwarded.set(ACCOUNT_HEADER, claims.aid);
    forwarded.set(SESSION_HEADER, claims.sid);
  }
  const pass = () => NextResponse.next({ request: { headers: forwarded } });
  const home = () => NextResponse.redirect(sameHost(request, "/"));

  if (path === "/" || path === "/signup") return pass();
  if (!claims) return home();
  if (path === "/new" || path === "/claim" || path === "/key" || path.startsWith("/c/")) return pass();

  const company = request.cookies.get(COMPANY_COOKIE)?.value;
  if (!isSlug(company)) return home();
  forwarded.set(COMPANY_HEADER, company);
  return pass();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
