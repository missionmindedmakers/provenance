import { sql } from "drizzle-orm";
import type { RegistryDb } from "../db/connection.js";

interface FtsRow {
  clip_hash: string;
  owner: string;
  project_name: string;
  snippet: string;
  rank: number;
}

export interface SearchParams {
  query: string;
  owner: string | undefined;
  project: string | undefined;
  limit: number;
  offset: number;
}

export function searchClips(db: RegistryDb, params: SearchParams) {
  const { query, owner, project, limit, offset } = params;

  // Count total matches
  const countSql = owner
    ? project
      ? sql`SELECT count(*) as total FROM clips_fts WHERE clips_fts MATCH ${query} AND owner = ${owner} AND project_name = ${project}`
      : sql`SELECT count(*) as total FROM clips_fts WHERE clips_fts MATCH ${query} AND owner = ${owner}`
    : sql`SELECT count(*) as total FROM clips_fts WHERE clips_fts MATCH ${query}`;

  const countResult = db.get<{ total: number }>(countSql);
  const total = countResult?.total ?? 0;

  // Fetch results
  const resultSql = owner
    ? project
      ? sql`SELECT clip_hash, owner, project_name, snippet(clips_fts, 3, '', '', '...', 32) as snippet, rank FROM clips_fts WHERE clips_fts MATCH ${query} AND owner = ${owner} AND project_name = ${project} ORDER BY rank LIMIT ${limit} OFFSET ${offset}`
      : sql`SELECT clip_hash, owner, project_name, snippet(clips_fts, 3, '', '', '...', 32) as snippet, rank FROM clips_fts WHERE clips_fts MATCH ${query} AND owner = ${owner} ORDER BY rank LIMIT ${limit} OFFSET ${offset}`
    : sql`SELECT clip_hash, owner, project_name, snippet(clips_fts, 3, '', '', '...', 32) as snippet, rank FROM clips_fts WHERE clips_fts MATCH ${query} ORDER BY rank LIMIT ${limit} OFFSET ${offset}`;

  const rows = db.all<FtsRow>(resultSql);

  return {
    results: rows.map((r) => ({
      clipHash: r.clip_hash,
      content: r.snippet,
      project: { owner: r.owner, name: r.project_name },
      score: Math.abs(r.rank),
    })),
    total,
  };
}
