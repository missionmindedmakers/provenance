import { Hono } from "hono";
import { stream } from "hono/streaming";
import type { AppContext } from "../app.js";
import { AppError } from "../middleware/error-handler.js";

const HASH_PATTERN = /^sha256-[A-Za-z0-9_-]+$/;

function validateHash(hash: string): void {
  if (!HASH_PATTERN.test(hash)) {
    throw new AppError(400, "invalid_hash", `Invalid hash format: ${hash}`);
  }
}

export function createLayer2Routes(ctx: AppContext) {
  const routes = new Hono();

  routes.get("/v1/download/packs/:hash{.+\\.cliprootpack}", async (c) => {
    const raw = c.req.param("hash");
    const hash = raw.replace(/\.cliprootpack$/, "");
    validateHash(hash);

    const data = await ctx.blobStore.get("packs", hash);
    if (!data) {
      throw new AppError(404, "not_found", "Pack not found");
    }

    c.header("Content-Type", "application/x-cliprootpack");
    c.header("Content-Length", String(data.length));
    c.header("ETag", `"${hash}"`);
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    return stream(c, async (s) => {
      await s.write(data);
    });
  });

  routes.get("/v1/download/clips/:hash{.+\\.json}", async (c) => {
    const raw = c.req.param("hash");
    const hash = raw.replace(/\.json$/, "");
    validateHash(hash);

    const data = await ctx.blobStore.get("clips", hash);
    if (!data) {
      throw new AppError(404, "not_found", "Clip bundle not found");
    }

    c.header("Content-Type", "application/json");
    c.header("Content-Length", String(data.length));
    c.header("ETag", `"${hash}"`);
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    return c.body(data);
  });

  routes.get("/v1/download/artifacts/:hash", async (c) => {
    const hash = c.req.param("hash");
    validateHash(hash);

    const data = await ctx.blobStore.get("artifacts", hash);
    if (!data) {
      throw new AppError(404, "not_found", "Artifact not found");
    }

    c.header("Content-Type", "application/octet-stream");
    c.header("Content-Length", String(data.length));
    c.header("ETag", `"${hash}"`);
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    return stream(c, async (s) => {
      await s.write(data);
    });
  });

  return routes;
}
