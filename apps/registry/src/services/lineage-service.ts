import { sql } from "drizzle-orm";
import type { RegistryDb } from "../db/connection.js";

interface LineageClip {
  clipHash: string;
  textHash: string;
  content: string | null;
  sourceRefs: string;
}

interface LineageEdge {
  subjectRef: string;
  objectRef: string;
}

export function getLineage(
  db: RegistryDb,
  rootHash: string,
  maxDepth?: number,
) {
  const depthLimit = maxDepth ?? 100;

  const clips = db.all<LineageClip>(sql`
    WITH RECURSIVE lineage AS (
      SELECT clip_hash, text_hash, content, source_refs, 0 AS depth
      FROM clips WHERE clip_hash = ${rootHash}

      UNION ALL

      SELECT c.clip_hash, c.text_hash, c.content, c.source_refs, l.depth + 1
      FROM lineage l
      JOIN edges e ON e.subject_ref = l.clip_hash AND e.edge_type = 'wasDerivedFrom'
      JOIN clips c ON c.clip_hash = e.object_ref
      WHERE l.depth < ${depthLimit}
    )
    SELECT DISTINCT clip_hash AS "clipHash", text_hash AS "textHash", content, source_refs AS "sourceRefs"
    FROM lineage
  `);

  if (clips.length === 0) {
    return null;
  }

  // Get derivation edges between clips in the lineage
  const clipHashes = clips.map((c) => c.clipHash);
  const derivationEdges = db.all<LineageEdge>(sql`
    SELECT subject_ref AS "subjectRef", object_ref AS "objectRef"
    FROM edges
    WHERE edge_type = 'wasDerivedFrom'
      AND subject_ref IN (${sql.join(
        clipHashes.map((h) => sql`${h}`),
        sql`, `,
      )})
      AND object_ref IN (${sql.join(
        clipHashes.map((h) => sql`${h}`),
        sql`, `,
      )})
  `);

  // Build derivedFrom map
  const derivedFromMap = new Map<string, string[]>();
  for (const edge of derivationEdges) {
    const existing = derivedFromMap.get(edge.subjectRef) ?? [];
    existing.push(edge.objectRef);
    derivedFromMap.set(edge.subjectRef, existing);
  }

  return {
    root: rootHash,
    clips: clips.map((c) => ({
      clipHash: c.clipHash,
      textHash: c.textHash,
      content: c.content,
      sourceRefs: JSON.parse(c.sourceRefs) as string[],
      derivedFrom: derivedFromMap.get(c.clipHash) ?? [],
    })),
  };
}
