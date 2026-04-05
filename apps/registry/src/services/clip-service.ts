import { sha256 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";
import { toBase64Url, validateBundle } from "@cliproot/protocol";
import type { CrpBundle } from "@cliproot/protocol";
import { eq, sql } from "drizzle-orm";
import type { RegistryDb } from "../db/connection.js";
import * as schema from "../db/schema.js";
import type { BlobStore } from "../storage/blob-store.js";
import { AppError } from "../middleware/error-handler.js";

export function computeBundleHash(bundleJson: string): string {
  const digest = sha256(utf8ToBytes(bundleJson));
  return `sha256-${toBase64Url(digest)}`;
}

export interface IndexBundlesInput {
  owner: string;
  projectName: string;
  bundles: CrpBundle[];
}

export interface IndexBundlesResult {
  projectId: number;
  clipHashes: string[];
  clipCount: number;
  edgeCount: number;
  artifactCount: number;
}

export function indexBundles(
  db: RegistryDb,
  blobStore: BlobStore,
  input: IndexBundlesInput,
): IndexBundlesResult {
  const now = new Date().toISOString();
  const allClipHashes: string[] = [];
  let totalEdges = 0;
  let totalArtifacts = 0;

  // Upsert project
  const existingProject = db
    .select()
    .from(schema.projects)
    .where(
      sql`${schema.projects.owner} = ${input.owner} AND ${schema.projects.name} = ${input.projectName}`,
    )
    .get();

  let projectId: number;
  if (existingProject) {
    projectId = existingProject.id;
    db.update(schema.projects)
      .set({ lastPublishedAt: now })
      .where(eq(schema.projects.id, projectId))
      .run();
  } else {
    const result = db
      .insert(schema.projects)
      .values({
        owner: input.owner,
        name: input.projectName,
        createdAt: now,
        lastPublishedAt: now,
      })
      .run();
    projectId = Number(result.lastInsertRowid);
  }

  for (const bundle of input.bundles) {
    const bundleJson = JSON.stringify(bundle);
    const bundleHash = computeBundleHash(bundleJson);

    // Skip if bundle already exists
    const existingBundle = db
      .select()
      .from(schema.bundles)
      .where(eq(schema.bundles.bundleHash, bundleHash))
      .get();
    if (existingBundle) {
      // Still collect clip hashes for the response
      const clips = bundle.clips ?? [];
      for (const clip of clips) {
        allClipHashes.push(clip.clipHash);
      }
      continue;
    }

    // Store bundle blob
    const bundleBuffer = Buffer.from(bundleJson, "utf-8");
    void blobStore.put("clips", bundleHash, bundleBuffer);

    db.insert(schema.bundles)
      .values({
        bundleHash,
        projectId,
        byteSize: bundleBuffer.length,
        createdAt: bundle.createdAt,
      })
      .run();

    // Index clips
    const clips = bundle.clips ?? [];
    for (const clip of clips) {
      // Skip duplicate clips
      const existing = db
        .select()
        .from(schema.clips)
        .where(eq(schema.clips.clipHash, clip.clipHash))
        .get();
      if (existing) {
        allClipHashes.push(clip.clipHash);
        continue;
      }

      db.insert(schema.clips)
        .values({
          clipHash: clip.clipHash,
          textHash: clip.textHash,
          content: clip.content ?? null,
          sourceRefs: JSON.stringify(clip.sourceRefs),
          bundleHash,
          projectId,
          createdAt: now,
        })
        .run();

      // Insert into FTS5 if clip has content
      if (clip.content) {
        db.run(
          sql`INSERT INTO clips_fts (clip_hash, owner, project_name, content) VALUES (${clip.clipHash}, ${input.owner}, ${input.projectName}, ${clip.content})`,
        );
      }

      allClipHashes.push(clip.clipHash);
    }

    // Index edges
    const edges = bundle.edges ?? [];
    for (const edge of edges) {
      // Skip duplicates
      const existing = db
        .select()
        .from(schema.edges)
        .where(eq(schema.edges.id, edge.id))
        .get();
      if (existing) continue;

      db.insert(schema.edges)
        .values({
          id: edge.id,
          edgeType: edge.edgeType,
          subjectRef: edge.subjectRef,
          objectRef: edge.objectRef,
          transformationType: edge.transformationType ?? null,
          confidence: edge.confidence ?? null,
          projectId,
          bundleHash,
          createdAt: edge.createdAt,
        })
        .run();
      totalEdges++;
    }

    // Index artifacts
    const artifacts = bundle.artifacts ?? [];
    for (const artifact of artifacts) {
      const existing = db
        .select()
        .from(schema.artifacts)
        .where(eq(schema.artifacts.artifactHash, artifact.artifactHash))
        .get();
      if (existing) continue;

      db.insert(schema.artifacts)
        .values({
          artifactHash: artifact.artifactHash,
          artifactType: artifact.artifactType,
          fileName: artifact.fileName,
          mimeType: artifact.mimeType,
          byteSize: artifact.byteSize,
          projectId,
          createdAt: artifact.createdAt ?? now,
        })
        .run();

      // Store artifact content if inline (base64-encoded)
      if (artifact.contentBase64) {
        const artifactData = Buffer.from(artifact.contentBase64, "base64");
        void blobStore.put("artifacts", artifact.artifactHash, artifactData);
      }

      totalArtifacts++;
    }

    // Index clip-artifact refs
    const clipArtifactRefs = bundle.clipArtifactRefs ?? [];
    for (const ref of clipArtifactRefs) {
      db.insert(schema.clipArtifactRefs)
        .values({
          clipHash: ref.clipHash,
          artifactHash: ref.artifactHash,
          relationship: ref.relationship,
        })
        .onConflictDoNothing()
        .run();
    }
  }

  // Update project counts
  const clipCount = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.clips)
    .where(eq(schema.clips.projectId, projectId))
    .get()!.count;
  const edgeCount = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.edges)
    .where(eq(schema.edges.projectId, projectId))
    .get()!.count;
  const artifactCount = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.artifacts)
    .where(eq(schema.artifacts.projectId, projectId))
    .get()!.count;

  db.update(schema.projects)
    .set({ clipCount, edgeCount, artifactCount })
    .where(eq(schema.projects.id, projectId))
    .run();

  return {
    projectId,
    clipHashes: allClipHashes,
    clipCount: allClipHashes.length,
    edgeCount: totalEdges,
    artifactCount: totalArtifacts,
  };
}

export function validateAndParseBundle(input: unknown): CrpBundle {
  const result = validateBundle(input);
  if (!result.ok) {
    const messages = result.errors.map((e) => e.message).join("; ");
    throw new AppError(
      422,
      "invalid_bundle",
      `Bundle validation failed: ${messages}`,
    );
  }
  return result.value;
}
