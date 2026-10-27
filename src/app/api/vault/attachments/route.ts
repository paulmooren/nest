import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getHouseholdIdForUser } from "@/server/api/household";
import { editable } from "@/server/vault-access";
import { encryptBytes } from "@/server/vault-crypto";
import { putFile } from "@/server/vault-storage";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, ATTACHMENTS_PER_ENTRY } from "@/lib/vault";

export const dynamic = "force-dynamic";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/**
 * Adds one file to an Entry you can edit: multipart `entryId` + `file`. The bytes are encrypted here, before they
 * reach storage (ADR 0008), which is why they pass through the server and the size is capped.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) return fail("Unauthorized", 401);
  const householdId = await getHouseholdIdForUser(prisma, session.user.id);
  if (!householdId) return fail("Forbidden", 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Couldn't read the upload.", 400);
  }
  const entryId = form.get("entryId");
  const file = form.get("file");
  if (typeof entryId !== "string" || !(file instanceof File)) return fail("Missing file.", 400);

  const entry = await prisma.vaultEntry.findFirst({
    where: { id: entryId, ...editable({ householdId, userId: session.user.id }) },
    select: { id: true, _count: { select: { attachments: true } } },
  });
  if (!entry) return fail("Not found", 404);
  if (entry._count.attachments >= ATTACHMENTS_PER_ENTRY) {
    return fail(`An entry can hold ${ATTACHMENTS_PER_ENTRY} files.`, 400);
  }
  if (!(ATTACHMENT_TYPES as readonly string[]).includes(file.type)) return fail("Only PDF, JPEG, PNG or WebP files.", 400);
  if (file.size > ATTACHMENT_MAX_BYTES) return fail("Files can be at most 4 MB.", 400);

  const bytes = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomUUID();
  const storageKey = `${householdId}/${entry.id}/${id}`;
  await putFile(storageKey, encryptBytes(bytes, householdId));
  const attachment = await prisma.vaultAttachment.create({
    data: {
      id,
      entryId: entry.id,
      name: file.name.slice(0, 120) || "file",
      contentType: file.type,
      size: file.size,
      storageKey,
    },
    select: { id: true, name: true, contentType: true, size: true },
  });
  return NextResponse.json(attachment);
}
