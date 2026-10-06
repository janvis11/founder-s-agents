import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionValid } from "@/lib/lock";

// Every page sits behind the office lock once a passcode is set. Server
// actions check it again themselves (requireFounder in app/actions.ts).
export async function proxy(request: NextRequest) {
  if (await sessionValid(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  const url = new URL("/unlock", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!unlock|_next/static|_next/image|favicon.ico).*)"],
};
