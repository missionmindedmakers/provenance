import { Readable } from "node:stream";
import { sha256 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";
import { toBase64Url, validateBundle } from "@cliproot/protocol";
import type { CrpBundle } from "@cliproot/protocol";
import { decompress } from "fzstd";
import * as tarStream from "tar-stream";
import { eq } from "drizzle-orm";
import type { RegistryDb } from "../db/connection.js";
import * as schema from "../db/schema.js";
import type { BlobStore } from "../storage/blob-store.js";
import { AppError } from "../middleware/error-handler.js";
import { indexBundles, computeBundleHash } from "./clip-service.js";
import type { PublishPackResult } from "../types.js";

function computeHash(data: Uint8Array): string {
  const digest = sha256(data);
  return `sha256-${toBase64Url(digest)}`;
}

interface PackManifest {
  format: string;
  createdAt: string;
  project: { id: string; name: string; description?: string };
  roots: { mode: string; projectId?: string; clipHashes: string[] };
  counts: {
    bundles: number;
    clips: number;
    edges: number;
    artifacts: number;
    links: number;
  };
  objects: Array<{
    bundleHash: string;
    archivePath: string;
    byteSize: number;
    sha256Digest: string;
    clipHashes: string[];
  }>;
  artifacts: Array<{
    artifactHash: string;
    artifactType: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
    sha256Digest: string;
    archivePath: string;
    id?: string;
    metadata?: Record<string, unknown>;
    createdAt?: string;
  }>;
  clipArtifactRefs?: Array<{
    clipHash: string;
    artifactHash: string;
    relationship: string;
  }>;
}

async function extractTar(
  tarBuffer: Uint8Array,
): Promise<Map<string, Buffer>> {
  const entries = new Map<string, Buffer>();
  const extract = tarStream.extract();

  return new Promise((resolve, reject) => {
    extract.on("entry", (header, stream, next) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => {
        entries.set(header.name, Buffer.concat(chunks));
        next();
      });
      stream.on("error", reject);
    });

    extract.on("finish", () => resolve(entries));
    extract.on("error", reject);

    const readable = Readable.from(Buffer.from(tarBuffer));
    readable.pipe(extract);
  });
}

function validateManifest(data: unknown): PackManifest {
  const manifest = data as PackManifest;
  if (manifest.format !== "cliproot-pack-v1") {
    throw new AppError(
      422,
      "invalid_pack",
      `Invalid pack format: expected "cliproot-pack-v1", got "${manifest.format}"`,
    );
  }
  if (!manifest.project || !manifest.objects) {
    throw new AppError(
      422,
      "invalid_pack",
      "Pack manifest missing required fields: project, objects",
    );
  }
  return manifest;
}

function verifyPackIntegrity(
  manifest: PackManifest,
  entries: Map<string, Buffer>,
): void {
  // Completeness: every archivePath must exist
  for (const obj of manifest.objects) {
    if (!entries.has(obj.archivePath)) {
      throw new AppError(
        422,
        "invalid_pack",
        `Missing archive entry: ${obj.archivePath}`,
      );
    }
  }
  for (const art of manifest.artifacts ?? []) {
    if (!entries.has(art.archivePath)) {
      throw new AppError(
        422,
        "invalid_pack",
        `Missing archive entry: ${art.archivePath}`,
      );
    }
  }

  // Byte size and digest verification for objects
  for (const obj of manifest.objects) {
    const data = entries.get(obj.archivePath)!;
    if (data.length !== obj.byteSize) {
      throw new AppError(
        422,
        "invalid_pack",
        `Object ${obj.archivePath}: expected ${obj.byteSize} bytes, got ${data.length}`,
      );
    }
    const hash = computeHash(data);
    if (hash !== obj.sha256Digest) {
      throw new AppError(
        422,
        "invalid_pack",
        `Object ${obj.archivePath}: digest mismatch`,
      );
    }
  }

  // Byte size and digest verification for artifacts
  for (const art of manifest.artifacts ?? []) {
    const data = entries.get(art.archivePath)!;
    if (data.length !== art.byteSize) {
      throw new AppError(
        422,
        "invalid_pack",
        `Artifact ${art.archivePath}: expected ${art.byteSize} bytes, got ${data.length}`,
      );
    }
    const hash = computeHash(data);
    if (hash !== art.sha256Digest) {
      throw new AppError(
        422,
        "invalid_pack",
        `Artifact ${art.archivePath}: digest mismatch`,
      );
    }
  }

  // Count consistency
  let totalClips = 0;
  let totalEdges = 0;
  const bundleCount = manifest.objects.length;
  const artifactCount = (manifest.artifacts ?? []).length;
  const linkCount = (manifest.clipArtifactRefs ?? []).length;

  for (const obj of manifest.objects) {
    // Parse the bundle to count clips and edges
    const data = entries.get(obj.archivePath)!;
    const bundle = JSON.parse(data.toString("utf-8")) as CrpBundle;
    totalClips += (bundle.clips ?? []).length;
    totalEdges += (bundle.edges ?? []).length;
  }

  if (bundleCount !== manifest.counts.bundles) {
    throw new AppError(
      422,
      "invalid_pack",
      `Count mismatch: manifest says ${manifest.counts.bundles} bundles, archive has ${bundleCount}`,
    );
  }
  if (totalClips !== manifest.counts.clips) {
    throw new AppError(
      422,
      "invalid_pack",
      `Count mismatch: manifest says ${manifest.counts.clips} clips, bundles contain ${totalClips}`,
    );
  }
  if (totalEdges !== manifest.counts.edges) {
    throw new AppError(
      422,
      "invalid_pack",
      `Count mismatch: manifest says ${manifest.counts.edges} edges, bundles contain ${totalEdges}`,
    );
  }
  if (artifactCount !== manifest.counts.artifacts) {
    throw new AppError(
      422,
      "invalid_pack",
      `Count mismatch: manifest says ${manifest.counts.artifacts} artifacts, archive has ${artifactCount}`,
    );
  }
  if (linkCount !== manifest.counts.links) {
    throw new AppError(
      422,
      "invalid_pack",
      `Count mismatch: manifest says ${manifest.counts.links} links, manifest has ${linkCount}`,
    );
  }
}

