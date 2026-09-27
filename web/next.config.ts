import path from "node:path";
import dotenv from "dotenv";
import type { NextConfig } from "next";

// This repo's real .env lives at the monorepo root, one level up from
// web/ — Next.js only auto-loads .env files from its own directory.
dotenv.config({ path: path.resolve(__dirname, "..", ".env"), quiet: true });

const nextConfig: NextConfig = {
  // PGlite ships its Postgres build as WASM + data files it loads from its
  // own package directory; bundling it breaks those paths.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
