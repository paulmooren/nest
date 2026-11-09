import { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getHouseholdIdForUser } from "@/server/api/household";
import { editableCookbooks } from "@/server/recipes-access";
import { deleteFile, putFile } from "@/server/vault-storage";
import { RECIPE_PHOTO_MAX_BYTES, RECIPE_PHOTO_TYPES } from "@/lib/recipes";

export const dynamic = "force-dynamic";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/**
 * Sets the photo of a Recipe you can edit: multipart `recipeId` + `file`. It replaces any photo already there. The
 * file is kept in the same storage as Vault Attachments, under `recipes/`, but not encrypted: a photo of dinner is
 * not a secret, and it is only ever served to Members who can see the Recipe.
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
  const recipeId = form.get("recipeId");
  const file = form.get("file");
  if (typeof recipeId !== "string" || !(file instanceof File)) return fail("Missing file.", 400);
  if (!(RECIPE_PHOTO_TYPES as readonly string[]).includes(file.type)) return fail("Only JPEG, PNG or WebP photos.", 400);
  if (file.size > RECIPE_PHOTO_MAX_BYTES) return fail("Photos can be at most 4 MB.", 400);

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, cookbook: editableCookbooks({ householdId, userId: session.user.id }) },
    select: { id: true, photoKey: true },
  });
  if (!recipe) return fail("Not found", 404);

  const photoKey = `recipes/${householdId}/${recipe.id}/${crypto.randomUUID()}`;
  try {
    await putFile(photoKey, Buffer.from(await file.arrayBuffer()));
    // Not through Prisma's update: the photo is not an edit of the text, so the edit time (and with it the
    // edit-conflict check of an open editor) is left alone.
    await prisma.$executeRaw`UPDATE "recipes" SET "photoKey" = ${photoKey} WHERE "id" = ${recipe.id}`;
    if (recipe.photoKey) await deleteFile(recipe.photoKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Recipe photo upload failed", error);
    const message = error instanceof TRPCError ? error.message : "The server couldn't store this photo. Try again.";
    return fail(message, 500);
  }
}
