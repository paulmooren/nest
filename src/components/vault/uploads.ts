import { shrinkImageFile } from "@/lib/image";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES } from "@/lib/vault";

/** Files dropped on the Vault list, waiting for the new-entry screen to pick them up. */
let dropped: File[] = [];
export const stashDroppedFiles = (files: File[]) => {
  dropped = files;
};
export const takeDroppedFiles = () => {
  const files = dropped;
  dropped = [];
  return files;
};

/** Why a file can't be added, or null when it can. Photos are shrunk first, so only the shrunk size counts. */
export function fileProblem(file: File): string | null {
  if (!(ATTACHMENT_TYPES as readonly string[]).includes(file.type)) return `${file.name}: only PDF, JPEG, PNG or WebP.`;
  if (file.size > ATTACHMENT_MAX_BYTES) return `${file.name} is over 4 MB.`;
  return null;
}

/** Shrinks phone photos, then drops anything the Vault would refuse. */
export async function prepareFiles(files: File[]): Promise<{ ok: File[]; problems: string[] }> {
  const ok: File[] = [];
  const problems: string[] = [];
  for (const raw of files) {
    const file = await shrinkImageFile(raw, ATTACHMENT_MAX_BYTES);
    const problem = fileProblem(file);
    if (problem) problems.push(problem);
    else ok.push(file);
  }
  return { ok, problems };
}

/** Uploads one file to an Entry. Returns an error message, or null on success. */
export async function uploadAttachment(entryId: string, file: File): Promise<string | null> {
  const body = new FormData();
  body.set("entryId", entryId);
  body.set("file", file);
  try {
    const res = await fetch("/api/vault/attachments", { method: "POST", body });
    if (res.ok) return null;
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return data?.error ?? `Couldn't upload ${file.name}.`;
  } catch {
    return `Couldn't upload ${file.name}.`;
  }
}
