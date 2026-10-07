import { promises as fs } from "node:fs";
import path from "node:path";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Signed session tokens (D9). The cookie carries the account id, a session id
// and an expiry, signed with this install's secret. The proxy checks only
// the signature and expiry (files, no database); the server then checks the
// session id is still live in the accounts database, so signing out takes
// effect at once.

export const SESSION_COOKIE = "fc_session";
/** Which of the founder's companies this browser is working in. */
export const COMPANY_COOKIE = "fc_company";
export const ACCOUNT_HEADER = "x-fc-account";
export const SESSION_HEADER = "x-fc-session";

const SECRET_FILE = path.join(process.cwd(), ".data", "install", "secret.key");
const MAX_AGE_S = 60 * 60 * 24 * 30;

export type SessionClaims = { sid: string; aid: string; exp: number };

let cached: Buffer | null = null;

async function secret(create: boolean): Promise<Buffer | null> {
  if (cached) return cached;
  try {
    cached = Buffer.from((await fs.readFile(SECRET_FILE, "utf8")).trim(), "hex");
    return cached;
  } catch {
    if (!create) return null;
    await fs.mkdir(path.dirname(SECRET_FILE), { recursive: true });
    const key = randomBytes(32);
    await fs.writeFile(SECRET_FILE, key.toString("hex"), { encoding: "utf8", mode: 0o600, flag: "wx" }).catch(() => {});
    cached = Buffer.from((await fs.readFile(SECRET_FILE, "utf8")).trim(), "hex");
    return cached;
  }
}

function sign(key: Buffer, body: string): string {
  return createHmac("sha256", key).update(body).digest("base64url");
}

export async function issueToken(aid: string, sid: string): Promise<string> {
  const key = (await secret(true))!;
  const body = Buffer.from(JSON.stringify({ sid, aid, exp: Math.floor(Date.now() / 1000) + MAX_AGE_S })).toString("base64url");
  return `${body}.${sign(key, body)}`;
}

export async function readToken(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const key = await secret(false);
  if (!key) return null;
  const expected = Buffer.from(sign(key, body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionClaims;
    if (typeof claims.sid !== "string" || typeof claims.aid !== "string" || claims.exp * 1000 < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_S,
};

/**
 * An absolute URL on the same host the browser used. In dev, request.url can
 * say "localhost" while the browser is on 127.0.0.1, and cookies do not
 * cross that difference.
 */
export function sameHost(request: Request, path: string): URL {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return host ? new URL(path, `${proto}://${host}`) : new URL(path, request.url);
}
