"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TRPCClientError } from "@trpc/client";

import { trpc } from "@/trpc/react";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { useDelayed } from "@/components/use-delayed";
import { ModuleGate } from "@/components/use-modules";
import { NoteEditor } from "@/components/notes/note-editor";
import { CopyTextButton, NoteBody, NotesBackLink, NotesBones, stamp } from "@/components/notes/notes-ui";
import { useRefreshNotes } from "@/components/notes/use-notes";
import { showToast } from "@/components/toast";
import { noteAsText, noteTitle, toggleCheckbox } from "@/lib/notes";

export default function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ModuleGate module="notes">
      <NoteDetail id={id} />
    </ModuleGate>
  );
}

const isConflict = (e: unknown) => e instanceof TRPCClientError && e.data?.code === "CONFLICT";

function NoteDetail({ id }: { id: string }) {
  const router = useRouter();
  const refresh = useRefreshNotes();
  const { data: note, error } = trpc.notes.get.useQuery({ id }, { retry: false });
  const { data: notebooks } = trpc.notes.listNotebooks.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const showSkeleton = useDelayed(!note && !error);

  const title = note?.title;
  useEffect(() => {
    if (note) document.title = `${noteTitle(title ?? "")} · Notes · Nest`;
  }, [note, title]);

  const [editing, setEditing] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // The body with ticks not yet saved, shown at once.
  const [shown, setShown] = useState<string | null>(null);
  // Checkbox ticks are saved one after another, each against the edit time the last one returned.
  const version = useRef<Date | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  // The body as ticked so far, so a second tick before the first is saved builds on it instead of undoing it.
  const draft = useRef<string | null>(null);
  const inFlight = useRef(0);

  const update = trpc.notes.update.useMutation();
  const setPinned = trpc.notes.setPinned.useMutation({ onSuccess: refresh });
  const remove = trpc.notes.delete.useMutation({ onSuccess: refresh });

  if (error) {
    return (
      <>
        <NotesBackLink />
        <EmptyState title="This note doesn't exist, or you can't see it." />
      </>
    );
  }
  if (!note || !notebooks || !me) return showSkeleton ? <NotesBones rows={4} /> : null;

  const isShared = note.ownerId === null;
  const isMine = note.ownerId === me.id;
  const canEdit = isShared || isMine;
  const members = household?.members ?? [];
  const owner = members.find((m) => m.user.id === note.ownerId);
  const editable = notebooks.filter((n) => n.ownerId === null || n.ownerId === me.id);
  const edited = new Date(note.updatedAt).getTime() !== new Date(note.createdAt).getTime();

  function tick(line: number) {
    if (!note || !canEdit) return;
    const body = toggleCheckbox(draft.current ?? note.body, line);
    draft.current = body;
    setShown(body);
    inFlight.current += 1;
    const current = note;
    queue.current = queue.current.then(async () => {
      try {
        const saved = await update.mutateAsync({
          id,
          title: current.title,
          body,
          notebookId: current.notebookId,
          expectedUpdatedAt: version.current ?? current.updatedAt,
        });
        version.current = saved.updatedAt;
      } catch (e) {
        showToast(isConflict(e) ? "Someone else changed this note — reloading" : "Couldn't save the checkbox");
      }
      inFlight.current -= 1;
      if (inFlight.current === 0) {
        version.current = null;
        await refresh();
        draft.current = null;
        setShown(null);
      }
    });
  }

  if (editing) {
    return (
      <>
        <NotesBackLink />
        <PageHeader title={`Edit ${noteTitle(note.title)}`} />
        <PageBody>
          <NoteEditor
            initial={{ title: note.title, body: note.body, notebookId: note.notebookId }}
            notebooks={editable}
            pending={update.isPending}
            error={conflict}
            onCancel={() => {
              setEditing(false);
              setConflict(null);
            }}
            onReload={async () => {
              await refresh();
              setEditing(false);
              setConflict(null);
            }}
            onSubmit={async (values) => {
              setConflict(null);
              try {
                await update.mutateAsync({ id, ...values, expectedUpdatedAt: note.updatedAt });
              } catch (e) {
                if (isConflict(e)) setConflict("Someone else changed this note since you opened it. Copy your text if you need it, then reload.");
                else showToast("Couldn't save this note");
                return;
              }
              await refresh();
              setEditing(false);
            }}
          />
        </PageBody>
      </>
    );
  }

  const whose = isShared
    ? "Shared"
    : isMine
      ? "Personal"
      : members.length > 1 && owner
        ? `${owner.user.name || owner.user.email}'s`
        : "Personal";

  return (
    <>
      <NotesBackLink />
      <PageHeader
        title={noteTitle(note.title)}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{note.notebookName}</span>
            <span className="inline-flex items-center gap-1.5">
              {!isShared && owner && members.length > 1 && (
                <Avatar name={owner.user.name || owner.user.email} image={owner.user.image} size={18} />
              )}
              {whose}
            </span>
            {note.pinned && <Badge variant="secondary">Pinned</Badge>}
            {!canEdit && <span>Visible to you</span>}
          </span>
        }
      />
      <PageBody>
        <p className="text-sm text-muted-foreground">
          {edited ? `Last edited ${stamp(note.updatedAt)} · Written ${stamp(note.createdAt)}` : `Written ${stamp(note.createdAt)}`}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && <Button onClick={() => setEditing(true)}>Edit</Button>}
          <CopyTextButton label="Copy as text" getText={() => noteAsText(note)} />
          {canEdit && (
            <>
              <Button variant="outline" onClick={() => setPinned.mutate({ id, pinned: !note.pinned })}>
                {note.pinned ? "Unpin" : "Pin"}
              </Button>
              <Button variant="outline" className="text-destructive" onClick={() => setConfirmingDelete(true)}>
                Delete
              </Button>
            </>
          )}
        </div>

        <NoteBody body={shown ?? note.body} onToggle={canEdit ? tick : undefined} />
      </PageBody>

      <ConfirmDelete
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Delete "${noteTitle(note.title)}"?`}
        description="This can't be undone."
        onConfirm={async () => {
          await remove.mutateAsync({ id });
          router.push("/notes");
        }}
      />
    </>
  );
}
