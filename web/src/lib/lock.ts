import { promises as fs } from "node:fs";
import path from "node:path";
import { scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { companyDir, isSlug } from "./companies";

// Company passcodes are retired (D9): accounts replaced them. A company set up
// before accounts still has its old passcode hash in
// web/.data/companies/<id>/lock.json; it is used once, to claim the company
// for an account, and then deleted.

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

type Lock = { salt: string; hash: string };

function lockFile(id: string): string {
  return path.join(companyDir(id), "lock.json");
}

async function readLock(id: string): Promise<Lock | null> {
  if (!isSlug(id)) return null;
  try {
    return JSON.parse(await fs.readFile(lockFile(id), "utf8")) as Lock;
  } catch {
    return null;
  }
}

/** True when the company has an old passcode and this is it. */
export async function checkOldPasscode(id: string, passcode: string): Promise<boolean> {
  const lock = await readLock(id);
  if (!lock) return false;
  const hash = await scrypt(passcode, Buffer.from(lock.salt, "hex"), 32);
  return timingSafeEqual(hash, Buffer.from(lock.hash, "hex"));
}

export async function retireOldPasscode(id: string): Promise<void> {
  await fs.rm(lockFile(id), { force: true });
}
