export interface PublishPackResult {
  packHash: string;
  owner: string;
  project: string;
  clips: number;
  artifacts: number;
  edges: number;
  url: string;
}

export interface PublishClipsResult {
  owner: string;
  project: string;
  accepted: number;
  clipHashes: string[];
}

export interface ProjectSummary {
  owner: string;
  name: string;
  clipCount: number;
  lastPublishedAt: string;
}

export interface ProjectDetail {
  owner: string;
  name: string;
  description: string | null;
  clipCount: number;
  edgeCount: number;
  artifactCount: number;
  lastPublishedAt: string;
  latestPackHash: string | null;
  createdAt: string;
}

export interface ClipDetail {
  clipHash: string;
  textHash: string;
  content: string | null;
  sourceRefs: string[];
  project: { owner: string; name: string };
  edges: Array<{
    type: string;
    subjectRef: string;
    objectRef: string;
  }>;
  bundleHash: string;
}

export interface LineageResponse {
  root: string;
  clips: Array<{
    clipHash: string;
    textHash: string;
    content: string | null;
    sourceRefs: string[];
    derivedFrom: string[];
  }>;
}

export interface SearchResult {
  clipHash: string;
  content: string;
  project: { owner: string; name: string };
  score: number;
}

export interface PaginatedResponse<T> {
  cursor: string | null;
  [key: string]: T[] | string | null | number;
}
