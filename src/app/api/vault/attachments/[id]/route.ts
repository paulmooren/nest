import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getHouseholdIdForUser } from "@/server/api/household";
import { readable } from "@/server/vault-access";
import { decryptBytes } from "@/server/vault-crypto";
import { getFile } from "@/server/vault-storage";

export const dynamic = "force-dynamic";

/** Decrypts and streams one Attachment to a Member who can read its Entry. Never cached. `?download=1` saves it. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const householdId = await getHouseholdIdForUser(prisma, session.user.id);
  if (!householdId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const attachment = await prisma.vaultAttachment.findFirst({
    where: { id, entry: readable({ householdId, userId: session.user.id }) },
  });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bytes = decryptBytes(await getFile(attachment.storageKey), householdId);
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": attachment.contentType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
