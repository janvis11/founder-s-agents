import { promises as fs } from "node:fs";
import path from "node:path";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// The office lock: one passcode for the one founder of this install (D7).
// Stored in web/.data/lock.json as a salted scrypt hash, never in plain text.
// Forgot it? Delete that file on this machine and set a new one at /setup.

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "fc_session";
const LOCK_FILE = path.join(process.cwd(), ".data", "lock.json");

type Lock = { salt: string; hash: string; sessionKey: string };

export async function readLock(): Promise<Lock | null> {
  try {
    return JSON.parse(await fs.readFile(LOCK_FILE, "utf8")) as Lock;
  } catch {
    return null;
  }
}

export async function setPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(passcode, salt, 32);
  const lock: Lock = { salt: salt.toString("hex"), hash: hash.toString("hex"), sessionKey: randomBytes(32).toString("hex") };
  await fs.mkdir(path.dirname(LOCK_FILE), { recursive: true });
  await fs.writeFile(LOCK_FILE, JSON.stringify(lock), { encoding: "utf8", mode: 0o600 });
  return sessionToken(lock);
}

/** The cookie value for a valid session, or null when the passcode is wrong. */
export async function checkPasscode(passcode: string): Promise<string | null> {
  const lock = await readLock();
  if (!lock) return null;
  const hash = await scrypt(passcode, Buffer.from(lock.salt, "hex"), 32);
  return timingSafeEqual(hash, Buffer.from(lock.hash, "hex")) ? sessionToken(lock) : null;
}

function sessionToken(lock: Lock): string {
  return createHmac("sha256", lock.sessionKey).update("founder-session").digest("hex");
}

/** True when no lock is set yet, or the cookie carries this install's session. */
export async function sessionValid(cookie: string | undefined): Promise<boolean> {
  const lock = await readLock();
  if (!lock) return true;
  if (!cookie) return false;
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
