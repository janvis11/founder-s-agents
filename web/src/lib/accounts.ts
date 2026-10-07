import { promises as fs } from "node:fs";
import path from "node:path";
import { headers } from "next/headers";
import { cache } from "react";
import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { PGlite } from "@electric-sql/pglite";
import { ACCOUNT_HEADER, SESSION_HEADER } from "./session";

// The install's own database (D9): founder accounts, live sessions and who
// owns which company. Company data never lives here; each company keeps its
// own database (D8). Opened in-process only, never served on a port.

const DIR = path.join(process.cwd(), ".data", "install", "postgres");
const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

const SCHEMA = `
create table if not exists accounts (
  id text primary key,
  email text not null unique,
  name text not null,
  pw_salt text not null,
  pw_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists sessions (
  id text primary key,
  account_id text not null references accounts(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create table if not exists memberships (
  account_id text not null references accounts(id),
  company_id text not null,
  role text not null default 'founder',
  created_at timestamptz not null default now(),
  primary key (account_id, company_id)
);
`;

const g = globalThis as unknown as { fcInstall?: Promise<PGlite> };

function db(): Promise<PGlite> {
  g.fcInstall ??= (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    await fs.mkdir(DIR, { recursive: true });
    const instance = await PGlite.create(DIR);
    await instance.exec(SCHEMA);
    return instance;
  })();
  g.fcInstall.catch(() => (g.fcInstall = undefined));
  return g.fcInstall;
}

async function rows<T>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await (await db()).query<T>(text, params)).rows;
}

export type Account = { id: string; email: string; name: string };

const normalEmail = (email: string) => email.trim().toLowerCase();

export async function createAccount(name: string, email: string, password: string): Promise<Account | null> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 32);
  const account: Account = { id: randomUUID(), email: normalEmail(email), name: name.trim() };
  try {
    await rows("insert into accounts (id, email, name, pw_salt, pw_hash) values ($1, $2, $3, $4, $5)", [
      account.id,
      account.email,
      account.name,
      salt.toString("hex"),
      hash.toString("hex"),
    ]);
  } catch {
    return null; // email already used
  }
  return account;
}

/** The account for these credentials, or null. Takes the same time either way. */
export async function verifyPassword(email: string, password: string): Promise<Account | null> {
  const [row] = await rows<Account & { pw_salt: string; pw_hash: string }>(
    "select id, email, name, pw_salt, pw_hash from accounts where email = $1",
    [normalEmail(email)],
  );
  const salt = row ? Buffer.from(row.pw_salt, "hex") : randomBytes(16);
  const hash = await scrypt(password, salt, 32);
  if (!row || !timingSafeEqual(hash, Buffer.from(row.pw_hash, "hex"))) return null;
  return { id: row.id, email: row.email, name: row.name };
}

export async function openSession(accountId: string): Promise<string> {
  const id = randomBytes(24).toString("base64url");
  await rows("insert into sessions (id, account_id) values ($1, $2)", [hashId(id), accountId]);
  return id;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await rows("update sessions set revoked_at = now() where id = $1", [hashId(sessionId)]);
}

/** Session ids are stored hashed, so a copy of this database cannot be used to sign in. */
function hashId(id: string): string {
  return createHash("sha256").update(id).digest("hex");
}

/**
 * The signed-in founder for this request: the proxy has checked the cookie's
 * signature; this checks the session is still live and the account exists.
 */
export const currentAccount = cache(async (): Promise<Account | null> => {
  let aid: string | null, sid: string | null;
  try {
    const h = await headers();
    aid = h.get(ACCOUNT_HEADER);
    sid = h.get(SESSION_HEADER);
  } catch {
    return null;
  }
  if (!aid || !sid) return null;
  const [row] = await rows<Account>(
    `select a.id, a.email, a.name from sessions s join accounts a on a.id = s.account_id
      where s.id = $1 and s.account_id = $2 and s.revoked_at is null`,
    [hashId(sid), aid],
  );
  return row ?? null;
});

export async function addMembership(accountId: string, companyId: string): Promise<void> {
  await rows("insert into memberships (account_id, company_id) values ($1, $2) on conflict do nothing", [accountId, companyId]);
}

export async function isMember(accountId: string, companyId: string): Promise<boolean> {
  const [row] = await rows("select 1 from memberships where account_id = $1 and company_id = $2", [accountId, companyId]);
  return Boolean(row);
}

export async function companiesOf(accountId: string): Promise<string[]> {
  return (await rows<{ company_id: string }>("select company_id from memberships where account_id = $1 order by created_at", [accountId])).map(
    (r) => r.company_id,
  );
}

/** Companies nobody owns yet: only those set up before accounts existed. */
export async function isOwned(companyId: string): Promise<boolean> {
  const [row] = await rows("select 1 from memberships where company_id = $1", [companyId]);
  return Boolean(row);
}
