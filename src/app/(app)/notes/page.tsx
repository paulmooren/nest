"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import { PinIcon, PlusIcon, SettingsIcon } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/server/api/root";
import { trpc } from "@/trpc/react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { AddChip, ChoiceChips } from "@/components/ui/choice-chips";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { EmptyState } from "@/components/ui/empty-state";
import { ListTools } from "@/components/ui/list-tools";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { Row, RowList } from "@/components/ui/row";
import { useDelayed } from "@/components/use-delayed";
import { ModuleGate } from "@/components/use-modules";
import { NewNotebookSheet, NotebookSettingsSheet } from "@/components/notes/notebook-sheets";
import { NotesBones, stamp } from "@/components/notes/notes-ui";
import { useRefreshNotes } from "@/components/notes/use-notes";
import { newId } from "@/lib/client-id";
import { noteTitle } from "@/lib/notes";

export default function NotesPage() {
  return (
    <ModuleGate module="notes">
      <Notes />
    </ModuleGate>
  );
}

type Note = inferRouterOutputs<AppRouter>["notes"]["list"][number];

type NoteSort = "edited" | "created" | "title";
const SORTS: { value: NoteSort; label: string }[] = [
  { value: "edited", label: "Last edited" },
  { value: "created", label: "Newest" },
  { value: "title", label: "Title" },
];
const BY: Record<NoteSort, (a: Note, b: Note) => number> = {
  edited: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  created: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  title: (a, b) => noteTitle(a.title).localeCompare(noteTitle(b.title), undefined, { sensitivity: "base" }),
};

