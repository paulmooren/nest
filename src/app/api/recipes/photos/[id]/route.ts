import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getHouseholdIdForUser } from "@/server/api/household";
import { readableCookbooks } from "@/server/recipes-access";
import { getFile } from "@/server/vault-storage";

export const dynamic = "force-dynamic";

/** What the bytes are, read from the bytes themselves: only the three kinds the upload accepts are ever served. */
function imageType(bytes: Buffer): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

/**
 * The photo of one Recipe, for a Member who can see that Recipe. The page asks for it with `?v=<photo key>`, so a
 * new photo has a new address and this one can be kept by the browser (never by anything shared) for a day.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const householdId = await getHouseholdIdForUser(prisma, session.user.id);
  if (!householdId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const recipe = await prisma.recipe.findFirst({
    where: { id, cookbook: readableCookbooks({ householdId, userId: session.user.id }) },
    select: { photoKey: true },
  });
  if (!recipe?.photoKey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bytes = await getFile(recipe.photoKey);
  const type = imageType(bytes);
  if (!type) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
