import fs from "node:fs";
import path from "node:path";

export interface BlobStore {
  put(
    kind: "packs" | "clips" | "artifacts",
    hash: string,
    data: Buffer,
  ): Promise<void>;
  get(
    kind: "packs" | "clips" | "artifacts",
    hash: string,
  ): Promise<Buffer | null>;
  exists(
    kind: "packs" | "clips" | "artifacts",
    hash: string,
  ): Promise<boolean>;
  stat(
    kind: "packs" | "clips" | "artifacts",
    hash: string,
  ): Promise<{ size: number } | null>;
}

const EXT_MAP = {
  packs: ".cliprootpack",
  clips: ".json",
  artifacts: "",
} as const;

function blobPath(dataDir: string, kind: keyof typeof EXT_MAP, hash: string) {
  return path.join(dataDir, kind, `${hash}${EXT_MAP[kind]}`);
}

export function createFsBlobStore(dataDir: string): BlobStore {
  for (const kind of ["packs", "clips", "artifacts"] as const) {
    fs.mkdirSync(path.join(dataDir, kind), { recursive: true });
  }

  return {
    async put(kind, hash, data) {
      const filePath = blobPath(dataDir, kind, hash);
      await fs.promises.writeFile(filePath, data);
    },

    async get(kind, hash) {
      const filePath = blobPath(dataDir, kind, hash);
      try {
        return await fs.promises.readFile(filePath);
      } catch {
        return null;
      }
    },

    async exists(kind, hash) {
      const filePath = blobPath(dataDir, kind, hash);
      try {
        await fs.promises.access(filePath);
        return true;
      } catch {
        return false;
      }
    },

    async stat(kind, hash) {
      const filePath = blobPath(dataDir, kind, hash);
      try {
        const stats = await fs.promises.stat(filePath);
        return { size: stats.size };
      } catch {
        return null;
      }
    },
  };
}
