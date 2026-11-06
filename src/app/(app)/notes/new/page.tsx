"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { trpc } from "@/trpc/react";
import { ModuleGate } from "@/components/use-modules";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { NoteEditor } from "@/components/notes/note-editor";
import { NotesBackLink } from "@/components/notes/notes-ui";
import { useRefreshNotes } from "@/components/notes/use-notes";
import { showToast } from "@/components/toast";
import { newId } from "@/lib/client-id";

export default function NewNotePage() {
  return (
    <ModuleGate module="notes">
      <Suspense>
        <NewNote />
      </Suspense>
    </ModuleGate>
  );
}

function NewNote() {
  const router = useRouter();
  const wanted = useSearchParams().get("notebook");
  const { data: notebooks } = trpc.notes.listNotebooks.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const create = trpc.notes.create.useMutation();
  const refresh = useRefreshNotes();
  const [saving, setSaving] = useState(false);

  if (!notebooks || !me) return null;
  const editable = notebooks.filter((n) => n.ownerId === null || n.ownerId === me.id);
  const start = editable.find((n) => n.id === wanted) ?? editable.find((n) => n.isStarter) ?? editable[0];
  if (!start) return null;

  return (
    <>
      <NotesBackLink />
      <PageHeader title="New note" />
      <PageBody>
        <NoteEditor
          initial={{ title: "", body: "", notebookId: start.id }}
          notebooks={editable}
          pending={saving}
          submitLabel="Save note"
          onCancel={() => router.push("/notes")}
          onSubmit={async (values) => {
            setSaving(true);
            const id = newId();
            try {
              await create.mutateAsync({ id, ...values });
            } catch {
              setSaving(false);
              showToast("Couldn't save this note");
              return;
            }
            await refresh();
            router.replace(`/notes/${id}`);
          }}
        />
      </PageBody>
    </>
  );
}
