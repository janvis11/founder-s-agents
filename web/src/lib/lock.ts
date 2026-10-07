import { promises as fs } from "node:fs";
import path from "node:path";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { companyDir, isSlug } from "./companies";

// Each company's office lock (D8): a passcode stored as a salted scrypt hash
// in web/.data/companies/<slug>/lock.json, never in plain text, and a
// session cookie per company. Forgot it? Delete that file on this machine;
// the next person to enter the company sets a new one.

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

/** Which company this browser is inside. */
export const COMPANY_COOKIE = "fc_company";

export function sessionCookie(slug: string): string {
  return `fc_session_${slug}`;
}

type Lock = { salt: string; hash: string; sessionKey: string };

function lockFile(slug: string): string {
  return path.join(companyDir(slug), "lock.json");
}

export async function readLock(slug: string): Promise<Lock | null> {
  if (!isSlug(slug)) return null;
  try {
    return JSON.parse(await fs.readFile(lockFile(slug), "utf8")) as Lock;
  } catch {
    return null;
  }
}

export async function setPasscode(slug: string, passcode: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(passcode, salt, 32);
  const lock: Lock = { salt: salt.toString("hex"), hash: hash.toString("hex"), sessionKey: randomBytes(32).toString("hex") };
  await fs.mkdir(companyDir(slug), { recursive: true });
  await fs.writeFile(lockFile(slug), JSON.stringify(lock), { encoding: "utf8", mode: 0o600 });
  return sessionToken(lock);
}

/** The cookie value for a valid session, or null when the passcode is wrong. */
export async function checkPasscode(slug: string, passcode: string): Promise<string | null> {
  const lock = await readLock(slug);
  if (!lock) return null;
  const hash = await scrypt(passcode, Buffer.from(lock.salt, "hex"), 32);
  return timingSafeEqual(hash, Buffer.from(lock.hash, "hex")) ? sessionToken(lock) : null;
}

function sessionToken(lock: Lock): string {
  return createHmac("sha256", lock.sessionKey).update("founder-session").digest("hex");
}

/** True only when the company has a passcode and the cookie carries its session. */
export async function sessionValid(slug: string | null | undefined, cookie: string | undefined): Promise<boolean> {
  if (!slug) return false;
  const lock = await readLock(slug);
  if (!lock || !cookie) return false;
  const expected = Buffer.from(sessionToken(lock));
  const given = Buffer.from(cookie);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};