export async function publishPack(
  db: RegistryDb,
  blobStore: BlobStore,
  rawBytes: Uint8Array,
  owner: string,
  baseUrl: string,
): Promise<PublishPackResult> {
  // Compute pack hash
  const packHash = computeHash(rawBytes);

  // Check for duplicate
  const existing = db
    .select()
    .from(schema.packs)
    .where(eq(schema.packs.packHash, packHash))
    .get();
  if (existing) {
    throw new AppError(409, "duplicate_pack", "A pack with this hash already exists");
  }

  // Decompress zstd
  let tarBuffer: Uint8Array;
  try {
    tarBuffer = decompress(new Uint8Array(rawBytes));
  } catch (err) {
    throw new AppError(
      422,
      "invalid_pack",
      `Failed to decompress pack: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  // Extract tar
  const entries = await extractTar(tarBuffer);

  // Parse and validate manifest
  const manifestData = entries.get("manifest.json");
  if (!manifestData) {
    throw new AppError(422, "invalid_pack", "Pack archive missing manifest.json");
  }

  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(manifestData.toString("utf-8"));
  } catch {
    throw new AppError(422, "invalid_pack", "manifest.json is not valid JSON");
  }

  const manifest = validateManifest(manifestJson);

  // Verify pack integrity
  verifyPackIntegrity(manifest, entries);

  // Validate all bundles
  const validatedBundles: CrpBundle[] = [];
  for (const obj of manifest.objects) {
    const data = entries.get(obj.archivePath)!;
    const bundleJson = JSON.parse(data.toString("utf-8")) as unknown;
    const result = validateBundle(bundleJson);
    if (!result.ok) {
      const messages = result.errors.map((e) => e.message).join("; ");
      throw new AppError(
        422,
        "invalid_pack",
        `Bundle ${obj.archivePath} validation failed: ${messages}`,
      );
    }
    validatedBundles.push(result.value);
  }

  // Store pack archive blob
  await blobStore.put("packs", packHash, Buffer.from(rawBytes));

  // Store artifact blobs
  for (const art of manifest.artifacts ?? []) {
    const data = entries.get(art.archivePath)!;
    await blobStore.put("artifacts", art.artifactHash, data);
  }

  // Index bundles (this stores bundle blobs + inserts into DB)
  const projectName = manifest.project.id;
  const indexResult = indexBundles(db, blobStore, {
    owner,
    projectName,
    bundles: validatedBundles,
  });

  // Insert pack record
  db.insert(schema.packs)
    .values({
      packHash,
      projectId: indexResult.projectId,
      clipCount: indexResult.clipCount,
      artifactCount: indexResult.artifactCount,
      edgeCount: indexResult.edgeCount,
      byteSize: rawBytes.length,
      createdAt: manifest.createdAt,
    })
    .run();

  // Update project latest pack hash
  db.update(schema.projects)
    .set({ latestPackHash: packHash })
    .where(eq(schema.projects.id, indexResult.projectId))
    .run();

  return {
    packHash,
    owner,
    project: projectName,
    clips: indexResult.clipCount,
    artifacts: indexResult.artifactCount,
    edges: indexResult.edgeCount,
    url: `${baseUrl}/v1/index/projects/${owner}/${projectName}`,
  };
}
