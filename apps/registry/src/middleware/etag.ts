import { sha256 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";
import { toBase64Url } from "@cliproot/protocol";
import type { Context } from "hono";

export function computeEtag(body: string): string {
  const digest = sha256(utf8ToBytes(body));
  return `"${toBase64Url(digest).slice(0, 16)}"`;
}

export function handleEtag(c: Context, body: string): Response | null {
  const etag = computeEtag(body);
  const ifNoneMatch = c.req.header("if-none-match");

  if (ifNoneMatch === etag) {
    return c.body(null, 304);
  }

  c.header("ETag", etag);
  c.header("Cache-Control", "public, max-age=60");
  return null;
}