function Notes() {
  const refresh = useRefreshNotes();
  // What is typed in the search field (null while it is closed), and the same a moment later, which is what is asked.
  const [query, setQuery] = useState<string | null>(null);
  const [sort, setSort] = useState<NoteSort>("edited");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch((query ?? "").trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data: notes } = trpc.notes.list.useQuery(search ? { query: search } : undefined, { placeholderData: keepPreviousData });
  const { data: notebooks } = trpc.notes.listNotebooks.useQuery();
  const { data: me } = trpc.user.me.useQuery();
  const { data: household } = trpc.household.current.useQuery();
  const showSkeleton = useDelayed(!notes || !notebooks || !me);

  const [notebookId, setNotebookId] = useState("all");
  const [creating, setCreating] = useState(false);
  const [settings, setSettings] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const createNotebook = trpc.notes.createNotebook.useMutation({ onSuccess: refresh });
  const renameNotebook = trpc.notes.renameNotebook.useMutation({ onSuccess: refresh });
  const setVisibility = trpc.notes.setNotebookVisibility.useMutation({ onSuccess: refresh });
  const deleteNotebook = trpc.notes.deleteNotebook.useMutation({ onSuccess: refresh });

  const members = household?.members ?? [];
  const multiMember = members.length > 1;
  const notebookName = useMemo(() => new Map((notebooks ?? []).map((n) => [n.id, n.name])), [notebooks]);

  const starter = notebooks?.find((n) => n.isStarter && n.ownerId === me?.id);
  const selected = notebooks?.find((n) => n.id === notebookId);
  // New notes go in the Notebook being looked at when it is yours or shared, otherwise your starter one.
  const target = selected && (selected.ownerId === null || selected.ownerId === me?.id) ? selected : starter;

  const newNote = (
    <Button render={<Link href={target ? `/notes/new?notebook=${target.id}` : "/notes/new"} />} nativeButton={false}>
      <PlusIcon /> New note
    </Button>
  );

  if (!notes || !notebooks || !me) {
    return (
      <>
        <PageHeader title="Notes" actions={newNote} inHeader />
        {showSkeleton && <NotesBones />}
      </>
    );
  }

  const visible = (notebookId === "all" ? notes : notes.filter((n) => n.notebookId === notebookId)).slice().sort(BY[sort]);
  const searching = search !== "";
  const pinned = searching ? [] : visible.filter((n) => n.pinned);
  const rest = searching ? visible : visible.filter((n) => !n.pinned);
  const counts = new Map<string, number>();
  for (const n of notes) counts.set(n.notebookId, (counts.get(n.notebookId) ?? 0) + 1);

  const mine = !!selected && (selected.ownerId === null || selected.ownerId === me.id);

  const row = (note: Note) => {
    const nb = notebooks.find((n) => n.id === note.notebookId);
    const owner = multiMember && nb?.ownerId ? members.find((m) => m.user.id === nb.ownerId) : undefined;
    const meta = [notebookId === "all" || searching ? notebookName.get(note.notebookId) : undefined, note.excerpt || undefined]
      .filter(Boolean)
      .join(" · ");
    return (
      <Row
        key={note.id}
        href={`/notes/${note.id}`}
        leading={owner ? <Avatar name={owner.user.name || owner.user.email} image={owner.user.image} size={24} /> : undefined}
        title={
          <span className="inline-flex items-center gap-1.5">
            {noteTitle(note.title)}
            {note.pinned && <PinIcon className="size-3.5 text-muted-foreground" aria-label="Pinned" />}
          </span>
        }
        meta={meta || undefined}
        trailing={<span className="text-sm text-muted-foreground md:text-xs">{stamp(note.updatedAt)}</span>}
      />
    );
  };

  const list = (title: string, rows: Note[]) => (
    <section key={title} aria-label={title} className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-[0.09em] text-muted-foreground uppercase">{title}</h2>
      <RowList>{rows.map(row)}</RowList>
    </section>
  );

  return (
    <>
      <PageHeader title="Notes" actions={newNote} inHeader />
      <PageBody>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ChoiceChips
              label="Filter by notebook"
              value={notebookId}
              onChange={setNotebookId}
              options={[
                { value: "all", label: "All" },
                ...notebooks.map((n) => ({ value: n.id, label: `${n.name} ${searching ? (counts.get(n.id) ?? 0) : n.noteCount}` })),
              ]}
              trailing={<AddChip onClick={() => setCreating(true)}>New notebook</AddChip>}
            />
          </div>
        </div>

        {selected && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{selected.name}</h2>
              <p className="text-sm text-muted-foreground">
                {selected.ownerId === null
                  ? "Shared — everyone in your household"
                  : selected.ownerId === me.id
                    ? selected.visibleToHousehold
                      ? "Personal — visible to your household"
                      : "Personal — only you"
                    : "Personal — visible to you"}
              </p>
            </div>
            <Button variant="ghost" size="icon" aria-label={`Settings for ${selected.name}`} onClick={() => setSettings(true)}>
              <SettingsIcon />
            </Button>
          </div>
        )}

        {(notes.length > 0 || searching) && (
          <ListTools
            count={visible.length}
            noun={["note", "notes"]}
            sort={{ value: sort, initial: "edited", options: SORTS, onChange: setSort }}
            query={query}
            onQuery={setQuery}
            searchPlaceholder="Search titles and notes"
          />
        )}

        {notes.length === 0 && !searching && (
          <EmptyState
            title="Nothing written down yet. Jot down an achievement, an idea, anything you don't want to forget — and add to it whenever you think of something."
            action={newNote}
          />
        )}
        {notes.length === 0 && searching && (
          <EmptyState title="Nothing matches. Search looks in titles and in the text of every notebook you can see." />
        )}
        {notes.length > 0 && visible.length === 0 && <EmptyState title="No notes in this notebook yet." action={newNote} />}

        {pinned.length > 0 && list("Pinned", pinned)}
        {rest.length > 0 && list(searching ? "Found" : (SORTS.find((o) => o.value === sort)?.label ?? ""), rest)}
      </PageBody>

      {creating && (
        <NewNotebookSheet
          onClose={() => setCreating(false)}
          onCreate={async (name, shared) => {
            const id = newId();
            await createNotebook.mutateAsync({ id, name, shared });
            setNotebookId(id);
          }}
        />
      )}
      {settings && selected && (
        <NotebookSettingsSheet
          notebook={selected}
          mine={mine}
          multiMember={multiMember}
          onClose={() => setSettings(false)}
          onRename={(name) => renameNotebook.mutate({ id: selected.id, name })}
          onVisibility={(visible) => setVisibility.mutate({ id: selected.id, visible })}
          onDelete={() => {
            setSettings(false);
            setDeleting(true);
          }}
        />
      )}
      <ConfirmDelete
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete the notebook "${selected?.name ?? ""}"?`}
        description={
          selected
            ? `${selected.noteCount === 0 ? "It has no notes." : `Its ${selected.noteCount} ${selected.noteCount === 1 ? "note is" : "notes are"} deleted with it.`} This can't be undone.`
            : undefined
        }
        onConfirm={async () => {
          if (!selected) return;
          await deleteNotebook.mutateAsync({ id: selected.id });
          setNotebookId("all");
        }}
      />
    </>
  );
}
