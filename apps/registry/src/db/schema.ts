import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const projects = sqliteTable(
  "projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    clipCount: integer("clip_count").notNull().default(0),
    edgeCount: integer("edge_count").notNull().default(0),
    artifactCount: integer("artifact_count").notNull().default(0),
    latestPackHash: text("latest_pack_hash"),
    createdAt: text("created_at").notNull(),
    lastPublishedAt: text("last_published_at").notNull(),
  },
  (table) => ({
    ownerNameUniq: uniqueIndex("uq_projects_owner_name").on(
      table.owner,
      table.name,
    ),
    ownerIdx: index("idx_projects_owner").on(table.owner),
    lastPublishedIdx: index("idx_projects_last_published").on(
      table.lastPublishedAt,
    ),
  }),
);

export const bundles = sqliteTable("bundles", {
  bundleHash: text("bundle_hash").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  byteSize: integer("byte_size").notNull(),
  createdAt: text("created_at").notNull(),
});

export const clips = sqliteTable(
  "clips",
  {
    clipHash: text("clip_hash").primaryKey(),
    textHash: text("text_hash").notNull(),
    content: text("content"),
    sourceRefs: text("source_refs").notNull(), // JSON array
    bundleHash: text("bundle_hash")
      .notNull()
      .references(() => bundles.bundleHash),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    projectIdx: index("idx_clips_project").on(table.projectId),
    textHashIdx: index("idx_clips_text_hash").on(table.textHash),
  }),
);

export const edges = sqliteTable(
  "edges",
  {
    id: text("id").primaryKey(),
    edgeType: text("edge_type").notNull(),
    subjectRef: text("subject_ref").notNull(),
    objectRef: text("object_ref").notNull(),
    transformationType: text("transformation_type"),
    confidence: real("confidence"),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id),
    bundleHash: text("bundle_hash").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    subjectTypeIdx: index("idx_edges_subject_type").on(
      table.subjectRef,
      table.edgeType,
    ),
    objectTypeIdx: index("idx_edges_object_type").on(
      table.objectRef,
      table.edgeType,
    ),
    projectIdx: index("idx_edges_project").on(table.projectId),
  }),
);

export const artifacts = sqliteTable(
  "artifacts",
  {
    artifactHash: text("artifact_hash").primaryKey(),
    artifactType: text("artifact_type").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    projectIdx: index("idx_artifacts_project").on(table.projectId),
  }),
);

export const packs = sqliteTable("packs", {
  packHash: text("pack_hash").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  clipCount: integer("clip_count").notNull(),
  artifactCount: integer("artifact_count").notNull(),
  edgeCount: integer("edge_count").notNull(),
  byteSize: integer("byte_size").notNull(),
  createdAt: text("created_at").notNull(),
});

export const clipArtifactRefs = sqliteTable(
  "clip_artifact_refs",
  {
    clipHash: text("clip_hash").notNull(),
    artifactHash: text("artifact_hash").notNull(),
    relationship: text("relationship").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.clipHash, table.artifactHash] }),
  }),
);
