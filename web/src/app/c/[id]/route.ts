import { NextResponse, type NextRequest } from "next/server";
import { currentAccount, isMember } from "@/lib/accounts";
import { getCompany } from "@/lib/companies";
import { COMPANY_COOKIE, COOKIE_OPTIONS, sameHost } from "@/lib/session";

// GET /c/<id>: step into one of your own companies. Anything else (not
// signed in, not yours, no such company) goes home with no hint of which.
export async function GET(request: NextRequest, ctx: RouteContext<"/c/[id]">) {
  const { id } = await ctx.params;
  const account = await currentAccount();
  if (account && (await isMember(account.id, id)) && (await getCompany(id))) {
    const response = NextResponse.redirect(sameHost(request, "/office"));
    response.cookies.set(COMPANY_COOKIE, id, COOKIE_OPTIONS);
    return response;
  }
  return NextResponse.redirect(sameHost(request, "/"));
}
