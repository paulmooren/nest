import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { TRPCError } from "@trpc/server";

/**
 * Where encrypted Attachment bytes live (ADR 0008): a private bucket in Neon Object Storage, reached through its
 * S3 API. Without VAULT_S3_* set, local development falls back to a folder on disk (.vault-files, git-ignored);
 * production refuses to start uploading rather than silently writing to a server disk.
 */
const LOCAL_DIR = path.join(process.cwd(), ".vault-files");

let client: S3Client | null = null;

function s3(): { client: S3Client; bucket: string } | null {
  const { VAULT_S3_ENDPOINT, VAULT_S3_BUCKET, VAULT_S3_ACCESS_KEY_ID, VAULT_S3_SECRET_ACCESS_KEY, VAULT_S3_REGION } =
    process.env;
  if (!VAULT_S3_ENDPOINT || !VAULT_S3_BUCKET || !VAULT_S3_ACCESS_KEY_ID || !VAULT_S3_SECRET_ACCESS_KEY) return null;
  client ??= new S3Client({
    endpoint: VAULT_S3_ENDPOINT,
    region: VAULT_S3_REGION || "eu-central-1",
    forcePathStyle: true,
    credentials: { accessKeyId: VAULT_S3_ACCESS_KEY_ID, secretAccessKey: VAULT_S3_SECRET_ACCESS_KEY },
  });
  return { client, bucket: VAULT_S3_BUCKET };
}

function requireStore() {
  const remote = s3();
  if (remote) return remote;
  if (process.env.NODE_ENV === "production") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "File storage isn't set up on this server yet (VAULT_S3_* is missing).",
    });
  }
  return null;
}

const localPath = (key: string) => path.join(LOCAL_DIR, ...key.split("/"));

export async function putFile(key: string, bytes: Buffer): Promise<void> {
  const remote = requireStore();
  if (remote) {
    await remote.client.send(new PutObjectCommand({ Bucket: remote.bucket, Key: key, Body: bytes }));
    return;
  }
  await mkdir(path.dirname(localPath(key)), { recursive: true });
  await writeFile(localPath(key), bytes);
}

export async function getFile(key: string): Promise<Buffer> {
  const remote = requireStore();
  if (remote) {
    const res = await remote.client.send(new GetObjectCommand({ Bucket: remote.bucket, Key: key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }
  return readFile(localPath(key));
}

/** Best effort: a file that is already gone is not an error. */
export async function deleteFile(key: string): Promise<void> {
  try {
    const remote = requireStore();
    if (remote) await remote.client.send(new DeleteObjectCommand({ Bucket: remote.bucket, Key: key }));
    else await rm(localPath(key), { force: true });
  } catch {
    // The row is what matters; an orphaned encrypted file is harmless.
  }
}
